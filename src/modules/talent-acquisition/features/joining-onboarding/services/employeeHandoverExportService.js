/**
 * Employee handover export helpers. Produces the same review document as the
 * conversion modal in Excel and PDF formats. Figures come from the same
 * mapped handover payload, so the export always matches what the databank
 * would receive.
 */
import {
  buildExcelWorkbook,
  buildPdfDocument,
  downloadBlob,
  printHtmlDocument,
} from '../../reports-analytics/services/reportExportService.js';
import { formatDate } from '../../../utils/formatDate.js';
import { formatSalary } from '../../../utils/formatCandidateData.js';

function buildHandoverExportModel(entry, payload) {
  const handover = entry.handover || {};
  const documents = Array.isArray(entry.documents) ? entry.documents : [];
  const education = Array.isArray(payload?.education) ? payload.education : [];
  const experienceHistory = Array.isArray(payload?.experienceHistory)
    ? payload.experienceHistory
    : [];

  const sections = [];
  const section = (title, rows) => sections.push({ title, rows });

  section('Handover summary', [
    ['Field', 'Value'],
    ['Handover reference', handover.handoverId || 'Not prepared'],
    ['Handover status', handover.status || 'not_ready'],
    ['Prepared on', handover.preparedAt ? formatDate(handover.preparedAt) : 'Not prepared'],
    ['Imported on', handover.importedAt ? formatDate(handover.importedAt) : 'Not imported'],
    ['Source', 'Talent Acquisition module'],
  ]);

  section('Candidate information', [
    ['Field', 'Value'],
    ['Full name', entry.candidate?.fullName || ''],
    ['Candidate ID', entry.candidate?.candidateId || ''],
    ['Application ID', entry.application?.applicationId || ''],
    ['Email', entry.candidate?.email || ''],
    ['Phone', entry.candidate?.phone || ''],
    ['Location', entry.candidate?.location || ''],
  ]);

  section('Employment information', [
    ['Field', 'Value'],
    ['Designation', entry.offer?.designation || ''],
    ['Department', entry.offer?.department || ''],
    ['Employment type', entry.offer?.employmentType || ''],
    ['Annual package', formatSalary(entry.offer?.salaryPackage)],
    ['Reporting manager', entry.offer?.reportingManager || 'To be assigned'],
    [
      'Joining date',
      formatDate(entry.joining?.joinedAt || entry.joining?.joiningDate || entry.offer?.joiningDate),
    ],
    ['Employment status', 'Current Employee'],
  ]);

  section('Education', [
    ['Qualification', 'Institution', 'Specialization', 'Passing year'],
    ...education.map((item) => [
      item.qualification || '',
      item.institution || '',
      item.specialization || '',
      item.passingYear || '',
    ]),
  ]);

  section('Experience', [
    ['Designation', 'Company', 'From', 'To', 'Responsibilities'],
    ...experienceHistory.map((item) => [
      item.designation || '',
      item.company || '',
      item.from || '',
      item.to || '',
      item.responsibilities || '',
    ]),
  ]);

  section('Documents', [
    ['File', 'Type', 'Status'],
    ...documents.map((document) => [
      document.fileName || 'Awaiting file',
      document.type || '',
      document.status || '',
    ]),
  ]);

  return {
    title: `Ecometrix — Employee Handover ${entry.candidate?.fullName || ''}`.trim(),
    generatedAt: new Date().toISOString(),
    sections,
  };
}

function buildFileName(entry, extension) {
  const stamp = new Date().toISOString().slice(0, 10);
  const candidateId = entry.candidate?.candidateId || 'candidate';
  const applicationId = entry.application?.applicationId || 'application';
  return `${candidateId}_${applicationId}_handover_${stamp}.${extension}`;
}

export function exportHandoverToExcel(entry, payload) {
  const model = buildHandoverExportModel(entry, payload);
  const workbook = buildExcelWorkbook(model);
  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, buildFileName(entry, 'xls'));
}

export function exportHandoverToPdf(entry, payload) {
  const model = buildHandoverExportModel(entry, payload);
  const html = buildPdfDocument(model);
  printHtmlDocument(html);
}
