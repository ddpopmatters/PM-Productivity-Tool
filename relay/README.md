# Ollama Relay

Deno HTTP server that acts as an authenticated proxy between Supabase Edge Functions and the local Ollama instance on the MacBook.

## Why

Supabase Edge Functions run in Supabase's cloud — they cannot reach a local LAN IP. The relay exposes Ollama over HTTPS via a Cloudflare Tunnel.

```
Supabase Edge Function → HTTPS → Cloudflare Tunnel → MacBook :8787 → Ollama :11434
```

## Setup

### 1. Generate a secret

```bash
openssl rand -hex 32
# e.g. a3f1e8c2...
```

### 2. Start the tunnel

```bash
cloudflared tunnel --url http://localhost:8787
# Note the *.trycloudflare.com URL
```

### 3. Set Supabase secrets

```bash
supabase secrets set OLLAMA_RELAY_URL=https://<your-tunnel>.trycloudflare.com
supabase secrets set OLLAMA_RELAY_SECRET=<your-secret>
supabase secrets set OLLAMA_MODEL=hermes-qwen3-4b-fast
```

### 4. Configure the launchd plist

Edit `~/Library/LaunchAgents/com.pixeloffice.ollama-relay.plist`:
- Replace `REPLACE_WITH_RELAY_SECRET` with your secret

### 5. Load the launchd service

```bash
launchctl load ~/Library/LaunchAgents/com.pixeloffice.ollama-relay.plist
```

### Verify

```bash
curl -X POST \
  -H "Authorization: Bearer <your-secret>" \
  -H "Content-Type: application/json" \
  -d '{"model":"hermes-qwen3-4b-fast","messages":[{"role":"user","content":"hi"}],"stream":false}' \
  http://localhost:8787/chat
```

## Logs

```bash
tail -f /tmp/ollama-relay.log
```

## Restart

```bash
launchctl unload ~/Library/LaunchAgents/com.pixeloffice.ollama-relay.plist
launchctl load ~/Library/LaunchAgents/com.pixeloffice.ollama-relay.plist
```

## Security

- Bearer token required on every request
- Only `/chat` POST is forwarded — no other Ollama API surface is exposed
- Unauthenticated requests → 401
