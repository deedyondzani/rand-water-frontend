import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Brand colours (match desktop Java PDF export)
const NAVY   = [0, 51, 102];
const HEADER = [230, 240, 250];
const INC_BG = [210, 245, 235];
const OUT_BG = [220, 240, 255];
const ZEBRA  = [248, 249, 250];
const BORDER = [200, 200, 200];

/**
 * Export the Quality Data logsheet as a PDF matching the desktop
 * Rand Water form ZK OPS 02005 F (Revision 04, May 2025).
 */
export function exportQualityPDF({
  plantId,
  date,
  shiftType,
  shift,
  timeSlots,
  incomingLines,
  outgoingLines,
  readings,
  controllerName,
  controllerNumber,
  supervisorName,
  supervisorNumber,
  comments,
  processDosingRows,
  processDosingIncomingLines,
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 12;

  // ---- Title ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text('RAND WATER — QUALITY MANAGEMENT SYSTEM', pageW / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`${plantId.toUpperCase()} WATER QUALITY (${shiftType.toUpperCase()} SHIFT)`, pageW / 2, y, { align: 'center' });
  y += 5;

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date: ${date}    Shift: ${shift}`, pageW / 2, y, { align: 'center' });
  y += 5;

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Form No: ZK OPS 02005 F   |   Revision No: 04   |   Effective date: May 2025', pageW / 2, y, { align: 'center' });
  y += 8;

  // ---- Quality table ----
  const headRow1 = [{ content: 'Lines', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }];
  const headRow2 = [];
  timeSlots.forEach((t) => {
    headRow1.push({ content: t, colSpan: 2, styles: { halign: 'center', fillColor: HEADER } });
    headRow2.push({ content: 'Free Cl₂', styles: { halign: 'center', fillColor: HEADER, fontSize: 7 } });
    headRow2.push({ content: 'Mono', styles: { halign: 'center', fillColor: HEADER, fontSize: 7 } });
  });

  const body = [];

  // INCOMING banner
  body.push([
    {
      content: 'INCOMING',
      colSpan: 1 + timeSlots.length * 2,
      styles: { fillColor: INC_BG, fontStyle: 'bold', halign: 'center', textColor: NAVY },
    },
  ]);

  incomingLines.forEach((line, idx) => {
    const row = [line];
    timeSlots.forEach((time) => {
      row.push(readings[`${line}_${time}_free`] || '');
      row.push(readings[`${line}_${time}_mono`] || '');
    });
    body.push(row);
  });

  // OUTGOING banner
  if (outgoingLines.length > 0) {
    body.push([
      {
        content: 'OUTGOING',
        colSpan: 1 + timeSlots.length * 2,
        styles: { fillColor: OUT_BG, fontStyle: 'bold', halign: 'center', textColor: NAVY },
      },
    ]);
  }
  outgoingLines.forEach((line) => {
    const row = [line];
    timeSlots.forEach((time) => {
      row.push(readings[`${line}_${time}_free`] || '');
      row.push(readings[`${line}_${time}_mono`] || '');
    });
    body.push(row);
  });

  autoTable(doc, {
    startY: y,
    head: [headRow1, headRow2],
    body,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1, lineColor: BORDER, lineWidth: 0.1 },
    headStyles: { fillColor: HEADER, textColor: NAVY, fontStyle: 'bold', halign: 'center' },
    columnStyles: { 0: { fontStyle: 'bold', halign: 'center', cellWidth: 20 } },
    alternateRowStyles: { fillColor: ZEBRA },
    margin: { left: 10, right: 10 },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ---- Process Data section (same page as Quality grid) ----
  if (processDosingRows && processDosingIncomingLines && processDosingIncomingLines.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('Process Data', 15, y);
    y += 3;

    const dosingHeaders = [
      'Lines', 'Magflow', 'Free Cl2', 'Diff', 'Time',
      'Cl2 Req', 'Cl2 Act', 'Diff Cl2',
      'NH\u2083 Req\n(L/h)', 'NH\u2083 Act\n(L/h)', 'Diff NH\u2083',
    ];

    const dosingBody = processDosingIncomingLines.map((line) => [
      line,
      processDosingRows[`${line}_magflow`] || '',
      processDosingRows[`${line}_freeCl2`] || '',
      processDosingRows[`${line}_diffFree`] || '',
      processDosingRows[`${line}_time`]    || '',
      processDosingRows[`${line}_cl2Req`]  || '',
      processDosingRows[`${line}_cl2Act`]  || '',
      processDosingRows[`${line}_diffCl2`] || '',
      processDosingRows[`${line}_nh3Req`]  || '',
      processDosingRows[`${line}_nh3Act`]  || '',
      processDosingRows[`${line}_diffNh3`] || '',
    ]);

    autoTable(doc, {
      startY: y,
      head: [dosingHeaders],
      body: dosingBody,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1, lineColor: BORDER, lineWidth: 0.1, halign: 'center' },
      headStyles: { fillColor: HEADER, textColor: NAVY, fontStyle: 'bold', halign: 'center', fontSize: 7 },
      columnStyles: { 0: { fontStyle: 'bold', halign: 'center', cellWidth: 20 } },
      margin: { left: 10, right: 10 },
    });

    y = doc.lastAutoTable.finalY + 3;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text('Status: +X Above Chart  |  -X Below Chart  |  0.00 On Target', 15, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
  }

  // ---- Sign-offs ----
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Senior Process Controller', 15, y);
  doc.text('Senior Process Supervisor', pageW / 2 + 5, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Name: ${controllerName || '_________________________'}`, 15, y);
  doc.text(`Name: ${supervisorName || '_________________________'}`, pageW / 2 + 5, y);
  y += 4;
  doc.text(`ID: ${controllerNumber || '____________'}`, 15, y);
  doc.text(`ID: ${supervisorNumber || '____________'}`, pageW / 2 + 5, y);
  y += 4;
  doc.text('Signature: _________________________', 15, y);
  doc.text('Signature: _________________________', pageW / 2 + 5, y);
  y += 8;

  // ---- SPS Comments ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SPS Comments:', 15, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const commentLines = doc.splitTextToSize(comments || ' ', pageW - 30);
  doc.text(commentLines, 15, y);
  y += commentLines.length * 4 + 4;

  // ---- Footer ----
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Version 6.0 | Bolosh Tech', pageW - 10, y, { align: 'right' });

  // ---- Filename ----
  const cleanDate = date.replace(/[/:\s]/g, '-');
  const filename = `${plantId}_Quality_${cleanDate}_${shiftType.replace('-', '')}_${shift}.pdf`;
  doc.save(filename);
}

/**
 * Export the Process Dosing sheet as a PDF.
 */
export function exportProcessDosingPDF({
  plantId,
  date,
  shiftType,
  shift,
  incomingLines,
  rows,
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text('RAND WATER — PROCESS DOSING SHEET', pageW / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`${plantId.toUpperCase()} — INCOMING RAW WATER DOSING`, pageW / 2, y, { align: 'center' });
  y += 5;

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date: ${date}    Shift: ${shiftType} / ${shift}`, pageW / 2, y, { align: 'center' });
  y += 8;

  const headers = [
    'Lines', 'Magflow\n(m³/h)', 'Free Cl₂\n(mg/L)', 'Diff\n(1.9 - Cl₂)', 'Time',
    'Cl₂ Req\n(kg/h)', 'Cl₂ Act\n(kg/h)', 'Diff Cl₂',
    'NH₃ Req\n(L/h)', 'NH₃ Act\n(L/h)', 'Diff NH₃',
  ];

  const body = incomingLines.map((line) => [
    line,
    rows[`${line}_magflow`] || '',
    rows[`${line}_freeCl2`] || '',
    rows[`${line}_diffFree`] || '',
    rows[`${line}_time`] || '',
    rows[`${line}_cl2Req`] || '',
    rows[`${line}_cl2Act`] || '',
    rows[`${line}_diffCl2`] || '',
    rows[`${line}_nh3Req`] || '',
    rows[`${line}_nh3Act`] || '',
    rows[`${line}_diffNh3`] || '',
    rows[`${line}_comments`] || '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [headers],
    body,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.2, lineColor: BORDER, lineWidth: 0.1, halign: 'center' },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 7 },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 20 },
      11: { halign: 'left', cellWidth: 40 },
    },
    margin: { left: 10, right: 10 },
  });

  y = doc.lastAutoTable.finalY + 6;
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Status: +X Above Chart  |  -X Below Chart  |  0.00 On Target', 15, y);
  y += 5;
  doc.text('Version 6.0 | Bolosh Tech', pageW - 10, y, { align: 'right' });

  const cleanDate = date.replace(/[/:\s]/g, '-');
  const filename = `${plantId}_ProcessDosing_${cleanDate}_${shiftType.replace('-', '')}_${shift}.pdf`;
  doc.save(filename);
}
