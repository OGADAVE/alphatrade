export default function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "long" | "short" | "neutral";
}) {
  const color =
    tone === "long" ? "var(--long)" : tone === "short" ? "var(--short)" : "var(--text-primary)";

  return (
    <div
      className="rounded-md border px-4 py-3"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </p>
      <p className="font-data mt-1 text-xl font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
