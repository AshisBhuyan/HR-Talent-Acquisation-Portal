import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  PauseCircle,
  Sparkles,
  XCircle,
  Link as LinkIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import Badge from '../../../../../shared/components/Badge.jsx';
import { Textarea } from '../../../../../shared/components/Input.jsx';
import SkillsMatch from './SkillsMatch.jsx';
import ScreeningScore from './ScreeningScore.jsx';
import DocumentList from '../../candidate-documents/components/DocumentList.jsx';
import DocumentPreviewModal from '../../candidate-documents/components/DocumentPreviewModal.jsx';
import useCandidateDocuments from '../../candidate-documents/hooks/useCandidateDocuments.js';
import { buildScreeningAnalysis } from '../utils/screeningAnalysis.js';
import { getInitials, formatExperienceYears } from '../../../utils/formatCandidateData.js';
import { ROUTES } from '../../../../../app/routeConfig.js';
import { getDocumentTypeLabel } from '../../../constants/candidateDocumentRules.js';
import { formatDate, formatDateTime } from '../../../utils/formatDate.js';

const AI_EVALUATION_META = {
  pending: { label: 'Awaiting AI Result', variant: 'grey' },
  processing: { label: 'Processing', variant: 'orange' },
  completed: { label: 'AI Evaluation Completed', variant: 'green' },
};

/**
 * Candidate screening workspace. It compares the job requirements with the
 * candidate record and displays the results returned by the screening
 * service.
 */
export default function ScreeningReviewModal({
  entry,
  open,
  onClose,
  onSaveDecision,
  onPassed,
  onHold,
  onReject,
  loading,
}) {
  const [remarks, setRemarks] = useState('');
  const [remarkError, setRemarkError] = useState('');
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (entry) {
      setRemarks(entry.screening.hrRemarks || '');
      setRemarkError('');
    }
  }, [entry]);

  const analysis = useMemo(
    () => buildScreeningAnalysis(entry?.candidate, entry?.job),
    [entry]
  );

  const { documents, loading: docsLoading, getPreviewUrl, download } = useCandidateDocuments(
    entry?.candidate,
    entry?.job
  );

  if (!entry) return null;

  const aiResult = entry.screening.aiResult || null;
  const hasScore = Number.isFinite(Number(entry.screening.score));
  const scoreValue = hasScore ? Number(entry.screening.score) : null;
  const aiStatus = aiResult || hasScore ? 'completed' : 'pending';
  const aiMeta = AI_EVALUATION_META[aiStatus];

  const requiredSkills = entry.job?.requiredSkills || [];
  const candidateSkills = entry.candidate?.skills || [];
  const related = analysis.skills.matched.filter(Boolean);

  const canPassed = entry.application.status === 'under_screening' && entry.hrDecision !== 'passed';
  const canHold = entry.application.status === 'under_screening';
  const canReject =
    !['rejected', 'selected'].includes(entry.application.status) &&
    entry.application.status !== 'on_hold';

  const handleSaveRemarks = () => {
    onSaveDecision({
      status: entry.screening.status,
      score: entry.screening.score,
      hrRemarks: remarks,
    });
  };

  const handlePassed = () => onPassed(remarks);
  const handleHold = () => {
    if (!remarks.trim()) {
      setRemarkError('Record the hold reason in the HR remarks before placing the application on hold.');
      return;
    }
    onHold(remarks.trim());
  };
  const handleReject = () => {
    if (!remarks.trim()) {
      setRemarkError('Record the rejection reason in the HR remarks before rejecting the application.');
      return;
    }
    onReject(remarks.trim());
  };

  const profilePath = `${ROUTES.TALENT_APPLICATIONS}/${entry.application.applicationId}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Screening workspace Ã‚Â· ${entry.candidate.fullName}`}
      subtitle={`${entry.job?.title || 'Position'} Ã‚Â· ${entry.application.applicationId}`}
      size="xl"
      footer={
        <>
          <Link
            to={profilePath}
            className="btn btn--ghost btn--sm"
            aria-label={`Open the profile of ${entry.candidate.fullName}`}
          >
            <LinkIcon size={14} aria-hidden="true" /> Open candidate profile
          </Link>
          <span className="modal__footer-note" />
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            icon={PauseCircle}
            onClick={handleHold}
            disabled={!canHold}
          >
            On Hold
          </Button>
          <Button
            variant="danger-ghost"
            icon={XCircle}
            onClick={handleReject}
            disabled={!canReject}
          >
            Reject
          </Button>
          <Button
            variant="secondary"
            icon={CheckCircle2}
            onClick={handlePassed}
            disabled={!canPassed}
            loading={loading}
          >
            Passed
          </Button>
          <Button onClick={handleSaveRemarks} loading={loading}>
            Save Remarks
          </Button>
        </>
      }
    >
      <div className="ta-screening-layout">
        <div className="ta-screening-layout__main">
          <section className="ta-panel">
            <div className="ta-panel__header">Candidate overview</div>
            <div className="detail-grid detail-grid--3">
              <div className="detail-item">
                <div className="detail-item__label">Candidate</div>
                <div className="detail-item__value">{entry.candidate.fullName}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Candidate ID</div>
                <div className="detail-item__value">{entry.candidate.candidateId}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Application ID</div>
                <div className="detail-item__value">{entry.application.applicationId}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Position</div>
                <div className="detail-item__value">{entry.job?.title || 'Ã¢â‚¬â€'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Department</div>
                <div className="detail-item__value">{entry.job?.department || 'Ã¢â‚¬â€'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Experience</div>
                <div className="detail-item__value">{formatExperienceYears(entry.candidate.totalExperienceYears)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Location</div>
                <div className="detail-item__value">{entry.candidate.location || 'Ã¢â‚¬â€'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Applied on</div>
                <div className="detail-item__value">{formatDate(entry.application.appliedDate)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Application status</div>
                <div className="detail-item__value">{entry.application.status.replace(/_/g, ' ')}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">AI evaluation</div>
                <div className="detail-item__value">
                  <Badge variant={aiMeta.variant} dot>
                    {aiMeta.label}
                  </Badge>
                </div>
              </div>
            </div>
          </section>

          <section className="ta-panel">
            <div className="ta-panel__header">Job requirements</div>
            <div className="detail-grid detail-grid--3">
              <div className="detail-item">
                <div className="detail-item__label">Title</div>
                <div className="detail-item__value">{entry.job?.title || 'Ã¢â‚¬â€'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Department</div>
                <div className="detail-item__value">{entry.job?.department || 'Ã¢â‚¬â€'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Required experience</div>
                <div className="detail-item__value">{entry.job?.minExperienceYears ?? 0} yrs</div>
              </div>
              <div className="detail-item detail-item--full" style={{ gridColumn: '1 / -1' }}>
                <div className="detail-item__label">Required skills</div>
                <div className="ta-chip-list">
                  {requiredSkills.map((skill) => (
                    <span className="ta-chip" key={skill}>{skill}</span>
                  ))}
                </div>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <div className="detail-item__label">Required qualification</div>
                <div className="detail-item__value">{entry.job?.requiredQualification || 'Ã¢â‚¬â€'}</div>
              </div>
              {entry.job?.description && (
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="detail-item__label">Job description</div>
                  <div className="detail-item__value">{entry.job.description}</div>
                </div>
              )}
              {entry.job?.otherRequirements?.length > 0 && (
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="detail-item__label">Other requirements</div>
                  <ul className="ta-detail-list">
                    {entry.job.otherRequirements.map((item, index) => (
                      <li className="ta-detail-list__item" key={`${index}-${item}`}>
                        <span className="ta-detail-list__title" style={{ fontWeight: 500 }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          <section className="ta-panel">
            <div className="ta-panel__header">Candidate skills comparison</div>
            <table className="ta-compare-table">
              <thead>
                <tr>
                  <th scope="col">Required skill</th>
                  <th scope="col">Candidate skill</th>
                  <th scope="col">Match</th>
                </tr>
              </thead>
              <tbody>
                {requiredSkills.map((skill) => {
                  const owned = candidateSkills.find(
                    (item) => String(item).toLowerCase() === String(skill).toLowerCase()
                  );
                  const related = owned
                    ? owned
                    : candidateSkills.find((item) =>
                        String(item).toLowerCase().includes(String(skill).toLowerCase())
                      );
                  const matched = owned && owned.toLowerCase() === skill.toLowerCase();
                  return (
                    <tr key={skill}>
                      <td>{skill}</td>
                      <td>{owned || related || 'Not found'}</td>
                      <td>
                        {matched ? (
                          <Badge variant="green">Matched</Badge>
                        ) : related ? (
                          <Badge variant="orange">Related</Badge>
                        ) : (
                          <Badge variant="red">Missing</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="ta-panel">
            <div className="ta-panel__header">Experience and education</div>
            <div className="detail-grid detail-grid--3">
              <div className="detail-item">
                <div className="detail-item__label">Required experience</div>
                <div className="detail-item__value">{entry.job?.minExperienceYears ?? 0} yrs</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Candidate experience</div>
                <div className="detail-item__value">{formatExperienceYears(entry.candidate.totalExperienceYears)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Experience match</div>
                <div className="detail-item__value">
                  <Badge
                    variant={
                      analysis.experience.state === 'met'
                        ? 'green'
                        : analysis.experience.state === 'short'
                          ? 'red'
                          : 'grey'
                    }
                  >
                    {analysis.experience.state === 'met'
                      ? 'Meets requirement'
                      : analysis.experience.state === 'short'
                        ? 'Below requirement'
                        : 'Not applicable'}
                  </Badge>
                </div>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <div className="detail-item__label">Educational qualifications</div>
                {entry.candidate.education?.length ? (
                  <ul className="ta-detail-list">
                    {entry.candidate.education.map((item, index) => (
                      <li className="ta-detail-list__item" key={`${item.institution}-${index}`}>
                        <div className="ta-detail-list__title">{item.qualification}</div>
                        <div className="ta-detail-list__meta">
                          {item.institution}
                          {item.specialization ? ` Ã‚Â· ${item.specialization}` : ''}
                          {item.passingYear ? ` Ã‚Â· ${item.passingYear}` : ''}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="detail-item__value detail-item__value--muted">No education details were provided.</p>
                )}
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <div className="detail-item__label">Education match</div>
                <div className="detail-item__value">{analysis.education.label}</div>
              </div>
            </div>
          </section>

          <section className="ta-panel">
            <div className="ta-panel__header">
              <Bot size={15} aria-hidden="true" /> AI evaluation summary
            </div>
            {aiResult ? (
              <div className="ta-screening-ai">
                <Badge variant="purple">
                  <Sparkles size={12} aria-hidden="true" /> {aiResult.engine}
                </Badge>
                <div className="detail-grid detail-grid--3" style={{ marginTop: '0.75rem' }}>
                  <div className="detail-item">
                    <div className="detail-item__label">Overall matching score</div>
                    <div className="detail-item__value">
                      {scoreValue !== null ? `${scoreValue}%` : 'Awaiting AI Result'}
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item__label">Skills match</div>
                    <div className="detail-item__value">{analysis.skills.percentage}%</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item__label">Experience match</div>
                    <div className="detail-item__value">
                      {analysis.experience.gap >= 0 ? 'Met' : 'Below requirement'}
                    </div>
                  </div>
                </div>
                <p className="ta-screening-ai__summary">{aiResult.summary}</p>
                {aiResult.missingSkills?.length > 0 && (
                  <p className="ta-screening-ai__missing">
                    Not covered: {aiResult.missingSkills.join(', ')}
                  </p>
                )}
                <p className="ta-screening-ai__meta">
                  Generated {formatDate(aiResult.generatedAt)} Ã‚Â· demonstration screening service
                  (mock data) Ã‚Â· not live AI inference
                </p>
              </div>
            ) : (
              <p className="ta-screening-ai__meta">
                No AI result has been received for this application. This module displays results
                delivered by the backend screening service. When a result is unavailable, the
                screening score displays as <strong>Awaiting AI Result</strong>.
              </p>
            )}
          </section>

          <section className="ta-panel">
            <div className="ta-panel__header">Documents</div>
            <DocumentList
              documents={documents}
              loading={docsLoading}
              onPreview={(document) =>
                setPreview({ document, url: getPreviewUrl(document) })
              }
              onDownload={(document) => download(document)}
            />
          </section>

          <section className="ta-panel">
            <div className="ta-panel__header">HR screening remarks</div>
            <Textarea
              value={remarks}
              onChange={(event) => {
                setRemarks(event.target.value);
                if (remarkError) setRemarkError('');
              }}
              placeholder="Summarise the screening outcome and the reason for the decision"
              error={remarkError}
            />
            <p className="ta-screening-ai__meta" style={{ marginTop: '0.35rem' }}>
              Remarks are stored with the application. Required for On Hold and Rejected decisions.
            </p>
          </section>
        </div>

        <aside className="ta-screening-layout__side">
          <div className="ta-score-card">
            <div className="ta-score-card__label">Match score</div>
            <div className="ta-score-card__value">
              {scoreValue !== null ? `${scoreValue}%` : 'Ã¢â‚¬â€'}
            </div>
            <div className="ta-score-card__meta">
              {scoreValue !== null ? 'Score returned by the screening service' : 'Awaiting AI Result'}
            </div>
          </div>

          <ScreeningScore
            score={scoreValue}
            label="Overall matching score"
            size="md"
          />
          <ScreeningScore
            score={analysis.skills.percentage}
            label="Skills match"
            size="sm"
          />
          <ScreeningScore
            score={analysis.experience.gap >= 0 ? 100 : 40}
            label="Experience match"
            size="sm"
          />

          <div className="ta-panel">
            <div className="ta-panel__header">Application status</div>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-item__label">Stage</div>
                <div className="detail-item__value">{entry.application.status.replace(/_/g, ' ')}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Source</div>
                <div className="detail-item__value">{entry.application.source}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Applied on</div>
                <div className="detail-item__value">{formatDate(entry.application.appliedDate)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Screening status</div>
                <div className="detail-item__value">{entry.screening.status}</div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <DocumentPreviewModal
        document={preview?.document}
        url={preview?.url}
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        onDownload={(document) => download(document)}
      />
    </Modal>
  );
}




