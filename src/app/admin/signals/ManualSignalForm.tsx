"use client";

import { useActionState } from "react";
import type { Strategy } from "@/lib/types";
import { createManualSignal, type ManualSignalState } from "./actions";

const initialState: ManualSignalState = { ok: false, message: "" };

const fieldClass =
  "w-full rounded-md border px-3 py-2 text-sm outline-none";
const fieldStyle = {
  background: "var(--bg-elevated)",
  borderColor: "var(--border)",
  color: "var(--text-primary)",
};

export default function ManualSignalForm({ strategies }: { strategies: Strategy[] }) {
  const [state, formAction, pending] = useActionState(createManualSignal, initialState);

  return (
    <section
      className="rounded-md border p-4"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div>
        <h2 className="text-lg font-semibold">Create manual signal</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Admin-created signals use the same normalization, validation, risk scoring and duplicate checks as automated signals.
        </p>
      </div>

      <form action={formAction} className="mt-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block">Market</span>
            <select name="market" defaultValue="crypto" className={fieldClass} style={fieldStyle}>
              <option value="crypto">Crypto</option>
              <option value="forex">Forex</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block">Symbol</span>
            <input name="symbol" required placeholder="BTC/USDT" className={fieldClass} style={fieldStyle} />
          </label>

          <label className="text-sm">
            <span className="mb-1 block">Direction</span>
            <select name="direction" defaultValue="LONG" className={fieldClass} style={fieldStyle}>
              <option value="LONG">LONG</option>
              <option value="SHORT">SHORT</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block">Strategy</span>
            <select name="strategyId" required defaultValue="" className={fieldClass} style={fieldStyle}>
              <option value="" disabled>Select strategy</option>
              {strategies.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block">Timeframe</span>
            <select name="timeframe" defaultValue="15m" className={fieldClass} style={fieldStyle}>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="30m">30m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block">Confidence (1–100)</span>
            <input name="confidence" type="number" min="1" max="100" defaultValue="75" required className={fieldClass} style={fieldStyle} />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block">Entry</span>
            <input name="entry" type="number" min="0" step="any" required placeholder="120000" className={fieldClass} style={fieldStyle} />
          </label>

          <label className="text-sm">
            <span className="mb-1 block">Stop Loss</span>
            <input name="stopLoss" type="number" min="0" step="any" required placeholder="118000" className={fieldClass} style={fieldStyle} />
          </label>

          <label className="text-sm">
            <span className="mb-1 block">TP1</span>
            <input name="tp1" type="number" min="0" step="any" required placeholder="122000" className={fieldClass} style={fieldStyle} />
          </label>

          <label className="text-sm">
            <span className="mb-1 block">TP2</span>
            <input name="tp2" type="number" min="0" step="any" placeholder="124000" className={fieldClass} style={fieldStyle} />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block">TP3 (optional)</span>
            <input name="tp3" type="number" min="0" step="any" placeholder="126000" className={fieldClass} style={fieldStyle} />
          </label>

          <label className="text-sm">
            <span className="mb-1 block">Note (optional)</span>
            <input name="note" placeholder="Reason or setup context" className={fieldClass} style={fieldStyle} />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <input name="premiumOnly" type="checkbox" />
          Premium-only signal
        </label>

        {state.message && (
          <div
            className="rounded-md border px-3 py-2 text-sm"
            style={{
              borderColor: state.ok ? "var(--long-dim)" : "var(--short-dim)",
              color: state.ok ? "var(--long)" : "var(--short)",
            }}
          >
            {state.message}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
        >
          {pending ? "Creating signal…" : "Create signal"}
        </button>
      </form>
    </section>
  );
}
