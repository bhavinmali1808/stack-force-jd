const { json2csv } = require('json-2-csv');
const PDFDocument = require('pdfkit');

/**
 * Build CSV string from ranked candidate list.
 */
const exportCSV = async (candidates, role) => {
  const rows = candidates.map((c, i) => ({
    Rank: i + 1,
    Name: c.name,
    Email: c.email,
    Phone: c.phone || '',
    'Match Score (%)': c.matchScore,
    'Matched Skills': c.matchedSkills.join(', '),
    'Missing Skills': c.missingSkills.join(', '),
    'Extracted Skills': c.extractedSkills.join(', '),
    Status: c.status,
    'Applied On': new Date(c.createdAt).toLocaleDateString('en-IN'),
  }));

  return json2csv(rows);
};

/**
 * Build PDF buffer from ranked candidate list.
 */
const exportPDF = (candidates, role) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc
      .fontSize(20)
      .fillColor('#1a1a2e')
      .text('TalentForce JD — Shortlist Report', { align: 'center' });

    doc.moveDown(0.5);
    doc
      .fontSize(13)
      .fillColor('#3B82F6')
      .text(`Role: ${role.title}`, { align: 'center' });

    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor('#555')
      .text(`Generated: ${new Date().toLocaleString('en-IN')}  |  Total Candidates: ${candidates.length}`, {
        align: 'center',
      });

    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#3B82F6').stroke();
    doc.moveDown(0.5);

    // Candidates
    candidates.forEach((c, i) => {
      const scoreColor = c.matchScore >= 80 ? '#10B981' : c.matchScore >= 50 ? '#F59E0B' : '#F43F5E';

      doc.fontSize(12).fillColor('#111').text(`#${i + 1}  ${c.name}`, { continued: true });
      doc.fillColor(scoreColor).text(`   ${c.matchScore}% match`, { align: 'right' });

      doc
        .fontSize(9)
        .fillColor('#555')
        .text(`Email: ${c.email || '—'}   |   Status: ${c.status}   |   Applied: ${new Date(c.createdAt).toLocaleDateString('en-IN')}`);

      if (c.matchedSkills.length) {
        doc.fillColor('#10B981').text(`✓ Matched: ${c.matchedSkills.join(', ')}`);
      }
      if (c.missingSkills.length) {
        doc.fillColor('#F43F5E').text(`✗ Missing: ${c.missingSkills.join(', ')}`);
      }

      doc.moveDown(0.3);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke();
      doc.moveDown(0.3);
    });

    doc.end();
  });
};

module.exports = { exportCSV, exportPDF };
