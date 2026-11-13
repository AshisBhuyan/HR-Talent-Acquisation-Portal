/**
 * Recruitment funnel. Every step is derived from the applications that
 * currently sit in that stage.
 */
export default function FunnelChart({ stages = [], total = 0 }) {
  const max = Math.max(...stages.map((stage) => stage.count), 1);

  return (
    <div className="ta-funnel">
      {stages.map((stage) => {
        const width = Math.max(6, Math.round((stage.count / max) * 100));
        return (
          <div className="ta-funnel__row" key={stage.key}>
            <div className="ta-funnel__label">{stage.label}</div>
            <div className="ta-funnel__bar-wrap">
              <div
                className="ta-funnel__bar"
                style={{ width: `${width}%` }}
                role="img"
                aria-label={`${stage.label}: ${stage.count} applications`}
              >
                <span className="ta-funnel__bar-value">{stage.count}</span>
              </div>
            </div>
            <div className="ta-funnel__share">
              {total ? `${Math.round((stage.count / total) * 100)}%` : '0%'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
