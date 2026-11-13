import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Download,
  FileSearch,
  GraduationCap,
  Mail,
  MapPin,
  MessageSquarePlus,
  MoveRight,
  PauseCircle,
  Phone,
  PlayCircle,
  ShieldQuestion,
  XCircle,
} from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import Button from '../../../shared/components/Button.jsx';
import { useToast } from '../../../shared/components/Toast.jsx';
import { ROUTES } from '../../../app/routeConfig.js';
import CandidateStatusBadge from '../components/CandidateStatusBadge.jsx';
import DocumentList from '../features/candidate-documents/components/DocumentList.jsx';
import DocumentPreviewModal from '../features/candidate-documents/components/DocumentPreviewModal.jsx';
import RejectApplicationModal from '../features/candidate-applications/components/RejectApplicationModal.jsx';
import RemarkModal from '../features/candidate-applications/components/RemarkModal.jsx';
import useCandidateDocuments from '../features/candidate-documents/hooks/useCandidateDocuments.js';
import { useTalentAcquisition } from '../context/TalentAcquisitionContext.jsx';
import { buildApplicationRow, formatExperienceYears } from '../utils/formatCandidateData.js';
import { formatDate, formatDateTime } from '../utils/formatDate.js';
import { canTransitionApplication } from '../constants/applicationStatus.js';
import '../styles/candidateProfile.css';
import '../styles/candidateDocuments.css';

export default function CandidateProfilePage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { applications, candidates, jobs, loading, actions, refresh } =
    useTalentAcquisition();

  const [preview, setPreview] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [remarkOpen, setRemarkOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const application = applications.find((item) => item.applicationId === applicationId);
  const candidate = candidates.find(
    (item) => item.candidateId === application?.candidateId
  );
  const job = jobs.find((item) => item.jobId === application?.jobId);

  const row = useMemo(
    () => (application ? buildApplicationRow(application, { candidate, job }) : null),
    [application, candidate, job]
  );

  const { documents, loading: documentsLoading, getPreviewUrl, download } =
    useCandidateDocuments(candidate, job);

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <div className="loading-block">
            <span className="spinner" aria-hidden="true" />
            Loading candidate profile…
          </div>
        </div>
      </div>
    );
  }

  if (!application || !candidate) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Ecometrix · Talent Acquisition"
          title="Candidate not found"
          subtitle="The application reference could not be resolved in the recruitment records."
        />
        <div className="card">
          <div className="empty-state">
            <div className="empty-state__icon">
              <ShieldQuestion size={24} aria-hidden="true" />
            </div>
            <div className="empty-state__title">Unknown application</div>
            <p className="empty-state__text">
              The application <strong>{applicationId}</strong> is not part of the Talent
              Acquisition records.
            </p>
            <div className="empty-state__action">
              <Link className="btn btn--primary" to={ROUTES.TALENT_APPLICATIONS}>
                Back to applications
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleMoveToScreening = async () => {
    setBusy(true);
    try {
      await actions.moveToScreening(application.applicationId, { remarks: '' });
      await refresh();
      toast.success(`${candidate.fullName} moved to CV screening.`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAddRemark = async (remarks) => {
    setBusy(true);
    try {
      await actions.addRemark(application.applicationId, { remarks });
      await refresh();
      toast.success('The remark was recorded.');
      setRemarkOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleHold = async () => {
    setBusy(true);
    try {
      await actions.holdApplication(application.applicationId, {
        remarks: 'Application placed on hold by HR',
      });
      await refresh();
      toast.success('The application was put on hold.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleResume = async () => {    setBusy(true);
    try {
      await actions.resumeApplication(application.applicationId, {
        remarks: 'Application resumed by HR',
      });
      await refresh();
      toast.success('The application was resumed.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (remarks) => {    setBusy(true);
    try {
      await actions.rejectApplication(application.applicationId, { remarks });
      await refresh();
      toast.success('The application was rejected.');
      setRejectOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handlePreview = (document) => {
    setPreview({
      document,
      url: getPreviewUrl(document),
    });
  };

  const handleDownload = (document) => {
    try {
      download(document);
      toast.success('Document download started.');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const timeline = Array.isArray(application.timeline) ? [...application.timeline].reverse() : [];

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <>
            <Link to={ROUTES.TALENT_APPLICATIONS}>Candidate Applications</Link>
          </>
        }
        title={candidate.fullName}
        subtitle={`${row.jobTitle} · application ${row.applicationId}`}
        actions={
          <>
            <Button
              variant="outline"
              icon={ArrowLeft}
              onClick={() => navigate(ROUTES.TALENT_APPLICATIONS)}
            >
              Back
            </Button>
            <Button
              variant="outline"
              icon={FileSearch}
              onClick={() => {
                const cv = documents.find((document) => document.type === 'cv');
                if (!cv) {
                  toast.warning('No CV has been submitted for this candidate.');
                  return;
                }
                handlePreview(cv);
              }}
            >
              Preview CV
            </Button>
            <Button
              variant="outline"
              icon={Download}
              onClick={() => {
                const cv = documents.find((document) => document.type === 'cv');
                if (!cv) {
                  toast.warning('No CV has been submitted for this candidate.');
                  return;
                }
                handleDownload(cv);
              }}
            >
              Download CV
            </Button>
            {!['rejected', 'selected'].includes(application.status) && (
              <Button variant="ghost" icon={MessageSquarePlus} onClick={() => setRemarkOpen(true)}>
                Add Remark
              </Button>
            )}
            {application.status === 'applied' && (
              <Button icon={MoveRight} loading={busy} onClick={handleMoveToScreening}>
                Move to Screening
              </Button>
            )}
            {canTransitionApplication(application.status, 'on_hold') && (
              <Button
                variant="outline"
                icon={PauseCircle}
                loading={busy}
                onClick={handleHold}
              >
                Put on Hold
              </Button>
            )}
            {application.status === 'on_hold' && (
              <Button
                variant="outline"
                icon={PlayCircle}
                loading={busy}
                onClick={handleResume}
              >
                Resume
              </Button>
            )}
            {canTransitionApplication(application.status, 'rejected') && (
              <Button variant="danger-ghost" icon={XCircle} onClick={() => setRejectOpen(true)}>
                Reject Application
              </Button>
            )}
          </>
        }
      />

      <div className="ta-profile-grid">
        <section className="card ta-profile-main">
          <div className="card__header">
            <div>
              <div className="card__title">Personal information</div>
              <div className="card__subtitle">Details submitted with the application</div>
            </div>
            <CandidateStatusBadge status={application.status} />
          </div>
          <div className="card__body">
            <div className="detail-grid detail-grid--3">
              <div className="detail-item">
                <div className="detail-item__label">Candidate ID</div>
                <div className="detail-item__value">{candidate.candidateId}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Application ID</div>
                <div className="detail-item__value">{application.applicationId}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Current title</div>
                <div className="detail-item__value">
                  {candidate.currentTitle || 'Not provided'}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">
                  <Mail size={12} aria-hidden="true" /> Email
                </div>
                <div className="detail-item__value">{candidate.email}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">
                  <Phone size={12} aria-hidden="true" /> Phone
                </div>
                <div className="detail-item__value">{candidate.phone || '—'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">
                  <MapPin size={12} aria-hidden="true" /> Location
                </div>
                <div className="detail-item__value">{candidate.location || '—'}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Job application</div>
              <div className="card__subtitle">Position the candidate applied for</div>
            </div>
          </div>
          <div className="card__body">
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-item__label">Position</div>
                <div className="detail-item__value">{row.jobTitle}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Department</div>
                <div className="detail-item__value">{row.jobDepartment || '—'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Applied on</div>
                <div className="detail-item__value">{formatDate(application.appliedDate)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Source</div>
                <div className="detail-item__value">
                  {application.source}
                  {application.referrer ? ` · ${application.referrer}` : ''}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Required experience</div>
                <div className="detail-item__value">
                  {formatExperienceYears(row.requiredExperienceYears)}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Required qualification</div>
                <div className="detail-item__value">{row.requiredQualification || '—'}</div>
              </div>
            </div>



            <div className="detail-item" style={{ marginTop: '0.75rem' }}>
              <div className="detail-item__label">Latest HR remark</div>
              <div className="detail-item__value">
                {application.remarks || 'No remarks recorded yet.'}
              </div>
            </div>

            <div className="detail-item" style={{ marginTop: '0.75rem' }}>
              <div className="detail-item__label">Documents available</div>
              <div className="detail-item__value">
                {row.candidateHasCv
                  ? 'CV received · see Uploaded documents'
                  : 'No CV has been received yet'}
              </div>
            </div>

            {application.status === 'on_hold' && (
              <div className="notice notice--warning" style={{ marginTop: '1rem' }}>
                <div className="notice__body">
                  <div className="notice__title">Application on hold</div>
                  {application.holdReason ||
                    'This application is on hold. Resume it before moving the candidate forward.'}
                  {application.heldAt && (
                    <>
                      {' '}
                      Placed on hold on {formatDate(application.heldAt)}
                      {application.heldBy ? ` by ${application.heldBy}` : ''}.
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card__header">
          <div>
            <div className="card__title">Technical skills</div>
            <div className="card__subtitle">Skills listed by the candidate</div>
          </div>
        </div>
        <div className="card__body">
          {candidate.skills?.length ? (
            <div className="ta-chip-list">
              {candidate.skills.map((skill) => (
                <span className="ta-chip" key={skill}>
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="detail-item__value detail-item__value--muted">
              No skills were provided.
            </p>
          )}
        </div>
      </section>

      <div className="ta-profile-grid">
        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Education details</div>
              <div className="card__subtitle">Qualifications submitted with the application</div>
            </div>
            <GraduationCap size={18} aria-hidden="true" />
          </div>
          <div className="card__body">
            {candidate.education?.length ? (
              <ul className="ta-detail-list">
                {candidate.education.map((item, index) => (
                  <li className="ta-detail-list__item" key={`${item.institution}-${index}`}>
                    <div className="ta-detail-list__title">{item.qualification}</div>
                    <div className="ta-detail-list__meta">
                      {item.institution}
                      {item.specialization ? ` · ${item.specialization}` : ''}
                      {item.passingYear ? ` · ${item.passingYear}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="detail-item__value detail-item__value--muted">
                No education details were provided.
              </p>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Professional experience</div>
              <div className="card__subtitle">Previous roles</div>
            </div>
            <Briefcase size={18} aria-hidden="true" />
          </div>
          <div className="card__body">
            {candidate.experience?.length ? (
              <ul className="ta-detail-list">
                {candidate.experience.map((item, index) => (
                  <li className="ta-detail-list__item" key={`${item.company}-${index}`}>
                    <div className="ta-detail-list__title">
                      {item.designation} · {item.company}
                    </div>
                    <div className="ta-detail-list__meta">
                      {item.from} – {item.to}
                    </div>
                    {item.responsibilities && (
                      <p className="ta-detail-list__text">{item.responsibilities}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="detail-item__value detail-item__value--muted">
                No professional experience was provided.
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="ta-profile-grid">
        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Certifications</div>
              <div className="card__subtitle">Certificates claimed by the candidate</div>
            </div>
            <BadgeCheck size={18} aria-hidden="true" />
          </div>
          <div className="card__body">
            {candidate.certifications?.length ? (
              <ul className="ta-detail-list">
                {candidate.certifications.map((item, index) => (
                  <li className="ta-detail-list__item" key={`${item.name}-${index}`}>
                    <div className="ta-detail-list__title">{item.name}</div>
                    <div className="ta-detail-list__meta">
                      {item.issuer}
                      {item.year ? ` · ${item.year}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="detail-item__value detail-item__value--muted">
                No certifications were provided.
              </p>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Uploaded documents</div>
              <div className="card__subtitle">Files submitted through the Career Portal</div>
            </div>
          </div>
          <div className="card__body">
            <DocumentList
              documents={documents}
              loading={documentsLoading}
              onPreview={handlePreview}
              onDownload={handleDownload}
            />
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card__header">
          <div>
            <div className="card__title">Recruitment timeline</div>
            <div className="card__subtitle">Every recorded transition of this application</div>
          </div>
        </div>
        <div className="card__body">
          {timeline.length === 0 ? (
            <p className="detail-item__value detail-item__value--muted">
              No timeline entries recorded yet.
            </p>
          ) : (
            <ol className="ta-timeline">
              {timeline.map((entry, index) => (
                <li className="ta-timeline__item" key={`${entry.at}-${index}`}>
                  <span className="ta-timeline__dot" aria-hidden="true" />
                  <div className="ta-timeline__body">
                    <div className="ta-timeline__event">
                      {entry.event}
                      {entry.previousStatus && entry.status ? (
                        <span className="ta-timeline__transition">
                          {' '}
                          {entry.previousStatus.replace(/_/g, ' ')} →{' '}
                          {entry.status.replace(/_/g, ' ')}
                        </span>
                      ) : null}
                    </div>
                    <div className="ta-timeline__meta">
                      {formatDateTime(entry.at)}
                      {entry.user ? ` · ${entry.user}` : ''}
                    </div>
                    {entry.note && <div className="ta-timeline__note">{entry.note}</div>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <RemarkModal
        open={remarkOpen}
        row={row}
        loading={busy}
        onClose={() => setRemarkOpen(false)}
        onConfirm={handleAddRemark}
      />

      <RejectApplicationModal
        row={row}
        open={rejectOpen}
        loading={busy}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
      />

      <DocumentPreviewModal
        document={preview?.document}
        url={preview?.url}
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        onDownload={handleDownload}
      />
    </div>
  );
}
