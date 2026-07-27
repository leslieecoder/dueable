export function ProgressIndicator({
  completed,
  total,
  label,
}: {
  completed: number;
  total: number;
  label?: string;
}) {
  const safeTotal = total > 0 ? total : 1;
  const width = `${Math.round((completed / safeTotal) * 100)}%`;

  return (
    <div className="progress-indicator">
      <p className="progress-label">{label ?? `${completed} of ${total} tasks completed`}</p>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width }} />
      </div>
    </div>
  );
}