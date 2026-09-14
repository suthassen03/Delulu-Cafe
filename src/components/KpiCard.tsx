export function KpiCard({
  label,
  value,
  sublabel,
  trend,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sublabel?: string;
  trend?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const trendColor = {
    neutral: "text-slate-500",
    success: "text-success-600",
    warning: "text-warning-600",
    danger: "text-danger-600",
  }[tone];

  return (
    <div className="card">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {(sublabel || trend) && (
        <div className="mt-1 flex items-center gap-1.5 text-xs">
          {trend && <span className={`font-medium ${trendColor}`}>{trend}</span>}
          {sublabel && <span className="text-slate-400">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
