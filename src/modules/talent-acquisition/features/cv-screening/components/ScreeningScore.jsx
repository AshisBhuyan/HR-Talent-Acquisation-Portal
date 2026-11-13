/**
 * Displays the screening score. The score is the value recorded by HR or the
 * value delivered by the backend screening service.
 */
export default function ScreeningScore({ score, label = 'Screening score', size = 'md' }) {
  const value = Number(score);
  const isValid = Number.isFinite(value);
  const percentage = isValid ? Math.min(100, Math.max(0, value)) : 0;

  return (
    <div className={`ta-score ta-score--${size}`}>
      <div className="ta-score__head">
        <span className="ta-score__label">{label}</span>
        <span className="ta-score__value">{isValid ? `${value}%` : '—'}</span>
      </div>
      <div
        className="ta-score__track"
        role="meter"
        aria-valuenow={isValid ? percentage : 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <span className="ta-score__bar" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
