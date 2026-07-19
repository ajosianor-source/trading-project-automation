export function Progress({ value, tone = "primary" }: { value: number; tone?: "primary" | "warning" | "danger" }) {
  const color = tone === "danger" ? "bg-danger" : tone === "warning" ? "bg-warning" : "bg-primary";
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

