import { RECRUITMENT_STAGES } from '../constants/recruitmentStages.js';

/**
 * Recruitment pipeline. Each stage shows the number of applications that are
 * currently in that stage, derived from the application records.
 */
export default function RecruitmentPipeline({ applications = [], onSelectStage }) {
  const counts = RECRUITMENT_STAGES.map((stage) => ({
    ...stage,
    count: applications.filter((application) => application.status === stage.key).length,
  }));

  const total = counts.reduce((sum, stage) => sum + stage.count, 0);
  const max = Math.max(...counts.map((stage) => stage.count), 1);

  return (
    <div className="card">
      <div className="card__header">
        <div>
          <div className="card__title">Recruitment pipeline</div>
          <div className="card__subtitle">
            {total} applications distributed across {RECRUITMENT_STAGES.length} stages
          </div>
        </div>
      </div>
      <div className="card__body">
        <ol className="ta-pipeline">
          {counts.map((stage) => {
            const percentage = Math.round((stage.count / max) * 100);
            const isInteractive = typeof onSelectStage === 'function';

            const content = (
              <>
                <div className="ta-pipeline__stage-head">
                  <span className="ta-pipeline__stage-label">{stage.label}</span>
                  <span className="ta-pipeline__stage-count">{stage.count}</span>
                </div>
                <div className="ta-pipeline__track" aria-hidden="true">
                  <span className="ta-pipeline__bar" style={{ width: `${percentage}%` }} />
                </div>
                <p className="ta-pipeline__stage-desc">{stage.description}</p>
              </>
            );

            return (
              <li className="ta-pipeline__stage" key={stage.key}>
                {isInteractive ? (
                  <button
                    type="button"
                    className="ta-pipeline__button"
                    onClick={() => onSelectStage(stage.key)}
                    aria-label={`Filter applications by ${stage.label}`}
                  >
                    {content}
                  </button>
                ) : (
                  <div className="ta-pipeline__button">{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
