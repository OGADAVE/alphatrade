# AlphaTrade Signals

**Smarter. Follow Alpha.**

Automated multi-source crypto & forex trading signal intelligence platform.

Implements **Phase 1 (Foundation)** and **Phase 2 (Signal Engine)** of the
build plan: real Firestore-backed pages (with mock-data fallback while
you're mid-setup), signal ingestion webhooks with normalization/validation/
duplicate-detection/risk-scoring, a public signals REST API, and real
server-side admin access control.

## Getting started

```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local` with two sets of values:

1. **Client Firebase config** (`NEXT_PUBLIC_*`) — Firebase Console → Project
   Settings → General → Your apps → Web app.
2. **Admin SDK credentials** (`FIREBASE_ADMIN_*`) — Firebase Console →
   Project Settings → Service accounts → Generate new private key. Paste
   `private_key` exactly as downloaded (keep the `\n` escapes and the
   surrounding quotes).

Then seed starter data and promote yourself to admin:

```bash
node scripts/seed.mjs                    # strategies + a TradingView source
npm run dev                              # sign up an account in the app
node scripts/set-admin-role.mjs you@example.com
```

Sign out and back in after running `set-admin-role.mjs` — the admin flag is
baked into your session cookie at sign-in time.

## Deploying — Netlify

This project deploys to Netlify via `@netlify/plugin-nextjs` (configured in
`netlify.toml`), which runs API routes as real Netlify Functions on Node —
`firebase-admin` works the same as it would anywhere else with a Node
runtime.

1. Push this repo to GitHub/GitLab and "Import an existing project" in
   Netlify (or `netlify deploy` via the CLI).
2. Add every var from `.env.local.example` in Netlify's dashboard under
   Site configuration → Environment variables. Make sure `CRON_SECRET`
   (and any other var the scheduled function needs) has **Functions**
   included in its scope, or the scheduled function won't be able to read
   it at runtime.
3. Deploy. Netlify's Next.js runtime auto-detects the App Router setup —
   no `publish` directory needs to be set manually.

## Phase 3 — Signal generation via the engine adapter (no Jesse required)

AlphaTrade's actual job is generate → ingest → track → score. It doesn't
need to know or care whether a signal came from a human analyst, a
webhook, or code we wrote — so signal generation is decoupled behind one
interface, `StrategyEngine` (`src/lib/engines/types.ts`):

```ts
interface StrategyEngine {
  id: string;               // matches a signal_sources doc
  name: string;
  strategyId: string;       // which strategy's AlphaScore this rolls into
  market: "crypto" | "forex";
  instruments: string[];
  timeframe: Timeframe;
  generateSignals(data: MarketData): Promise<CreateSignalInput[]>;
}
```

`src/app/api/cron/generate-signals` calls every engine in
`src/lib/engines/registry.ts` on a schedule
(`netlify/functions/generate-signals-cron.mts`, every 15 minutes), feeding
whatever it returns through the **exact same**
normalize → validate → duplicate-check pipeline the TradingView and
provider webhooks use (`src/lib/signal-pipeline.ts`). An engine's output
and an external provider's JSON payload are indistinguishable past that
point.

**Two engines are registered now**, both in `src/lib/engines/registry.ts`:

- `alpha-momentum-engine.ts` — crypto (BTC/USDT, ETH/USDT, SOL/USDT), 15m
  timeframe, feeds `strategy_alpha_momentum`. Needs no API key (Binance is
  free/public).
- `fx-momentum-engine.ts` — forex (EUR/USD, GBP/USD, USD/JPY), 30m
  timeframe, feeds `strategy_fx_momentum`. **Needs `TWELVE_DATA_API_KEY`** —
  without it, `getCandles()` returns an empty array and this engine
  silently generates nothing (same dependency Phase 4's forex tracking
  already has).

Both share the same EMA20/50-crossover-plus-RSI-filter logic and the same
honest caveat: illustrative, not backtested — proves the adapter pattern
end-to-end, not a proven edge. The cron currently runs every 5 minutes
regardless of engine — harmless for the 30m forex engine (it just
re-checks an unchanged candle a few extra times; duplicate detection blocks
any repeat), but if you add engines with very different timeframes,
consider giving each its own schedule instead of one shared one.

**On Jesse specifically:** its core (backtesting/research) is free, but
live/paper trading requires a paid licensed plugin plus a persistent
Postgres/Redis/Docker deployment — real infrastructure this app doesn't
otherwise need. Since AlphaTrade's differentiator is measurement, not
execution, Jesse stays **optional**: if a specific strategy or exchange
integration ever makes it worth the infra, wrap it as a `StrategyEngine`
(its output becomes a `CreateSignalInput`, same as everything else) and
register it — nothing else in the app changes. Same goes for LEAN, or any
other engine.

**Adding a new engine:** implement `StrategyEngine`, add it to
`registry.ts`, and make sure a matching `signal_sources` doc exists
(`scripts/seed.mjs` has the pattern) so it's visible alongside other
sources. That's the whole integration surface.

## Phase 4 — Signal tracking (TP/SL detection)

`/api/cron/track-signals` is the tracking engine: it fetches every open
signal, gets a fresh price for each unique symbol, and applies TP/SL logic
via `src/lib/tracking-engine.ts` (a pure function — no I/O — so the
decision logic is easy to read and test on its own). It also keeps a
running win/loss count per strategy in `strategy_performance` (full ROI/
TP-rate stats are Phase 5).

**Price sources:** crypto comes from Binance's public REST API — free, no
key required. Forex needs a Twelve Data API key (`TWELVE_DATA_API_KEY`,
free tier available) — without it, forex signals just won't be tracked
yet; crypto tracking works regardless.

**What actually triggers it:** `netlify/functions/track-signals-cron.mts`
is a Netlify Scheduled Function that runs every 5 minutes (`*/5 * * * *`)
and simply calls the `/api/cron/track-signals` route on the site's own
live URL (`process.env.URL`, provided by Netlify at runtime). Netlify's
scheduler has **no once-per-day restriction on the free plan** — the
minimum interval is 1 minute on any plan — which is why we moved off
Vercel for this. Netlify Functions do have a 10-second execution timeout
on the free tier; if the signal count grows large enough that a full
tracking pass takes longer than that, the fix is batching the work rather
than upgrading a plan.

You can trigger a run manually any time to sanity-check it's wired up:

```bash
curl "https://your-site.netlify.app/.netlify/functions/track-signals-cron"
```

## Performance Engine & AlphaScore — the actual differentiator

Ingestion and TP/SL tracking exist to feed this: every closed signal rolls
up into a per-strategy/analyst **AlphaScore** (0–100), computed in
`src/lib/alpha-score.ts` from raw aggregates the tracking cron accumulates
in `strategy_performance/{strategyId}`. Nothing about signal generation
(Jesse, TradingView, human analysts) matters to this layer — it only cares
that closed signals arrive in the standard shape, which every source
already produces.

**Composite (weights agreed, tunable via named constants in the file):**
- 40% win rate
- 25% realized reward:risk (average R-multiple: P/L ÷ risk taken at entry, linearly mapped from -1R→0 to +3R→100)
- 20% consistency (stddev of closed-signal returns — penalizes wild swings even at a good win rate)
- 15% sample-size confidence (exponential saturation — a 100% win rate on 4 signals scores far lower here than 65% on 400)

A strategy with zero closed signals is reported as **unranked** (not a
partial score) — the leaderboard sorts these to the bottom instead of
giving credit for trivial "zero variance" on data that doesn't exist yet.

TP-level hit counts (`tp1Hits`/`tp2Hits`/`tp3Hits`) accumulate the moment
each level is hit, independent of how the signal eventually closes, so
TP-success rates don't wait on the final SL/TP outcome.

Raw aggregates live in Firestore so the formula can be re-tuned (or
entirely replaced) later without a data migration — only
`computePerformance()` needs to change.

## Premium access control & Paystack billing

Premium is enforced at the **data layer**, not the UI. Architecture:

```
User → Firebase Auth (session cookie) → server route/page
     → getEntitlement(uid) reads subscriptions/{uid}
     → applyEntitlement() redacts premium signals for FREE viewers
```

- `src/lib/entitlements.ts` — the single decision point. For a FREE viewer,
  a `premiumOnly` signal comes back with `entry`/`stopLoss` zeroed,
  `takeProfits` emptied, `note` removed, and `restricted: true`. Result,
  P/L, status stay visible (the track record is the upgrade hook).
  Applied in **every** user-facing read: home, crypto, forex, history,
  watchlist, signal detail, `GET /api/signals`, `GET /api/signals/:id`.
  Admin views (`/admin/*`) read raw data and are never redacted.
- **Paystack is the source of payment events; AlphaTrade owns entitlement.**
  `subscriptions/{uid}` (plan, status, paystackCustomerCode,
  subscriptionCode, currentPeriodEnd, updatedAt) is written *only* by the
  webhook.
- `POST /api/billing/initialize` — starts Paystack Checkout server-side.
  The secret key (`PAYSTACK_SECRET_KEY`) never reaches the browser.
- `POST /api/webhooks/paystack` — verifies the `x-paystack-signature`
  HMAC-SHA512 over the raw body (constant-time compare) before trusting
  anything. Decision logic lives in `src/lib/paystack-events.ts` (pure,
  unit-tested): events only count if they carry our `metadata.uid` or match
  `PAYSTACK_PREMIUM_PLAN_CODE`, so **other products on the same Paystack
  account can't grant or revoke Premium**. Access always has a bounded
  expiry (billing period + 5-day grace), refreshed by each renewal.
- `/account/billing` (status + upgrade), `/billing/callback` (post-checkout
  confirmation; verification there is UX only, never the entitlement).

### ⚠️ Deploy `firestore.rules` — it is the actual enforcement boundary

Redaction in the API is meaningless if the raw `signals` collection is
readable from the browser. The included `firestore.rules` denies all client
access to `signals` (server code uses the Admin SDK, which bypasses rules),
blocks users from writing `role`/`tier`/`suspended` on their own profile,
restricts new profile docs to a plain free `user` (previously anyone could
self-create a `role: "admin"` doc), and makes `subscriptions` read-only to
clients. **Rules only take effect once deployed** — `firebase deploy --only
firestore:rules`, or paste into Firebase Console → Firestore → Rules.
These rules have **not** been run against the emulator; test in the Rules
Playground before launch (see the checklist below).

### Paystack setup

1. Paystack Dashboard → Settings → API Keys: copy the **test** secret key
   into `PAYSTACK_SECRET_KEY` (Netlify env vars, server-side only).
2. (Recommended) Products → Plans: create a monthly Premium plan and put
   its code in `PAYSTACK_PREMIUM_PLAN_CODE`. Without it, checkout is a
   one-off payment that grants one billing period.
3. Settings → API Keys & Webhooks → Webhook URL:
   `https://YOUR-DOMAIN/api/webhooks/paystack`
4. Set `APP_URL` to your live domain (used for the checkout callback).
5. Pay with a Paystack test card, then confirm `subscriptions/{uid}`
   appears in Firestore and the premium signal unlocks.

### Pre-launch verification checklist (Rules Playground / emulator)

- signed-in user **can** toggle their own favorite/watchlist/follow
- signed-in user **cannot** set their own `role`, `tier`, or `suspended`
- creating your own `users/{uid}` doc with `role: "admin"` is **denied**
- any client read of `signals` is **denied**
- a user **cannot** write `subscriptions/{uid}`

## Terms & registration

`/terms` holds a draft Terms & Conditions / risk disclosure (signals are
informational, not investment advice, per your lawyer). Registration
requires ticking the agreement checkbox and stamps `agreedToTermsAt` on the
profile. That timestamp is set from the browser, so treat it as a
convenience record rather than tamper-proof evidence. Have your lawyer
finalize governing-law, dispute-resolution, and NDPR/data-protection
clauses — the page is a drafting starting point.

## User features — watchlists, follow, favorites (spec section 17-18)

These are the user's own data, so most of it writes directly from the
client rather than through a server action — `firestore.rules` already
lets a signed-in user edit their own doc (everything except the protected
fields `role`, `tier`, `suspended`, `uid`, `email`, `createdAt`,
`agreedToTermsAt`), so there's no new backend surface here, just:

- `src/context/AuthContext.tsx` — now also holds a **live** subscription
  to the user's Firestore profile doc (`onSnapshot`), so toggling a
  favorite updates every instance of that button instantly, no refetch
- `src/lib/user-actions-client.ts` — `arrayUnion`/`arrayRemove` helpers
  for watchlist symbols, followed strategies, and favorited signals
- `FavoriteButton` / `WatchToggle` (in `SignalCard`) and `FollowButton`
  (in `Leaderboard`) — all render nothing when signed out
- `/watchlist` — a personal hub: favorited signals, signals for
  watchlisted instruments, and followed strategies with their live
  AlphaScore. Server-rendered from the session cookie (`get-server-user.ts`
  now also returns `watchlist`/`followedStrategyIds`/`favoriteSignalIds`),
  so it needs no client-side loading state.

Not built yet: risk preference configuration and "notify me" toggles per
followed strategy — those depend on the notification system, deferred for
now.

## Admin panel

Five sections under `/admin`, all server-rendered and gated by the same
`requireAdmin()` check from `admin/layout.tsx` — every mutation is a Next.js
Server Action that **independently re-verifies admin status** (never
relies solely on the page having rendered) and writes an entry to
`audit_logs`:

- **Sources** (`/admin/sources`) — add a source, toggle `authorized`/`active`.
  External API sources get an auto-generated key on creation.
- **Strategies** (`/admin/strategies`) — add a strategy, toggle active,
  see each one's live AlphaScore inline.
- **Signals** (`/admin/signals`) — moderation/override on open signals:
  close, cancel, mark invalid, modify stop-loss. This is override
  capability on already-published signals (spec section 23); there's no
  pre-publish review queue yet — validated signals still publish
  immediately.
- **Users** (`/admin/users`) — search by email, suspend/reactivate. This
  actually disables the Firebase Auth account (`adminAuth().updateUser`),
  not just a cosmetic Firestore flag, so a suspended user's existing
  session cookie stops verifying on their next request.
- **Audit log** (`/admin/audit-log`) — read-only feed of every action above.

## What's here

- `src/app/` — routes: home dashboard, `/crypto`, `/forex`, `/signals/[id]`,
  `/history`, `/login`, `/register`, `/admin` (server-side gated)
- `src/app/api/webhooks/tradingview/` — TradingView alert ingestion
  (`?secret=` query param auth)
- `src/app/api/webhooks/provider/[id]/` — generic authorized third-party
  provider ingestion (`x-provider-key` header, checked against the
  provider's own `signal_sources` doc)
- `src/app/api/signals/` — public REST API (`GET /api/signals?market=crypto`,
  `GET /api/signals/:id`)
- `src/app/api/auth/session/` — mints/clears the httpOnly session cookie
  admin access relies on
- `src/lib/signal-pipeline.ts` — normalize → validate → duplicate-check
- `src/lib/risk-engine.ts` — computes `riskScore`/`riskLevel` before a
  signal is written (Validation → **Risk Engine** → Firestore)
- `src/lib/signals-data.ts` — server-side reads; falls back to
  `mock-data.ts` automatically if Admin credentials aren't set yet
- `src/lib/get-server-user.ts` — resolves the signed-in user + role from
  the session cookie; `requireAdmin()` is the real access-control check
  used by `src/app/admin/layout.tsx`
- `firestore.rules` — public read on signals/strategies, admin-only writes
- `scripts/seed.mjs`, `scripts/set-admin-role.mjs` — one-time setup CLIs

## Admin access — now actually enforced server-side

`/admin` is gated by `src/app/admin/layout.tsx`, which calls
`requireAdmin()`: it reads the httpOnly session cookie, verifies it with
Firebase Admin, and checks the user's Firestore `role` field. This replaced
the earlier client-side-only check. There is still no UI for granting admin
— use `scripts/set-admin-role.mjs` until Phase 8 builds one.

## Testing ingestion locally

```bash
curl -X POST "http://localhost:3000/api/webhooks/tradingview?secret=dev-secret-change-me" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTC/USDT","direction":"LONG","entry":103500,"stopLoss":102400,"takeProfits":[104000,105000,106500],"timeframe":"15m","confidence":78}'
```

A successful call returns `{ "ok": true, "signalId": "..." }` and the
signal appears on the home page and `/crypto` immediately.

## Architecture (current)

Signal sources split into **Human Analysts** and **AI Strategies**
(TradingView, external APIs, future partners). Users split into **Free**
and **Premium** tiers — premium signals (`premiumOnly`) are redacted
server-side for non-subscribers (see "Premium access control"). Pipeline: Signal Engine →
Normalization → Validation → **Risk Engine** → Firestore → (Live Signals /
Performance / Analytics) → User Experience (Web/PWA, Mobile/Expo-RN,
Notifications).

## Not yet production-safe

- Premium billing is built but **untested against live Paystack** — run a
  test-mode payment end to end and complete the rules checklist above
  before charging real users
- `firestore.rules` must be deployed for premium gating to be real
- Notifications and watchlists are not built
- No pre-publish signal review queue — moderation in `/admin/signals` only
  covers already-published (open) signals, not a PENDING approval step
- TP/SL tracking logic exists and now has a real trigger
  (`netlify/functions/track-signals-cron.mts`, every 5 minutes) — confirm
  it fires at least once after your first deploy (check Netlify's Functions
  log) before trusting signals to close themselves
- No rate limiting on the webhook/API routes yet
- Forex tracking is inactive until `TWELVE_DATA_API_KEY` is set
- Both `alpha-momentum-engine.ts` and `fx-momentum-engine.ts` are working
  examples, not validated trading edges — let them run and accumulate
  closed signals before trusting their AlphaScores, and expect to tune or
  replace their stop/target percentages once real outcomes exist
- `fx-momentum-engine.ts` additionally needs `TWELVE_DATA_API_KEY` to
  generate anything at all (same key Phase 4's forex tracking needs)

## Next steps (Phase 5+)

Phase 5 — full Performance Engine (ROI, average time-to-TP, TP-level
success rates) beyond the running win/loss counts Phase 4 already keeps.
Phase 3 (connecting a real automated strategy engine) is still open too if
you want signals to originate automatically rather than via manual
webhook testing. See the full 10-phase plan in project memory.
