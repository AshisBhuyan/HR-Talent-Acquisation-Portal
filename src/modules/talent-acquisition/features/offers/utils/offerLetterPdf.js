import { formatDate } from '../../../utils/formatDate.js';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 52;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_TOP = 64;

const COLORS = {
  ink: [0.13, 0.16, 0.2],
  muted: [0.42, 0.46, 0.52],
  rule: [0.84, 0.87, 0.89],
  soft: [0.955, 0.975, 0.94],
  green: [0.45, 0.72, 0.18],
  greenDark: [0.28, 0.46, 0.11],
  orange: [0.97, 0.58, 0.11],
};

const COMPANY = {
  legalName: 'Ecometrix Technologies Pvt. Ltd.',
  name: 'Ecometrix',
  address: 'DLF Cyber City, BBSR, Odisha, India',
  function: 'Talent Acquisition - Human Resources',
};

const ASCII_REPLACEMENTS = {
  '₹': 'INR ',
  '–': '-',
  '—': '-',
  '·': '-',
  '’': "'",
  '‘': "'",
  '“': '"',
  '”': '"',
  '…': '...',
  '\u00a0': ' ',
};

function num(value) {
  return String(Math.round(value * 1000) / 1000);
}

function rgb(color) {
  return color.map(num).join(' ');
}

function sanitize(value = '') {
  return String(value ?? '')
    .replace(/[^\x00-\x7F]/g, (char) => ASCII_REPLACEMENTS[char] ?? '?')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapePdf(value) {
  return sanitize(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function approximateWidth(value, size, bold = false) {
  return sanitize(value).length * size * (bold ? 0.54 : 0.5);
}

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 'Not specified';
  return `INR ${amount.toLocaleString('en-IN')} per annum`;
}

function formatDateValue(value) {
  return formatDate(value, 'Not specified');
}

function buildContent({ offer, candidate, job, hasLogo }) {
  const pages = [];
  const positionReference = job?.jobId || offer.jobId;
  let ops = [];
  let y = PAGE_HEIGHT - MARGIN;
  let pageNumber = 0;

  const startPage = (continuation) => {
    ops = [];
    pages.push(ops);
    pageNumber += 1;
    y = PAGE_HEIGHT - MARGIN;

    if (continuation) {
      ops.push(
        `BT /F2 11 Tf ${rgb(COLORS.greenDark)} rg ${num(MARGIN)} ${num(y)} Td (${escapePdf(
          `${COMPANY.name} - Offer of Employment`
        )}) Tj ET`
      );
      ops.push(
        `BT /F1 8 Tf ${rgb(COLORS.muted)} rg ${num(
          PAGE_WIDTH - MARGIN - 140
        )} ${num(y)} Td (${escapePdf(`Reference: ${offer.offerId}`)}) Tj ET`
      );
      y -= 8;
      ops.push(
        `${rgb(COLORS.green)} RG 1 w ${num(MARGIN)} ${num(y)} m ${num(
          PAGE_WIDTH - MARGIN
        )} ${num(y)} l S`
      );
      y -= 24;
    }
  };

  const ensureSpace = (height) => {
    if (y - height < FOOTER_TOP + 22) startPage(true);
  };

  const text = (value, x, baseline, options = {}) => {
    const { size = 10, bold = false, color = COLORS.ink } = options;
    const clean = sanitize(value);
    if (!clean) return;
    ops.push(
      `BT /${bold ? 'F2' : 'F1'} ${num(size)} Tf ${rgb(color)} rg ${num(x)} ${num(
        baseline
      )} Td (${escapePdf(clean)}) Tj ET`
    );
  };

  const rightText = (value, baseline, options = {}) => {
    const size = options.size ?? 10;
    const width = approximateWidth(value, size, options.bold);
    text(value, PAGE_WIDTH - MARGIN - width, baseline, options);
  };

  const line = (x1, y1, x2, y2, options = {}) => {
    const { color = COLORS.rule, width = 0.7 } = options;
    ops.push(
      `${rgb(color)} RG ${num(width)} w ${num(x1)} ${num(y1)} m ${num(x2)} ${num(
        y2
      )} l S`
    );
  };

  const rect = (x, top, width, height, color) => {
    ops.push(
      `${rgb(color)} rg ${num(x)} ${num(top - height)} ${num(width)} ${num(
        height
      )} re f`
    );
  };

  const wrap = (value, maxWidth, size, bold = false) => {
    const words = sanitize(value).split(' ').filter(Boolean);
    const maxChars = Math.max(
      14,
      Math.floor(maxWidth / (size * (bold ? 0.54 : 0.5)))
    );
    const lines = [];
    let current = '';

    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= maxChars) {
        current = next;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  };

  const paragraph = (value, options = {}) => {
    const { size = 9.4, lineHeight = 13.5, color = COLORS.ink, gap = 10 } = options;
    wrap(value, CONTENT_WIDTH, size).forEach((item) => {
      ensureSpace(lineHeight);
      text(item, MARGIN, y, { size, color });
      y -= lineHeight;
    });
    y -= gap;
  };

  startPage(false);

  const headerTop = PAGE_HEIGHT - MARGIN;
  const logoSize = 58;

  if (hasLogo) {
    ops.push(
      `q ${logoSize} 0 0 ${logoSize} ${num(MARGIN)} ${num(
        headerTop - logoSize
      )} cm /Logo Do Q`
    );
  }

  const brandX = hasLogo ? MARGIN + 72 : MARGIN;
  text(COMPANY.name, brandX, headerTop - 20, {
    size: 21,
    bold: true,
    color: COLORS.greenDark,
  });
  text(COMPANY.function, brandX, headerTop - 35, {
    size: 8.6,
    color: COLORS.muted,
  });
  text(COMPANY.address, brandX, headerTop - 47, {
    size: 8.6,
    color: COLORS.muted,
  });

  const metaX = PAGE_WIDTH - MARGIN - 160;
  line(metaX - 12, headerTop - 4, metaX - 12, headerTop - 58, {
    color: COLORS.rule,
    width: 0.7,
  });
  text('OFFER REFERENCE', metaX, headerTop - 18, {
    size: 6.6,
    bold: true,
    color: COLORS.muted,
  });
  rightText(offer.offerId, headerTop - 18, { size: 9.2, bold: true });
  text('DATE', metaX, headerTop - 37, {
    size: 6.6,
    bold: true,
    color: COLORS.muted,
  });
  rightText(formatDateValue(offer.createdAt), headerTop - 37, { size: 9 });
  if (positionReference) {
    text('POSITION REFERENCE', metaX, headerTop - 56, {
      size: 6.6,
      bold: true,
      color: COLORS.muted,
    });
    rightText(positionReference, headerTop - 56, { size: 9 });
  }

  y = headerTop - 80;
  line(MARGIN, y, PAGE_WIDTH - MARGIN, y, { color: COLORS.green, width: 1.4 });
  line(MARGIN, y, MARGIN + 74, y, { color: COLORS.orange, width: 2.6 });

  y -= 22;
  text('PREPARED FOR', MARGIN, y, { size: 7, bold: true, color: COLORS.muted });
  y -= 15;
  text(candidate.fullName, MARGIN, y, { size: 11.5, bold: true });
  y -= 12;
  if (candidate.location) {
    text(candidate.location, MARGIN, y, { size: 9 });
    y -= 11;
  }
  const contact = [candidate.email, candidate.phone].filter(Boolean).join('  |  ');
  if (contact) {
    text(contact, MARGIN, y, { size: 8.6, color: COLORS.muted });
    y -= 10;
  }

  y -= 10;
  text('Sub: Offer of Employment', MARGIN, y, {
    size: 11,
    bold: true,
    color: COLORS.greenDark,
  });
  y -= 15;
  text(
    `Position: ${offer.designation || 'Not specified'}${
      positionReference ? ` (Ref: ${positionReference})` : ''
    }`,
    MARGIN,
    y,
    {
      size: 9.4,
      color: COLORS.muted,
    }
  );
  y -= 18;
  text(`Dear ${candidate.fullName},`, MARGIN, y, { size: 10 });
  y -= 17;

  paragraph(
    `We are pleased to offer you the position of ${offer.designation || 'the advertised role'} in the ${
      offer.department || 'assigned'
    } department at ${COMPANY.name}. This offer is based on our discussions with you and reflects our confidence in your experience and potential.`,
    { gap: 10 }
  );
  paragraph(
    `Your appointment will be governed by the terms below and by the policies of ${COMPANY.legalName} applicable from time to time. Please read the details carefully.`,
    { gap: 12 }
  );

  const rows = [
    ['Designation', offer.designation || 'Not specified'],
    ['Department', offer.department || 'Not specified'],
    ['Employment type', offer.employmentType || 'Not specified'],
    ['Annual compensation', formatMoney(offer.salaryPackage)],
    ['Date of joining', formatDateValue(offer.joiningDate)],
    ['Reporting manager', offer.reportingManager || 'To be assigned'],
  ];

  const rowHeight = 20;
  ensureSpace(rows.length * rowHeight + 40);
  text('APPOINTMENT AND COMPENSATION', MARGIN, y, {
    size: 8.2,
    bold: true,
    color: COLORS.greenDark,
  });
  y -= 12;

  const tableTop = y;
  rows.forEach(([label, value], index) => {
    const top = tableTop - index * rowHeight;
    if (index % 2 === 0) rect(MARGIN, top, CONTENT_WIDTH, rowHeight, COLORS.soft);
    text(label, MARGIN + 10, top - 13, { size: 8.4, color: COLORS.muted });
    text(value, MARGIN + 180, top - 13, { size: 9.3 });
  });
  y = tableTop - rows.length * rowHeight - 14;

  if (offer.additionalTerms) {
    ensureSpace(40);
    text('ADDITIONAL TERMS', MARGIN, y, {
      size: 8.2,
      bold: true,
      color: COLORS.greenDark,
    });
    y -= 13;
    paragraph(offer.additionalTerms, { size: 9.1, lineHeight: 13.5, gap: 12 });
  }

  ensureSpace(40);
  text('ACCEPTANCE', MARGIN, y, {
    size: 8.2,
    bold: true,
    color: COLORS.greenDark,
  });
  y -= 13;
  paragraph(
    `To accept this offer, please confirm your acceptance through the secure offer response link shared in your offer email${
      offer.expiryDate ? ` on or before ${formatDateValue(offer.expiryDate)}` : ''
    }. Until accepted, this offer remains subject to the terms stated above.`,
    { size: 9.1, lineHeight: 13.5, gap: 8 }
  );
  paragraph(
    'We look forward to welcoming you to Ecometrix and wish you a long and rewarding association with us.',
    { size: 9.1, lineHeight: 13.5, gap: 0 }
  );

  ensureSpace(86);
  const signatureTop = y - 10;
  text('For Ecometrix Technologies Pvt. Ltd.', MARGIN, signatureTop, {
    size: 9.6,
    bold: true,
  });
  line(MARGIN, signatureTop - 26, MARGIN + 170, signatureTop - 26, {
    color: COLORS.ink,
    width: 0.7,
  });
  text('HR Administrator', MARGIN, signatureTop - 39, { size: 9 });
  text('Authorised Signatory', MARGIN, signatureTop - 50, {
    size: 8,
    color: COLORS.muted,
  });
  rightText(`Date: ${formatDateValue(offer.createdAt)}`, signatureTop - 39, {
    size: 9,
    color: COLORS.muted,
  });
  y = signatureTop - 62;

  const totalPages = pages.length;
  pages.forEach((pageOps, index) => {
    const previous = ops;
    ops = pageOps;
    line(MARGIN, FOOTER_TOP, PAGE_WIDTH - MARGIN, FOOTER_TOP, {
      color: COLORS.rule,
      width: 0.6,
    });
    text(`${COMPANY.legalName} | ${COMPANY.address}`, MARGIN, FOOTER_TOP - 13, {
      size: 7.4,
      color: COLORS.muted,
    });
    text(
      `This offer is confidential and intended solely for ${candidate.fullName}.`,
      MARGIN,
      FOOTER_TOP - 24,
      { size: 7.4, color: COLORS.muted }
    );
    rightText(`Page ${index + 1} of ${totalPages}`, FOOTER_TOP - 24, {
      size: 7.4,
      color: COLORS.muted,
    });
    ops = previous;
  });

  return pages.map((pageOps) => pageOps.join('\n'));
}

async function loadLogo() {
  const base = (import.meta.env && import.meta.env.BASE_URL) || '/';
  const response = await fetch(`${base}assets/ecometrix-logo.png`);
  if (!response.ok) throw new Error('The Ecometrix logo could not be loaded.');

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise((resolve, reject) => {
      const node = new Image();
      node.onload = () => resolve(node);
      node.onerror = () => reject(new Error('The Ecometrix logo could not be read.'));
      node.src = objectUrl;
    });

    const size = 320;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size, size);

    const scale = Math.min(size / image.width, size / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    const binary = atob(dataUrl.split(',')[1]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return { bytes, width: size, height: size };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function encode(value) {
  return new TextEncoder().encode(value);
}

function createPdfBlob(pageContents, logo) {
  const pageCount = pageContents.length;
  const fontOne = 3 + pageCount * 2;
  const fontTwo = fontOne + 1;
  const logoObject = fontTwo + 1;

  const objects = [];
  objects.push({ dict: '<< /Type /Catalog /Pages 2 0 R >>' });

  const kids = pageContents.map((_, index) => `${3 + index * 2} 0 R`).join(' ');
  objects.push({ dict: `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>` });

  pageContents.forEach((content, index) => {
    const resources = `<< /Font << /F1 ${fontOne} 0 R /F2 ${fontTwo} 0 R >>${
      logo ? ` /XObject << /Logo ${logoObject} 0 R >>` : ''
    } >>`;
    objects.push({
      dict: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(
        PAGE_WIDTH
      )} ${num(PAGE_HEIGHT)}] /Resources ${resources} /Contents ${
        4 + index * 2
      } 0 R >>`,
    });
    objects.push({ dict: '<< >>', stream: encode(content) });
  });

  objects.push({
    dict: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  });
  objects.push({
    dict: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  });

  if (logo) {
    objects.push({
      dict: `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode >>`,
      stream: logo.bytes,
    });
  }

  const chunks = [];
  const offsets = [];
  let length = 0;

  const push = (value) => {
    const bytes = typeof value === 'string' ? encode(value) : value;
    chunks.push(bytes);
    length += bytes.length;
  };

  push('%PDF-1.4\n');
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  objects.forEach((object, index) => {
    offsets[index + 1] = length;
    push(`${index + 1} 0 obj\n`);
    if (object.stream) {
      const dict = object.dict.replace(/>>\s*$/, '');
      push(`${dict} /Length ${object.stream.length} >>\nstream\n`);
      push(object.stream);
      push('\nendstream\nendobj\n');
    } else {
      push(`${object.dict}\nendobj\n`);
    }
  });

  const xrefOffset = length;
  push(`xref\n0 ${objects.length + 1}\n`);
  push('0000000000 65535 f \n');
  for (let index = 1; index <= objects.length; index += 1) {
    push(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`);
  }
  push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  return new Blob(chunks, { type: 'application/pdf' });
}

function resolveFileName(offer, candidate) {
  const fallback = `Offer_${String(candidate?.fullName || 'Candidate')
    .trim()
    .replace(/\s+/g, '_')}.pdf`;
  const name = String(offer?.offerLetterName || fallback).trim();
  return /\.pdf$/i.test(name) ? name : `${name.replace(/\.pdf$/i, '')}.pdf`;
}

/**
 * Builds a print-ready A4 offer letter PDF with the Ecometrix logo embedded.
 * Everything is generated in the browser; no external service is contacted.
 */
export async function buildOfferLetterPdf(entry) {
  const { offer, candidate, job } = entry;

  let logo = null;
  try {
    logo = await loadLogo();
  } catch {
    // The letter is still generated without the logo if the asset cannot be
    // read (for example when the browser blocks canvas access).
    logo = null;
  }

  const pageContents = buildContent({
    offer,
    candidate,
    job,
    hasLogo: Boolean(logo),
  });

  return {
    blob: createPdfBlob(pageContents, logo),
    fileName: resolveFileName(offer, candidate),
  };
}

export default buildOfferLetterPdf;
