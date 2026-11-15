import { CHECKLIST_ITEM_STATUS } from '../constants/joiningStatus.js';

/**
 * Joining checklist satisfaction rules — the single source of truth used by
 * the checklist UI, the joining page, the verification service and the
 * markJoined gate.
 *
 * Business rule (see JOINING_CHECKLIST_DEFINITIONS in constants/joiningStatus.js):
 * "Mandatory items must all be VERIFIED before the candidate can be marked as
 * joined." Concretely:
 *
 * - A mandatory item is satisfied only when its status is `verified`.
 * - An optional (non-mandatory) item is satisfied when its status is
 *   `verified` or `not_applicable`. Not Applicable is an explicit HR
 *   attestation that the item does not apply to the candidate.
 * - Not Applicable never satisfies a mandatory item.
 *
 * `markJoined` (candidateToEmployeeService.getMandatoryIncomplete), the
 * verification auto-status (joiningService.decideVerificationStatus), the
 * progress display and the Ready-to-join / Mark-as-joined buttons all derive
 * from these helpers so the UI can never enable an action that the service
 * will reject.
 */
export function isChecklistItemSatisfied(item) {
  if (!item) return false;
  if (item.status === CHECKLIST_ITEM_STATUS.VERIFIED) return true;
  if (
    item.status === CHECKLIST_ITEM_STATUS.NOT_APPLICABLE &&
    !item.mandatory
  ) {
    return true;
  }
  return false;
}

export function summarizeChecklist(checklist) {
  const items = Array.isArray(checklist) ? checklist : [];
  const mandatory = items.filter((item) => item.mandatory);
  const completed = items.filter(isChecklistItemSatisfied).length;
  const mandatoryCompleted = mandatory.filter(isChecklistItemSatisfied).length;

  return {
    total: items.length,
    completed,
    mandatoryTotal: mandatory.length,
    mandatoryCompleted,
    percent: items.length ? Math.round((completed / items.length) * 100) : 0,
  };
}

export function areMandatoryChecklistItemsSatisfied(checklist) {
  const items = Array.isArray(checklist) ? checklist : [];
  return items.filter((item) => item.mandatory).every(isChecklistItemSatisfied);
}
