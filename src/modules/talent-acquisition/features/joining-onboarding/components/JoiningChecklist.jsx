import { useMemo } from 'react';
import { CheckCircle2, Circle, MinusCircle, ShieldCheck, XCircle } from 'lucide-react';
import Badge from '../../../../../shared/components/Badge.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import {
  CHECKLIST_ITEM_STATUS,
  CHECKLIST_STATUS_META,
  JOINING_CHECKLIST_CATEGORIES,
} from '../../../constants/joiningStatus.js';
import { formatDate } from '../../../utils/formatDate.js';

/**
 * Joining checklist. Items are grouped by category with a per-item status;
 * mandatory items that are not verified block joining.
 */
export default function JoiningChecklist({ entry, onSetStatus, loading }) {
  const checklist = entry?.checklist || [];

  const groups = useMemo(
    () =>
      JOINING_CHECKLIST_CATEGORIES.map((category) => ({
        category,
        items: checklist.filter((item) => item.category === category),
      })).filter((group) => group.items.length > 0),
    [checklist]
  );

  const progress = entry?.checklistProgress || { completed: 0, total: 0, mandatoryCompleted: 0, mandatoryTotal: 0, percent: 0 };

  const setStatus = (key, status, remarks = '') => {
    if (loading) return;
    onSetStatus(entry, key, status, remarks);
  };

  return (
    <div className="ta-checklist-groups">
      <div className="ta-checklist-progress">
        <div className="ta-checklist-progress__head">
          <span>Mandatory items verified</span>
          <strong>
            {progress.mandatoryCompleted}/{progress.mandatoryTotal}
          </strong>
        </div>
        <div className="ta-progress-cell__track" aria-hidden="true">
          <span
            className="ta-progress-cell__bar"
            style={{
              width: `${progress.mandatoryTotal ? Math.round((progress.mandatoryCompleted / progress.mandatoryTotal) * 100) : 0}%`,
            }}
          />
        </div>
        <p className="ta-checklist-progress__meta">
          {progress.completed} of {progress.total} checklist items complete
        </p>
      </div>

      {groups.map((group) => (
        <section className="ta-checklist-group" key={group.category}>
          <h3 className="ta-checklist-group__title">{group.category}</h3>
          <ul className="ta-checklist">
            {group.items.map((item) => {
              const meta = CHECKLIST_STATUS_META[item.status] || CHECKLIST_STATUS_META.pending;
              const canToggle = !loading;

              return (
                <li className="ta-checklist__item" key={item.key}>
                  <div className="ta-checklist__main">
                    <label className="ta-checklist__label">
                      <span className="ta-checklist__status-icon">
                        {item.status === CHECKLIST_ITEM_STATUS.VERIFIED && (
                          <CheckCircle2 size={18} aria-hidden="true" />
                        )}
                        {item.status === CHECKLIST_ITEM_STATUS.REJECTED && (
                          <XCircle size={18} aria-hidden="true" />
                        )}
                        {item.status === CHECKLIST_ITEM_STATUS.NOT_APPLICABLE && (
                          <MinusCircle size={18} aria-hidden="true" />
                        )}
                        {[CHECKLIST_ITEM_STATUS.PENDING, CHECKLIST_ITEM_STATUS.SUBMITTED, CHECKLIST_ITEM_STATUS.UNDER_VERIFICATION].includes(item.status) && (
                          <Circle size={18} aria-hidden="true" />
                        )}
                      </span>
                      <span className="ta-checklist__item-body">
                        <span className="ta-checklist__item-label">
                          {item.label}
                          {item.mandatory && (
                            <span className="field__required" aria-hidden="true" title="Mandatory">
                              *
                            </span>
                          )}
                        </span>
                        {item.remarks && (
                          <span className="ta-checklist__item-remark">{item.remarks}</span>
                        )}
                        {item.updatedAt && (
                          <span className="cell-muted">Updated {formatDate(item.updatedAt)}</span>
                        )}
                      </span>
                    </label>
                    <Badge variant={meta.variant} dot={item.status === 'verified'}>
                      {meta.label}
                    </Badge>
                  </div>
                  <div className="ta-checklist__actions">
                    {item.status !== CHECKLIST_ITEM_STATUS.VERIFIED && item.status !== CHECKLIST_ITEM_STATUS.NOT_APPLICABLE && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={ShieldCheck}
                        disabled={!canToggle}
                        onClick={() => setStatus(item.key, 'verified', 'Verified by HR.')}
                      >
                        Verify
                      </Button>
                    )}
                    {item.status !== CHECKLIST_ITEM_STATUS.REJECTED && item.status !== CHECKLIST_ITEM_STATUS.NOT_APPLICABLE && (
                      <Button
                        variant="danger-ghost"
                        size="sm"
                        icon={XCircle}
                        disabled={!canToggle}
                        onClick={() =>
                          setStatus(item.key, 'rejected', 'Resubmission requested by HR.')
                        }
                      >
                        Reject
                      </Button>
                    )}
                    {item.status !== CHECKLIST_ITEM_STATUS.NOT_APPLICABLE && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={MinusCircle}
                        disabled={!canToggle}
                        onClick={() =>
                          setStatus(item.key, 'not_applicable', 'Not applicable for this candidate.')
                        }
                      >
                        N/A
                      </Button>
                    )}
                    {(item.status === CHECKLIST_ITEM_STATUS.REJECTED ||
                      item.status === CHECKLIST_ITEM_STATUS.NOT_APPLICABLE) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={CheckCircle2}
                        disabled={!canToggle}
                        onClick={() => setStatus(item.key, 'under_verification', 'Resubmitted for verification.')}
                      >
                        Resubmit
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
