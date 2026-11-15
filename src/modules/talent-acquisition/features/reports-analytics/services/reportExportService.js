/**
 * Report export helpers. The same export model feeds both the Excel and the
 * PDF output, so the two always carry identical content and respect the
 * active report filters.
 *
 * Excel: a SpreadsheetML (.xls) workbook is generated — it opens natively in
 * Microsoft Excel, LibreOffice Calc and Google Sheets.
 * PDF: a print-ready document is rendered and the browser print dialog is
 * opened; the user picks "Save as PDF". No external service is contacted.
 */

export function buildReportExportModel(report) {
  const sections = [];
  const section = (title, rows) => sections.push({ title, rows });

  section('Filters applied', [
    ['Stage', report.filters?.stage || 'All'],
    ['Position', report.filters?.jobId || 'All'],
    ['Date from', report.filters?.dateFrom || 'All'],
    ['Date to', report.filters?.dateTo || 'All'],
    ['Generated', report.generatedAt],
  ]);

  section('Summary', [
    ['Metric', 'Value'],
    ['Total applications', report.summary.totalApplications],
    ['New applications', report.summary.newApplications],
    ['Under screening', report.summary.underScreening],
    ['Shortlisted', report.summary.shortlisted],
    ['Upcoming interviews', report.summary.upcomingInterviews],
    ['Selected', report.summary.selected],
    ['Rejected', report.summary.rejected],
    ['Pending approvals', report.summary.pendingApprovals],
    ['Offers sent', report.summary.offersSent],
  ]);

  section('Applications by position', [
    ['Position', 'Department', 'Openings', 'Applications', 'Shortlisted', 'Selected'],
    ...report.byPosition.map((row) => [
      row.title,
      row.department,
      row.openings,
      row.applications,
      row.shortlisted,
      row.selected,
    ]),
  ]);

  section('Screening report', [
    ['Measure', 'Value'],
    ['Screened', report.screeningStats.total],
    ['Passed', report.screeningStats.passed],
    ['Failed', report.screeningStats.failed],
    ['Pass rate %', report.screeningStats.passRate],
    ['Average score %', report.screeningStats.averageScore],
  ]);

  section('Shortlisting report', [
    ['Measure', 'Value'],
    ['Total', report.shortlistingStats.total],
    ['Shortlisted', report.shortlistingStats.shortlisted],
    ['On hold', report.shortlistingStats.onHold],
    ['Rejected', report.shortlistingStats.rejected],
    ['Shortlist rate %', report.shortlistingStats.shortlistRate],
  ]);

  section('Interview report', [
    ['Measure', 'Value'],
    ['Interviews', report.interviewStats.total],
    ['Scheduled', report.interviewStats.scheduled],
    ['Completed', report.interviewStats.completed],
    ['Cancelled', report.interviewStats.cancelled],
    ['Average rating /5', report.interviewStats.averageRating],
    ['Recommended', report.interviewStats.recommended],
  ]);

  section('Final selection report', [
    ['Measure', 'Value'],
    ['Selections', report.selectionStats.total],
    ['Selected', report.selectionStats.selected],
    ['Rejected', report.selectionStats.rejected],
    ['On hold', report.selectionStats.onHold],
    ['Submitted for approval', report.selectionStats.submitted],
  ]);

  section('Admin approval report', [
    ['Measure', 'Value'],
    ['Approvals', report.approvalStats.total],
    ['Pending', report.approvalStats.pending],
    ['Approved', report.approvalStats.approved],
    ['Rejected', report.approvalStats.rejected],
    ['Approval rate %', report.approvalStats.approvalRate],
  ]);

  section('Offer report', [
    ['Measure', 'Value'],
    ['Offers', report.offerStats.total],
    ['Draft', report.offerStats.draft],
    ['Sent', report.offerStats.sent],
    ['Accepted', report.offerStats.accepted],
    ['Declined', report.offerStats.declined],
    ['Acceptance rate %', report.offerStats.acceptanceRate],
    ['Average accepted package', report.offerStats.averagePackage],
  ]);

  section('Email activity report (simulated operations)', [
    ['Measure', 'Value'],
    ['Simulated emails recorded', report.emailActivity.total],
    ['Simulated offer letters', report.emailActivity.offerLetters],
    ['Simulated document requests', report.emailActivity.documentRequests],
    ['Simulated resubmission notices', report.emailActivity.resubmissions],
    ['Candidate acceptances (recorded response)', report.emailActivity.candidateResponses.accepted],
    ['Candidate declines (recorded response)', report.emailActivity.candidateResponses.declined],
  ]);

  section('Document submission report', [
    ['Measure', 'Value'],
    ['Requests created', report.documentSubmissionStats.requests],
    ['Awaiting submission', report.documentSubmissionStats.requested],
    ['Submitted', report.documentSubmissionStats.submitted],
    ['Resubmission required', report.documentSubmissionStats.resubmissionRequired],
    ['Submission rate %', report.documentSubmissionStats.submissionRate],
  ]);

  section('Document verification report', [
    ['Measure', 'Value'],
    ['Current documents submitted', report.documentVerificationStats.submitted],
    ['Verified', report.documentVerificationStats.verified],
    ['Awaiting verification', report.documentVerificationStats.awaitingVerification],
    ['Resubmission required', report.documentVerificationStats.resubmissionRequired],
    ['Verification rate %', report.documentVerificationStats.verificationRate],
    ['Resubmission rate %', report.documentVerificationStats.resubmissionRate],
  ]);

  section('Joining report', [
    ['Measure', 'Value'],
    ['Joinings', report.joiningStats.total],
    ['Documents pending', report.joiningStats.documentsPending],
    ['Verification in progress', report.joiningStats.verification],
    ['Ready to join', report.joiningStats.readyToJoin],
    ['Joined', report.joiningStats.joined],
    ['Joining completion rate %', report.joiningStats.completionRate],
  ]);

  section('Employee conversion report', [
    ['Measure', 'Value'],
    ['Joined', report.employeeConversionStats.joined],
    ['Handed over (imported)', report.employeeConversionStats.handedOver],
    ['Successful handover rate %', report.employeeConversionStats.handoverRate],
  ]);

  return {
    title: 'Ecometrix — Talent Acquisition Report',
    generatedAt: report.generatedAt,
    sections,
  };
}

/* ---------------------------------------------------------------
   Excel (SpreadsheetML 2003)
--------------------------------------------------------------- */

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rowToXml(row) {
  const cells = row
    .map((cell) => {
      const numeric = typeof cell === 'number' && Number.isFinite(cell);
      return numeric
        ? `<Cell><Data ss:Type="Number">${cell}</Data></Cell>`
        : `<Cell><Data ss:Type="String">${xmlEscape(cell)}</Data></Cell>`;
    })
    .join('');
  return `<Row>${cells}</Row>`;
}

export function buildExcelWorkbook(model) {
  const body = model.sections
    .map(
      (current) => `
   <Row><Cell ss:StyleID="section"><Data ss:Type="String">${xmlEscape(
     current.title,
   )}</Data></Cell></Row>
   ${current.rows.map(rowToXml).join('\n   ')}
   <Row></Row>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="title"><Font ss:Bold="1" ss:Size="14" ss:Color="#3F6212"/></Style>
  <Style ss:ID="meta"><Font ss:Color="#6B7280" ss:Size="9"/></Style>
  <Style ss:ID="section"><Font ss:Bold="1" ss:Size="11" ss:Color="#FFFFFF"/><Interior ss:Color="#7AB41B" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="Recruitment Report">
  <Table>
   <Column ss:Width="260"/><Column ss:Width="220"/><Column ss:Width="120"/><Column ss:Width="120"/><Column ss:Width="120"/><Column ss:Width="120"/>
   <Row><Cell ss:StyleID="title"><Data ss:Type="String">${xmlEscape(model.title)}</Data></Cell></Row>
   <Row><Cell ss:StyleID="meta"><Data ss:Type="String">Generated: ${xmlEscape(
     model.generatedAt,
   )} · Figures are calculated from the filtered Talent Acquisition records.</Data></Cell></Row>
   <Row></Row>
   ${body}
  </Table>
 </Worksheet>
</Workbook>`;
}

export function exportReportToExcel(report) {
  const model = buildReportExportModel(report);
  const workbook = buildExcelWorkbook(model);
  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, buildFileName(report, 'xls'));
}

/* ---------------------------------------------------------------
   PDF (print-rendered)
--------------------------------------------------------------- */

function htmlEscape(value) {
  return xmlEscape(value);
}

function rowToHtml(row) {
  const cells = row.map((cell) => `<td>${htmlEscape(cell)}</td>`).join('');
  return `<tr>${cells}</tr>`;
}

export function buildPdfDocument(model) {
  const sectionsHtml = model.sections
    .map(
      (current) => `
    <section>
      <h2>${htmlEscape(current.title)}</h2>
      <table>
        <tbody>${current.rows.map(rowToHtml).join('')}</tbody>
      </table>
    </section>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${htmlEscape(model.title)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", Arial, sans-serif;
    color: #1F2937;
    font-size: 10.5pt;
    margin: 0;
  }
  header {
    border-bottom: 3px solid #7AB41B;
    padding-bottom: 10px;
    margin-bottom: 16px;
  }
  .brand { font-size: 17pt; font-weight: 800; color: #3F6212; letter-spacing: -0.02em; }
  .doc { font-size: 12pt; font-weight: 700; margin-top: 2px; }
  .meta { font-size: 8pt; color: #6B7280; margin-top: 6px; }
  section { break-inside: avoid; margin-bottom: 14px; }
  h2 {
    font-size: 10pt; text-transform: uppercase; letter-spacing: 0.06em;
    color: #ffffff; background: #7AB41B; border-radius: 4px;
    padding: 4px 8px; margin: 0 0 6px;
  }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  td { border: 1px solid #E5E7EB; padding: 4px 7px; }
  tr:nth-child(even) td { background: #F9FAFB; }
  footer { margin-top: 18px; font-size: 7.5pt; color: #6B7280; border-top: 1px solid #E5E7EB; padding-top: 8px; }
</style>
</head>
<body>
  <header>
    <div class="brand">Ecometrix</div>
    <div class="doc">Talent Acquisition Report</div>
    <div class="meta">Generated: ${htmlEscape(model.generatedAt)} · Figures are calculated from the filtered Talent Acquisition records.</div>
  </header>
  ${sectionsHtml}
  <footer>
    Ecometrix HR — Talent Acquisition. Simulated email operations are not real deliveries.
    This document was produced from the recruitment records selected by the active filters.
  </footer>
</body>
</html>`;
}

export function printHtmlDocument(html) {
  const iframe = window.document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  window.document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  frameWindow.document.open();
  frameWindow.document.write(html);
  frameWindow.document.close();

  const cleanup = () => {
    window.setTimeout(() => {
      try {
        iframe.remove();
      } catch {
        // Already removed.
      }
    }, 1000);
  };

  frameWindow.focus();
  frameWindow.print();
  cleanup();
}

export function exportReportToPdf(report) {
  const model = buildReportExportModel(report);
  const html = buildPdfDocument(model);
  printHtmlDocument(html);
}

/* ---------------------------------------------------------------
   Shared helpers
--------------------------------------------------------------- */

function buildFileName(report, extension) {
  const stamp = new Date(report.generatedAt || Date.now())
    .toISOString()
    .slice(0, 10);
  return `ecometrix-recruitment-report-${stamp}.${extension}`;
}

export function downloadBlob(blob, fileName) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}
