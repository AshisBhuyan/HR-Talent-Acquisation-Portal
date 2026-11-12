import { useMemo, useState } from 'react';
import { CheckCircle2, FileText } from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import EmployeeSearch from '../components/EmployeeSearch.jsx';
import EmployeeFilters from '../components/EmployeeFilters.jsx';
import SubmissionTable from '../features/submissions/components/SubmissionTable.jsx';
import SubmissionReview from '../features/submissions/components/SubmissionReview.jsx';
import useSubmissions from '../features/submissions/hooks/useSubmissions.js';
import { useToast } from '../../../shared/components/Toast.jsx';
import {
  SUBMISSION_STATUS,
  SUBMISSION_STATUS_OPTIONS,
} from '../constants/employeeStatus.js';

export default function SubmissionsPage() {
  const { submissions, loading, validateSubmission, rejectSubmission } = useSubmissions();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [reviewId, setReviewId] = useState(null);
  const [validatingId, setValidatingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  const review = submissions.find((submission) => submission.id === reviewId) || null;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return submissions.filter((submission) => {
      const matchesTerm =
        !term ||
        [submission.employeeName, submission.email]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesStatus = !status || submission.status === status;
      return matchesTerm && matchesStatus;
    });
  }, [submissions, search, status]);

  const pendingCount = submissions.filter(
    (submission) => submission.status === SUBMISSION_STATUS.PENDING
  ).length;

  const handleValidate = async (submission) => {
    setValidatingId(submission.id);
    try {
      const result = await validateSubmission(submission.id);
      toast.success(
        result.created
          ? `${result.employee.fullName} was created as a current employee.`
          : `${result.employee.fullName}'s existing employee record was refreshed from the submission.`
      );
      setReviewId(null);
    } catch (error) {
      toast.error(error.message || 'The submission could not be validated.');
    } finally {
      setValidatingId(null);
    }
  };

  const handleReject = async (submission, reason) => {
    setRejectingId(submission.id);
    try {
      await rejectSubmission(submission.id, reason);
      toast.success(
        `${submission.employeeName}'s submission was rejected. The invitation is available for correction.`
      );
      setReviewId(null);
    } catch (error) {
      toast.error(error.message || 'The submission could not be rejected.');
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Employee Submissions"
        subtitle="Review profiles completed through employee self-service. Validation creates or updates a single current employee record and prevents duplicate people."
      />

      <div className="notice notice--info">
        <span className="notice__icon">
          <CheckCircle2 size={18} aria-hidden="true" />
        </span>
        <div className="notice__body">
          <div className="notice__title">{pendingCount} submission{pendingCount === 1 ? '' : 's'} awaiting HR validation</div>
          Open a submission to inspect the full profile and CV. A confirmation is required before
          saving a validated employee record.
        </div>
      </div>

      <div className="page-toolbar">
        <EmployeeSearch
          value={search}
          onChange={setSearch}
          label="Search submissions"
          placeholder="Search submissions by employee name or email…"
        />
        <EmployeeFilters
          filters={[
            {
              key: 'status',
              label: 'Statuses',
              placeholder: 'All Statuses',
              value: status,
              onChange: setStatus,
              options: SUBMISSION_STATUS_OPTIONS,
            },
          ]}
          onClear={() => {
            setSearch('');
            setStatus('');
          }}
        />
        <div className="page-toolbar__spacer" />
        <span className="filters-summary">
          {loading ? 'Loading submissions…' : `${filtered.length} submissions`}
        </span>
      </div>

      <SubmissionTable
        submissions={filtered}
        loading={loading}
        onView={(submission) => setReviewId(submission.id)}
        onValidate={handleValidate}
        onReject={handleReject}
        validatingId={validatingId}
        rejectingId={rejectingId}
      />

      <SubmissionReview
        open={Boolean(review)}
        submission={review}
        onClose={() => setReviewId(null)}
        onValidate={handleValidate}
        onReject={handleReject}
        validating={validatingId === review?.id}
        rejecting={rejectingId === review?.id}
      />

      {!loading && submissions.length === 0 && (
        <div className="notice notice--neutral">
          <span className="notice__icon">
            <FileText size={17} aria-hidden="true" />
          </span>
          <div className="notice__body">
            Submissions appear here after invited employees verify their email and complete their
            profile through the self-service onboarding screen.
          </div>
        </div>
      )}
    </div>
  );
}
