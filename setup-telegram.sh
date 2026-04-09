#!/usr/bin/env bash
# setup-telegram.sh — Full setup for Telegram workstream bot
# Run with: ! ./setup-telegram.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SUPABASE_URL="https://jzalaltexmotkusvqoew.supabase.co"
OWNER_EMAIL="daniel.davis@populationmatters.org"
MIGRATION_TEMPLATE="$SCRIPT_DIR/supabase/migrations/035_telegram_digest_cron.sql"
MIGRATION_PATCHED="/tmp/035_telegram_digest_cron_patched.sql"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Telegram Workstream Bot — Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$SCRIPT_DIR"

# ── 1. Load .env ──────────────────────────────────────────────────────────────
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

# ── 2. Get Supabase service role key ─────────────────────────────────────────
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "🔑 Enter your Supabase service role key"
  echo "   (Project dashboard → Settings → API → service_role)"
  echo -n "> "
  read -s SUPABASE_SERVICE_ROLE_KEY
  echo ""
fi

# ── 3. Generate CRON_SECRET ───────────────────────────────────────────────────
if [ -z "$CRON_SECRET" ]; then
  CRON_SECRET=$(openssl rand -hex 32)
fi
echo "🔐 CRON_SECRET is set (not printed)."
echo "   Store it in Supabase secrets; do not commit it to migration files."
echo ""

# ── 4. Prepare cron SQL without modifying repository files ───────────────────
if grep -Eq "'x-cron-secret',[[:space:]]*'[0-9a-f]{32,}'" "$MIGRATION_TEMPLATE"; then
  echo "❌ $MIGRATION_TEMPLATE already contains a materialized CRON_SECRET."
  echo "   Rotate the secret and restore the __CRON_SECRET__ placeholder via the approved migration workflow."
  exit 1
fi

if ! grep -q "__CRON_SECRET__" "$MIGRATION_TEMPLATE"; then
  echo "❌ $MIGRATION_TEMPLATE must contain the __CRON_SECRET__ placeholder."
  echo "   Restore the placeholder via the approved migration workflow before running this script."
  exit 1
fi

sed "s/__CRON_SECRET__/$CRON_SECRET/g" "$MIGRATION_TEMPLATE" > "$MIGRATION_PATCHED"
echo "✅ Temporary cron SQL prepared at $MIGRATION_PATCHED"
echo "   The repository migration file was not modified."

# ── 5. Apply migrations ───────────────────────────────────────────────────────
echo ""
echo "▶ Applying database migrations..."
if [ "${SKIP_DB_PUSH:-}" != "true" ]; then
  echo "❌ Automatic migration push is disabled because the cron SQL contains a runtime secret."
  echo "   Apply the temporary SQL through the approved migration workflow, then rerun with SKIP_DB_PUSH=true if you only need secrets/functions."
  exit 1
fi
echo "⚠️  Skipping database migrations because SKIP_DB_PUSH=true"

# ── 6. Set edge function secrets ──────────────────────────────────────────────
echo ""
echo "▶ Setting edge function secrets..."
npx supabase secrets set CRON_SECRET="$CRON_SECRET" --linked
echo "✅ CRON_SECRET set"

# ── 7. Deploy edge functions ──────────────────────────────────────────────────
echo ""
echo "▶ Deploying edge functions..."
npx supabase functions deploy telegram-bot --linked
npx supabase functions deploy telegram-digest --linked
echo "✅ Edge functions deployed"

# ── 8. Look up Telegram chat_id from brain_dumps ─────────────────────────────
echo ""
echo "▶ Looking up your Telegram chat_id from brain_dumps..."
CHAT_ID=$(curl -s \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/rest/v1/brain_dumps?telegram_chat_id=not.is.null&select=telegram_chat_id&order=created_at.desc&limit=1" \
  | python3 -c "
import sys, json
rows = json.load(sys.stdin)
print(rows[0]['telegram_chat_id'] if rows else '')
" 2>/dev/null || echo "")

if [ -z "$CHAT_ID" ]; then
  echo "⚠️  No prior bot usage found. Enter your Telegram chat_id manually."
  echo "   (Send any message to your bot, then open:"
  echo "   https://api.telegram.org/bot<TOKEN>/getUpdates"
  echo "   and look for message.chat.id)"
  echo -n "> "
  read CHAT_ID
else
  echo "   Found chat_id: $CHAT_ID"
fi

# ── 9. Seed telegram_sessions row ────────────────────────────────────────────
echo ""
echo "▶ Seeding telegram_sessions..."
SEED_RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=minimal" \
  "$SUPABASE_URL/rest/v1/telegram_sessions" \
  -d "{\"chat_id\": $CHAT_ID, \"user_email\": \"$OWNER_EMAIL\"}")

if [ "$SEED_RESULT" = "200" ] || [ "$SEED_RESULT" = "201" ] || [ "$SEED_RESULT" = "204" ]; then
  echo "✅ Session row seeded (chat_id=$CHAT_ID → $OWNER_EMAIL)"
else
  echo "⚠️  Seed returned HTTP $SEED_RESULT — check Supabase dashboard"
  echo "   Fallback SQL:"
  echo "   INSERT INTO telegram_sessions (chat_id, user_email)"
  echo "   VALUES ($CHAT_ID, '$OWNER_EMAIL')"
  echo "   ON CONFLICT (chat_id) DO UPDATE SET user_email = EXCLUDED.user_email;"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Test the bot: send /help in Telegram"
echo "Test the digest: curl -X POST \\"
echo "  -H 'x-cron-secret: <CRON_SECRET>' \\"
echo "  $SUPABASE_URL/functions/v1/telegram-digest"
echo ""
