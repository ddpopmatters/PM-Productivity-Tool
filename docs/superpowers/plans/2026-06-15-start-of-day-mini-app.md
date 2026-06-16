# Start Of Day Packet And Telegram Mini App

> Feature plan created with the Superpowers planning format.

## Goal

Make Momentum Hub the visible home for Hermes' start-of-day automation and prepare the same experience to run as the Hermes Telegram Mini App.

## User Outcomes

- Dan can open Momentum Hub and immediately see what matters this morning.
- The packet highlights work that was started and forgotten, files created since the last packet, and tasks Hermes can confidently work on without Dan.
- Telegram launches the same focused Momentum Hub view instead of a separate local-only route.
- Hermes has a stable Supabase contract for generating and updating packets.

## Implementation Plan

1. Add a first-class `start-of-day` route to Momentum Hub.
2. Add a sidebar entry near the dashboard so the packet is hard to miss.
3. Add a Supabase service for fetching the latest packet and updating acknowledgement state.
4. Add a Telegram Mini App utility that calls `ready()` and `expand()` only when Telegram injects `window.Telegram.WebApp`.
5. Add a focused Start Of Day view with ADHD-friendly sections:
   - one immediate task;
   - re-entry prompt;
   - started-and-forgotten work;
   - files created since the last packet;
   - agent-can-do items;
   - items waiting on Dan.
6. Update the Content Security Policy and load Telegram's official Mini App script.
7. Document the Supabase packet schema and Hermes generation contract.
8. Add focused service and utility tests.
9. Verify with tests and production build.

## Data Contract

Momentum Hub reads:

- `start_of_day_packets`
- `start_of_day_items`

Hermes should write packets with service-role access and Momentum Hub should read them through authenticated row-level security by `user_email`.

## Telegram Plan

The production Mini App URL is `https://ddpopmatters.github.io/PM-Productivity-Tool/?start=start-of-day` until the `populationmatters.org/workstream-tool` WordPress iframe wrapper can pass query parameters into the embedded app. Hermes can keep sending rich Telegram messages for normal replies, but Start Of Day cron messages should use a normal Telegram message with an inline web-app button so the Mini App opens directly.

## Verification

- `npm run test -- src/services/startOfDay.test.js src/utils/telegramMiniApp.test.js`
- `npm run build`
