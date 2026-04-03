export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-bold text-ink">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-ink/60">{hint}</span> : null}
    </label>
  );
}

