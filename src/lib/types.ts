// Core domain types for AlphaTrade Signals.
// These mirror the standardized signal structure from the product spec
// (section 8 — Signal Normalization, section 27 — Signal Document) so that
// every source (algo engine, TradingView, external API, Telegram, admin)
// produces the same shape.

export type Market = "crypto" | "forex";

export type Direction = "LONG" | "SHORT";

export type SignalStatus =
  | "PENDING"
  | "ACTIVE"
  | "TP1_HIT"
  | "TP2_HIT"
  | "TP3_HIT"
  | "FULL_TP"
  | "SL_HIT"
  | "CANCELLED"
  | "EXPIRED"
  | "CLOSED";

export type SourceType =
  | "internal_algorithm"
  | "human_analyst"
  | "tradingview"
  | "external_api"
  | "telegram_discord"
  | "admin";

export type RiskLevel = "low" | "medium" | "high";

export type UserTier = "free" | "premium";

export type Timeframe = "5m" | "15m" | "30m" | "1h" | "4h" | "1d";

export interface TakeProfitTarget {
  level: 1 | 2 | 3;
  price: number;
  hitAt: string | null; // ISO timestamp once hit
}

export interface Signal {
  id: string;
  symbol: string; // e.g. "BTC/USDT", "EUR/USD"
  market: Market;
  direction: Direction;
  entry: number;
  entryRangeHigh?: number; // optional, for admin-entered entry ranges
  stopLoss: number;
  takeProfits: TakeProfitTarget[];
  timeframe: Timeframe;
  sourceId: string;
  strategyId: string;
  confidence: number; // 1-100
  status: SignalStatus;
  note?: string;
  // Risk Engine output — computed before the signal is written to
  // Firestore (spec revision: Validation -> Risk Engine -> Firestore).
  riskScore: number; // 0-100, higher = riskier
  riskLevel: RiskLevel;
  // Access tier: free signals are visible to everyone; premium signals
  // require an active premium subscription to view in full.
  premiumOnly: boolean;
  // Set true by the entitlement layer (never stored) when this signal's
  // entry/stopLoss/takeProfits/note have been redacted for a non-premium
  // viewer. See src/lib/entitlements.ts.
  restricted?: boolean;
  createdAt: string;
  activatedAt?: string;
  closedAt?: string;
  slHitAt?: string;
  result?: "WIN" | "LOSS" | "BREAKEVEN" | null;
  pnlPercent?: number | null;
  maxFavorableMove?: number | null;
  maxAdverseMove?: number | null;
}

export interface SignalSource {
  id: string;
  name: string;
  type: SourceType;
  authorized: boolean;
  active: boolean;
  connectionDetails?: string;
  parserConfig?: string;
}

export interface Strategy {
  id: string;
  name: string;
  description?: string;
  market: Market | "both";
  timeframes: Timeframe[];
  instruments: string[];
  engine?: string;
  riskLevel?: "low" | "medium" | "high";
  active: boolean;
}

/**
 * Raw counters stored in Firestore (strategy_performance/{strategyId}),
 * updated incrementally by the tracking cron as signals close. Nothing
 * here is a percentage or a score — those are derived at read time in
 * alpha-score.ts so the scoring formula can change without a data
 * migration.
 */
export interface StrategyPerformanceAggregate {
  strategyId: string;
  totalSignals: number;
  wins: number;
  losses: number;
  breakevens: number;
  pnlSum: number; // sum of closed-signal pnlPercent
  pnlSumSq: number; // sum of pnlPercent^2, for variance/consistency
  rMultipleSum: number; // sum of (pnlPercent / risk% at entry) per closed signal
  tp1Hits: number;
  tp2Hits: number;
  tp3Hits: number;
}

/** The read-side shape the UI consumes — aggregates plus derived stats and AlphaScore. */
export interface StrategyPerformance {
  strategyId: string;
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number; // 0-100
  avgReturnPercent: number;
  avgRMultiple: number; // average realized reward:risk, in R
  returnStdDev: number; // population stddev of closed pnlPercent
  tp1SuccessRate: number;
  tp2SuccessRate: number;
  tp3SuccessRate: number;
  activeSignals: number;
  alphaScore: number; // 0-100 composite — see src/lib/alpha-score.ts
  alphaScoreBreakdown: {
    winRateScore: number;
    rewardRiskScore: number;
    consistencyScore: number;
    confidenceScore: number;
  };
}

export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  role: "user" | "admin";
  tier: UserTier;
  suspended?: boolean;
  watchlist: string[]; // symbols
  followedStrategyIds: string[];
  favoriteSignalIds: string[];
  agreedToTermsAt?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  action: string;
  targetType: "signal" | "source" | "strategy" | "user";
  targetId: string;
  details?: string;
  createdAt: string;
}

/**
 * subscriptions/{uid} — AlphaTrade's own record of premium entitlement.
 * Paystack is the source of *payment events*; this document is what
 * AlphaTrade actually checks to decide access, and it's written only by
 * the Paystack webhook (src/app/api/webhooks/paystack), never the client.
 */
export interface Subscription {
  plan: "FREE" | "PREMIUM";
  status: "ACTIVE" | "INACTIVE";
  paystackCustomerCode?: string;
  subscriptionCode?: string;
  currentPeriodEnd?: string | null;
  updatedAt: string;
}
