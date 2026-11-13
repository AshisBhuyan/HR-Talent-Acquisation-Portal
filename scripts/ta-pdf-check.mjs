/**
 * Validates the demonstration document that the candidate document service
 * generates: the xref offsets must point at the real object headers.
 */
global.window = global.window || {};
globalThis.URL = {
  createObjectURL: (blob) => {
    global.__blob = blob;
    return 'blob:mock';
  },
  revokeObjectURL: () => {},
};

const service = (await import('../src/modules/talent-acquisition/features/candidate-documents/services/candidateDocumentService.js')).default;

const document = {
  documentId: 'DOC-0001-1',
  type: 'cv',
  fileName: 'Ananya_Rao_CV.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 284912,
  uploadedAt: new Date().toISOString(),
};

const candidate = {
  candidateId: 'CAND-0001',
  fullName: 'Ananya Rao',
  skills: ['React', 'JavaScript'],
};

const job = { jobId: 'JOB-1001', title: 'Senior Frontend Engineer' };

const url = service.getPreviewUrl(document, { candidate, job });
const blob = global.__blob;
const buffer = Buffer.from(await blob.arrayBuffer());
const text = buffer.toString('latin1');

console.log('blob type   :', blob.type);
console.log('bytes       :', buffer.length);
console.log('header      :', text.slice(0, 8));
console.log('eof         :', text.trimEnd().endsWith('%%EOF'));

const xrefOffset = Number(text.slice(text.lastIndexOf('startxref') + 9).trim().split(/\s+/)[0]);
console.log('startxref   :', xrefOffset, text.slice(xrefOffset, xrefOffset + 4));

const xrefBlock = text.slice(xrefOffset);
const entries = [...xrefBlock.matchAll(/(\d{10}) 00000 n/g)].map((match) => Number(match[1]));
console.log('xref entries:', entries.length);

let valid = true;
entries.forEach((offset, index) => {
  const expected = `${index + 1} 0 obj`;
  const actual = text.slice(offset, offset + expected.length);
  if (actual !== expected) {
    valid = false;
    console.log(`  MISMATCH object ${index + 1} at ${offset} → "${actual}"`);
  }
});

const streamMatch = text.match(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/);
if (!streamMatch) {
  valid = false;
  console.log('  content stream not found');
} else {
  const declared = Number(streamMatch[1]);
  const actual = streamMatch[2].length;
  console.log('stream len  :', declared, 'actual', actual, declared === actual ? 'OK' : 'MISMATCH');
  if (declared !== actual) valid = false;
}

console.log(valid ? '\nPDF structure is valid' : '\nPDF structure is INVALID');
if (!valid) process.exitCode = 1;
