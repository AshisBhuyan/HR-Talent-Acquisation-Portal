import { useState } from 'react';
import { BarChart3, Info } from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import { useToast } from '../../../shared/components/Toast.jsx';
import ReportFilters from '../features/reports-analytics/components/ReportFilters.jsx';
import FunnelChart from '../features/reports-analytics/components/FunnelChart.jsx';
import PositionTable from '../features/reports-analytics/components/PositionTable.jsx';
import useRecruitmentReports from '../features/reports-analytics/hooks/useRecruitmentReports.js';
import {
  exportReportToExcel,
  exportReportToPdf,
} from '../features/reports-analytics/services/reportExportService.js';
import { useTalentAcquisition } from '../context/TalentAcquisitionContext.jsx';
import { recruitmentMetricsMockData } from '../data/recruitmentMetricsMockData.js';
import '../styles/recruitmentReports.css';

function MetricCard({ label, value, meta }) {
  return (
    <div className="ta-metric">
      <div className="ta-metric__label">{label}</div>
      <div className="ta-metric__value">{value}</div>
      {meta && <div className="ta-metric__meta">{meta}</div>}
    </div>
  );
}

function StatRow({ items }) {
  return (
    <div className="ta-metric-grid">
      {items.map((item) => (
        <MetricCard key={item.label} label={item.label} value={item.value} meta={item.meta} />
      ))}
    </div>
  );
}

export default function RecruitmentReportsPage() {
  const toast = useToast();
  const { jobs } = useTalentAcquisition();
  const { filters, report, loading, error, jobOptions, updateFilter, resetFilters } =
    useRecruitmentReports(jobs);

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = () => {
    if (!report) return;

    setExporting(true);
    try {
      exportReportToExcel(report);
      toast.success('The recruitment report was exported as an Excel workbook.');
    } catch (exportError) {
      toast.error(exportError.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!report) return;

    setExporting(true);
    try {
      exportReportToPdf(report);
      toast.success('The print dialog opened. Choose "Save as PDF" to export the report.');
    } catch (exportError) {
      toast.error(exportError.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Ecometrix · Talent Acquisition"
        title="Reports & Analytics"
        subtitle="Recruitment figures calculated from the stored Talent Acquisition records. Every chart and table follows the selected filters."
        actions={
          <span className="filters-summary">
            <BarChart3 size={15} aria-hidden="true" />
            {report ? `Generated ${new Date(report.generatedAt).toLocaleString('en-GB')}` : 'Building report'}
          </span>
        }
      />

      {error && (
        <div className="notice notice--error" role="alert">
          <div className="notice__body">{error}</div>
        </div>
      )}

      <div className="notice notice--info">
        <span className="notice__icon">
          <Info size={18} aria-hidden="true" />
        </span>
        <div className="notice__body">
          <div className="notice__title">{recruitmentMetricsMockData.label}</div>
          {recruitmentMetricsMockData.note}
        </div>
      </div>

      <ReportFilters
        filters={filters}
        jobOptions={jobOptions}
        loading={loading || exporting}
        onChange={updateFilter}
        onReset={resetFilters}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
      />

      {loading && !report ? (
        <div className="card">
          <div className="loading-block">
            <span className="spinner" aria-hidden="true" />
            Building the recruitment report…
          </div>
        </div>
      ) : (
        report && (
          <>
            <StatRow
              items={[
                {
                  label: 'Total applications',
                  value: report.summary.totalApplications,
                  meta: 'In the selected scope',
                },
                {
                  label: 'New applications',
                  value: report.summary.newApplications,
                  meta: 'Awaiting screening',
                },
                {
                  label: 'Under screening',
                  value: report.summary.underScreening,
                  meta: 'CV screening in progress',
                },
                {
                  label: 'Shortlisted',
                  value: report.summary.shortlisted,
                  meta: 'Ready for interview',
                },
                {
                  label: 'Selected',
                  value: report.summary.selected,
                  meta: 'Joined the organisation',
                },
                {
                  label: 'Rejected',
                  value: report.summary.rejected,
                  meta: 'Closed applications',
                },
              ]}
            />

            <div className="ta-dashboard-grid">
              <section className="card">
                <div className="card__header">
                  <div>
                    <div className="card__title">Recruitment funnel</div>
                    <div className="card__subtitle">Applications per recruitment stage</div>
                  </div>
                </div>
                <div className="card__body">
                  <FunnelChart
                    stages={report.stageDistribution}
                    total={report.summary.totalApplications}
                  />
                </div>
              </section>

              <section className="card">
                <div className="card__header">
                  <div>
                    <div className="card__title">Stage conversion</div>
                    <div className="card__subtitle">Share of applications per stage</div>
                  </div>
                </div>
                <div className="card__body">
                  <ul className="ta-bar-list">
                    {report.stageDistribution.map((stage) => (
                      <li className="ta-bar-list__item" key={stage.key}>
                        <div className="ta-bar-list__head">
                          <span className="ta-bar-list__label">{stage.label}</span>
                          <span className="ta-bar-list__value">{stage.percentage}%</span>
                        </div>
                        <div className="ta-bar-list__track" aria-hidden="true">
                          <span
                            className="ta-bar-list__bar"
                            style={{ width: `${stage.percentage}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>

            <section className="card">
              <div className="card__header">
                <div>
                  <div className="card__title">Applications by position</div>
                  <div className="card__subtitle">Volume and conversion per open position</div>
                </div>
              </div>
              <div className="card__body">
                <PositionTable positions={report.byPosition} loading={loading} />
              </div>
            </section>

            <div className="ta-dashboard-grid">
              <section className="card">
                <div className="card__header">
                  <div>
                    <div className="card__title">Screening statistics</div>
                    <div className="card__subtitle">CV screening outcomes</div>
                  </div>
                </div>
                <div className="card__body">
                  <StatRow
                    items={[
                      { label: 'Screened', value: report.screeningStats.total },
                      { label: 'Pending', value: report.screeningStats.pending },
                      { label: 'Passed', value: report.screeningStats.passed },
                      { label: 'Failed', value: report.screeningStats.failed },
                      { label: 'Pass rate', value: `${report.screeningStats.passRate}%` },
                      {
                        label: 'Average score',
                        value: `${report.screeningStats.averageScore}%`,
                      },
                    ]}
                  />
                </div>
              </section>

              <section className="card">
                <div className="card__header">
                  <div>
                    <div className="card__title">Shortlisting statistics</div>
                    <div className="card__subtitle">Shortlist decisions</div>
                  </div>
                </div>
                <div className="card__body">
                  <StatRow
                    items={[
                      { label: 'Shortlist records', value: report.shortlistingStats.total },
                      { label: 'Shortlisted', value: report.shortlistingStats.shortlisted },
                      { label: 'On hold', value: report.shortlistingStats.onHold },
                      { label: 'Rejected', value: report.shortlistingStats.rejected },
                      {
                        label: 'Shortlist rate',
                        value: `${report.shortlistingStats.shortlistRate}%`,
                      },
                    ]}
                  />
                </div>
              </section>
            </div>

            <div className="ta-dashboard-grid">
              <section className="card">
                <div className="card__header">
                  <div>
                    <div className="card__title">Interview statistics</div>
                    <div className="card__subtitle">Rounds and feedback</div>
                  </div>
                </div>
                <div className="card__body">
                  <StatRow
                    items={[
                      { label: 'Interviews', value: report.interviewStats.total },
                      { label: 'Scheduled', value: report.interviewStats.scheduled },
                      { label: 'Completed', value: report.interviewStats.completed },
                      { label: 'Cancelled', value: report.interviewStats.cancelled },
                      {
                        label: 'Average rating',
                        value: `${report.interviewStats.averageRating}/5`,
                      },
                      { label: 'Recommended', value: report.interviewStats.recommended },
                    ]}
                  />
                </div>
              </section>

              <section className="card">
                <div className="card__header">
                  <div>
                    <div className="card__title">Selection and approval statistics</div>
                    <div className="card__subtitle">HR decisions and admin approvals</div>
                  </div>
                </div>
                <div className="card__body">
                  <StatRow
                    items={[
                      { label: 'Selections', value: report.selectionStats.total },
                      { label: 'Selected', value: report.selectionStats.selected },
                      { label: 'Submitted for approval', value: report.selectionStats.submitted },
                      { label: 'Approvals', value: report.approvalStats.total },
                      { label: 'Pending approval', value: report.approvalStats.pending },
                      {
                        label: 'Approval rate',
                        value: `${report.approvalStats.approvalRate}%`,
                      },
                    ]}
                  />
                </div>
              </section>
            </div>

            <div className="ta-dashboard-grid">
              <section className="card">
                <div className="card__header">
                  <div>
                    <div className="card__title">Offer statistics</div>
                    <div className="card__subtitle">Offer lifecycle and acceptance</div>
                  </div>
                </div>
                <div className="card__body">
                  <StatRow
                    items={[
                      { label: 'Offers', value: report.offerStats.total },
                      { label: 'Draft', value: report.offerStats.draft },
                      { label: 'Sent', value: report.offerStats.sent },
                      { label: 'Accepted', value: report.offerStats.accepted },
                      { label: 'Declined', value: report.offerStats.declined },
                      {
                        label: 'Acceptance rate',
                        value: `${report.offerStats.acceptanceRate}%`,
                      },
                    ]}
                  />
                </div>
              </section>

              <section className="card">
                <div className="card__header">
                  <div>
                    <div className="card__title">Joining statistics</div>
                    <div className="card__subtitle">Joining progress and handover</div>
                  </div>
                </div>
                <div className="card__body">
                  <StatRow
                    items={[
                      { label: 'Joinings', value: report.joiningStats.total },
                      { label: 'Documents pending', value: report.joiningStats.documentsPending },
                      { label: 'Verification', value: report.joiningStats.verification },
                      { label: 'Ready to join', value: report.joiningStats.readyToJoin },
                      { label: 'Joined', value: report.joiningStats.joined },
                      {
                        label: 'Joining completion rate',
                        value: `${report.joiningStats.completionRate}%`,
                      },
                      { label: 'Handed over', value: report.joiningStats.handedOver },
                      {
                        label: 'Handover rate',
                        value: `${report.joiningStats.handoverRate}%`,
                      },
                    ]}
                  />
                </div>
              </section>
            </div>

            <div className="ta-dashboard-grid">
              <section className="card">
                <div className="card__header">
                  <div>
                    <div className="card__title">Document submission report</div>
                    <div className="card__subtitle">Requests sent after offer acceptance</div>
                  </div>
                </div>
                <div className="card__body">
                  <StatRow
                    items={[
                      { label: 'Requests created', value: report.documentSubmissionStats.requests },
                      { label: 'Awaiting submission', value: report.documentSubmissionStats.requested },
                      { label: 'Submitted', value: report.documentSubmissionStats.submitted },
                      {
                        label: 'Resubmission required',
                        value: report.documentSubmissionStats.resubmissionRequired,
                      },
                      {
                        label: 'Submission rate',
                        value: `${report.documentSubmissionStats.submissionRate}%`,
                      },
                    ]}
                  />
                </div>
              </section>

              <section className="card">
                <div className="card__header">
                  <div>
                    <div className="card__title">Document verification report</div>
                    <div className="card__subtitle">HR verification outcomes (current versions)</div>
                  </div>
                </div>
                <div className="card__body">
                  <StatRow
                    items={[
                      {
                        label: 'Documents submitted',
                        value: report.documentVerificationStats.submitted,
                      },
                      { label: 'Verified', value: report.documentVerificationStats.verified },
                      {
                        label: 'Awaiting verification',
                        value: report.documentVerificationStats.awaitingVerification,
                      },
                      {
                        label: 'Resubmission required',
                        value: report.documentVerificationStats.resubmissionRequired,
                      },
                      {
                        label: 'Verification rate',
                        value: `${report.documentVerificationStats.verificationRate}%`,
                      },
                      {
                        label: 'Resubmission rate',
                        value: `${report.documentVerificationStats.resubmissionRate}%`,
                      },
                    ]}
                  />
                </div>
              </section>
            </div>

            <div className="ta-dashboard-grid">
              <section className="card">
                <div className="card__header">
                  <div>
                    <div className="card__title">Email activity report</div>
                    <div className="card__subtitle">
                      Simulated operations — nothing is delivered to real inboxes
                    </div>
                  </div>
                </div>
                <div className="card__body">
                  <StatRow
                    items={[
                      { label: 'Simulated emails', value: report.emailActivity.total },
                      { label: 'Offer letters', value: report.emailActivity.offerLetters },
                      { label: 'Document requests', value: report.emailActivity.documentRequests },
                      { label: 'Resubmission notices', value: report.emailActivity.resubmissions },
                      {
                        label: 'Candidate acceptances',
                        value: report.emailActivity.candidateResponses.accepted,
                      },
                      {
                        label: 'Candidate declines',
                        value: report.emailActivity.candidateResponses.declined,
                      },
                    ]}
                  />
                </div>
              </section>

              <section className="card">
                <div className="card__header">
                  <div>
                    <div className="card__title">Employee conversion report</div>
                    <div className="card__subtitle">
                      Joined candidates converted into the Employee Databank
                    </div>
                  </div>
                </div>
                <div className="card__body">
                  <StatRow
                    items={[
                      { label: 'Joined', value: report.employeeConversionStats.joined },
                      {
                        label: 'Handed over',
                        value: report.employeeConversionStats.handedOver,
                      },
                      {
                        label: 'Successful handover rate',
                        value: `${report.employeeConversionStats.handoverRate}%`,
                      },
                    ]}
                  />
                </div>
              </section>
            </div>
          </>
        )
      )}
    </div>
  );
}
