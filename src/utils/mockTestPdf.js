import jsPDF from "jspdf";

/**
 * Helper function to format value or return "-" if missing
 */
const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

/**
 * Helper function to format date
 */
const formatDate = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '-';
  }
};

/**
 * Calculate overall IELTS band score by averaging 4 sections
 * Rounds to nearest 0.5 (official IELTS rule)
 */
const calculateOverallScore = (scores) => {
  const validScores = scores.filter(s => s !== null && s !== undefined && !isNaN(s));
  if (validScores.length === 0) return null;
  const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  return Math.round(average * 2) / 2; // Round to nearest 0.5
};

/**
 * Generates an IELTS Test Report Form style PDF matching the official format
 * @param {Object} client - Client information object
 * @param {Object} results - Test results object with listening, reading, writing, speaking
 * @param {Object} settings - Optional settings (not used, kept for compatibility)
 */
export const generateMockTestPDF = async (client, results, settings = {}) => {
  if (!client) {
    console.error('Client data is required');
    return;
  }

  const doc = new jsPDF();
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const black = [0, 0, 0];
  const darkGray = [50, 50, 50];
  const borderColor = [200, 200, 200];
  const lightGray = [240, 240, 240];

  // Grid system for alignment
  const gridCol1 = margin;
  const gridCol2 = margin + 50;
  const gridCol3 = margin + 120;
  const gridCol4 = margin + 180;
  const gridCol5 = pageWidth - margin - 25; // For ACADEMIC box

  let yPos = margin;

  // Header: "INTERNATIONAL ENGLISH LANGUAGE TESTING SYSTEM"
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...black);
  doc.text('INTERNATIONAL ENGLISH LANGUAGE TESTING SYSTEM', margin, yPos);

  yPos += 5;

  // "Test Report Form"
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('Test Report Form', margin, yPos);

  // ACADEMIC module box at top right - smaller and more formal
  const academicBoxWidth = 20;
  const academicBoxHeight = 5;
  const academicBoxX = gridCol5;
  doc.setDrawColor(...black);
  doc.setLineWidth(0.3);
  doc.rect(academicBoxX, margin - 1, academicBoxWidth, academicBoxHeight);
  doc.setFontSize(6);
  doc.setFont(undefined, 'bold');
  doc.text('ACADEMIC', academicBoxX + academicBoxWidth / 2, margin + 2.5, { align: 'center' });

  yPos += 7;

  // NOTE section - reduced size
  doc.setFontSize(6);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...darkGray);
  const noteText = 'NOTE: Admission to undergraduate and post graduate courses should be based on the ACADEMIC Reading and Writing Modules. GENERAL TRAINING Reading and Writing Modules are not designed to test the full range of language skills required for academic purposes. It is recommended that the candidate\'s language ability as indicated in this Test Report Form be re-assessed after two years from the date of the test.';
  doc.text(noteText, margin, yPos, { maxWidth: pageWidth - 2 * margin });

  yPos += 8;

  // Centre Number, Date, Candidate Number row - using grid system
  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...black);

  // Centre Number
  doc.setFont(undefined, 'bold');
  doc.text('Centre Number:', gridCol1, yPos);
  doc.setFont(undefined, 'normal');
  doc.text(formatValue(settings?.centreNumber || '-'), gridCol2, yPos);

  // Date
  doc.setFont(undefined, 'bold');
// Date yozuvi va sana qiymati orasidagi masofani kamaytirish
doc.text('Date:', gridCol3, yPos);
doc.text(formatDate(client.date || client.created_at), gridCol3 + 15, yPos); // 180 o'rniga gridCol3 + 15

  // Candidate Number
  doc.setFont(undefined, 'bold');
  doc.text('Candidate Number:', gridCol1, yPos + 5);
  doc.setFont(undefined, 'normal');
  const candidateNumber = client.id ? String(client.id).slice(0, 8) : '-';
  doc.text(formatValue(candidateNumber), gridCol2, yPos + 5);

  yPos += 10;

  // Candidate Details Section
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...black);
  doc.text('Candidate Details', margin, yPos);

  yPos += 5;

  // Create proper 2-column table with inner lines
  const candidateBoxHeight = 50;
  const candidateBoxWidth = pageWidth - 2 * margin;
  const columnWidth = (candidateBoxWidth - 35) / 2; // Reserve space for photo
  const photoBoxSize = 25;
  const photoBoxX = pageWidth - margin - photoBoxSize - 5;
  const photoBoxY = yPos + 3;

  // Outer border
  doc.setDrawColor(...black);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos, candidateBoxWidth, candidateBoxHeight);

  // Vertical line dividing columns
  const verticalLineX = margin + columnWidth + 17.5;
  doc.line(verticalLineX, yPos, verticalLineX, yPos + candidateBoxHeight);

  // Photo box on the right
  doc.setDrawColor(...black);
  doc.setLineWidth(0.5);
  doc.rect(photoBoxX, photoBoxY, photoBoxSize, photoBoxSize);
  doc.setFontSize(5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...darkGray);
  doc.text('PHOTO', photoBoxX + photoBoxSize / 2, photoBoxY + photoBoxSize / 2 - 1.5, { align: 'center' });
  doc.text('SEAL', photoBoxX + photoBoxSize / 2, photoBoxY + photoBoxSize / 2 + 2, { align: 'center' });

  // Table rows configuration
  const rowHeight = candidateBoxHeight / 6;
  const leftColX = margin + 3;
  const rightColX = verticalLineX + 3;
  const labelWidth = 35;
  const valueOffset = 40;

  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...black);

  const nameParts = client.full_name ? client.full_name.split(' ') : ['', ''];
  const familyName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || '-';
  const firstName = nameParts[0] || '-';

  // Left column fields
  let currentY = yPos + rowHeight / 2;

  // Row 1: Family Name
  doc.setFont(undefined, 'bold');
  doc.text('Family Name:', leftColX, currentY);
  doc.setFont(undefined, 'normal');
  doc.text(formatValue(familyName), leftColX + valueOffset, currentY);
  doc.line(margin, currentY + 2, verticalLineX, currentY + 2);

  currentY += rowHeight;

  // Row 2: First Name
  doc.setFont(undefined, 'bold');
  doc.text('First Name:', leftColX, currentY);
  doc.setFont(undefined, 'normal');
  doc.text(formatValue(firstName), leftColX + valueOffset, currentY);
  doc.line(margin, currentY + 2, verticalLineX, currentY + 2);

  currentY += rowHeight;

  // Row 3: Candidate ID
  doc.setFont(undefined, 'bold');
  doc.text('Candidate ID:', leftColX, currentY);
  doc.setFont(undefined, 'normal');
  doc.text(formatValue(candidateNumber), leftColX + valueOffset, currentY);
  doc.line(margin, currentY + 2, verticalLineX, currentY + 2);

  currentY += rowHeight;

  // Row 4: Date of Birth
  doc.setFont(undefined, 'bold');
  doc.text('Date of Birth:', leftColX, currentY);
  doc.setFont(undefined, 'normal');
  doc.text(formatDate(client.date_of_birth), leftColX + valueOffset, currentY);
  doc.line(margin, currentY + 2, verticalLineX, currentY + 2);

  currentY += rowHeight;

  // Row 5: Sex (M/F)
  doc.setFont(undefined, 'bold');
  doc.text('Sex (M/F):', leftColX, currentY);
  doc.setFont(undefined, 'normal');
  doc.text(formatValue(client.sex || '-'), leftColX + valueOffset, currentY);
  doc.line(margin, currentY + 2, verticalLineX, currentY + 2);

  currentY += rowHeight;

  // Row 6: First Language
  doc.setFont(undefined, 'bold');
  doc.text('First Language:', leftColX, currentY);
  doc.setFont(undefined, 'normal');
  doc.text(formatValue(client.first_language || '-'), leftColX + valueOffset, currentY);

  // Right column fields
  currentY = yPos + rowHeight / 2;

  // Row 1: Passport Number (NEW)
  doc.setFont(undefined, 'bold');
  doc.text('Passport Number:', rightColX, currentY);
  doc.setFont(undefined, 'normal');
  doc.text(formatValue(client.passport_number || '-'), rightColX + 35, currentY);
  doc.line(verticalLineX, currentY + 2, photoBoxX - 5, currentY + 2);

  currentY += rowHeight;

  // Row 2: Scheme Code
  doc.setFont(undefined, 'bold');
  doc.text('Scheme Code:', rightColX, currentY);
  doc.setFont(undefined, 'normal');
  doc.text(formatValue(client.scheme_code || '-'), rightColX + 35, currentY);
  doc.line(verticalLineX, currentY + 2, photoBoxX - 5, currentY + 2);

  currentY += rowHeight;

  // Row 3: Private Candidate checkbox
  doc.setFont(undefined, 'bold');
  doc.text('Private Candidate:', rightColX, currentY);
  doc.setDrawColor(...black);
  doc.setLineWidth(0.3);
  const checkboxSize = 2.5;
  const checkboxX = rightColX + 35;
  const checkboxY = currentY - 2.5;
  doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize);
  if (client.private_candidate) {
    doc.setFontSize(5);
    doc.text('✓', checkboxX + checkboxSize / 2, checkboxY + checkboxSize / 2 + 0.5, { align: 'center' });
  }
  doc.setFontSize(7);
  doc.line(verticalLineX, currentY + 2, photoBoxX - 5, currentY + 2);

  currentY += rowHeight;

  // Row 4: Country or Region of Origin
  doc.setFont(undefined, 'bold');
  doc.text('Country/Region:', rightColX, currentY);
  doc.setFont(undefined, 'normal');
  doc.text(formatValue(client.country || client.region || '-'), rightColX + 35, currentY);
  doc.line(verticalLineX, currentY + 2, photoBoxX - 5, currentY + 2);

  currentY += rowHeight;

  // Row 5: Repeating IELTS (Y/N)
  doc.setFont(undefined, 'bold');
  doc.text('Repeating IELTS:', rightColX, currentY);
  doc.setFont(undefined, 'normal');
  doc.text(formatValue(client.repeating_ielts || 'N'), rightColX + 35, currentY);
  doc.line(verticalLineX, currentY + 2, photoBoxX - 5, currentY + 2);

  currentY += rowHeight;

  // Row 6: Test Type Code (NEW)
  doc.setFont(undefined, 'bold');
  doc.text('Test Type Code:', rightColX, currentY);
  doc.setFont(undefined, 'normal');
  doc.text(formatValue(client.test_type_code || settings?.testTypeCode || 'A'), rightColX + 35, currentY);

  yPos += candidateBoxHeight + 8;

  // Test Results Section
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...black);
  doc.text('Test Results', margin, yPos);

  yPos += 6;

  // Helper function to format score
  const formatScore = (score) => {
    if (score === null || score === undefined) return '-';
    return score.toFixed(1);
  };

  // Score boxes in a row - all 5 boxes (Listening, Reading, Writing, Speaking, Overall Band Score)
  const scoreBoxWidth = 18;
  const scoreBoxHeight = 12;
  const scoreBoxSpacing = 3;
  const overallBoxWidth = 22; // Slightly wider for Overall Band Score
  const overallBoxHeight = 12;

  const scoreLabels = ['Listening', 'Reading', 'Writing', 'Speaking'];
  const scores = [
    results?.listening?.score,
    results?.reading?.score,
    results?.writing?.score,
    results?.speaking?.score
  ];

  // Calculate overall score by averaging 4 sections
  const overallScore = calculateOverallScore(scores) || client.total_score;

  // Calculate total width needed for all 5 boxes
  const scoreStartX = margin;

  // Draw 4 section score boxes - WHITE with BLACK border
  scoreLabels.forEach((label, index) => {
    const boxX = scoreStartX + (index * (scoreBoxWidth + scoreBoxSpacing));

    // White box background with black border
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...black);
    doc.setLineWidth(0.8);
    doc.rect(boxX, yPos, scoreBoxWidth, scoreBoxHeight, 'FD');

    // Score text - BLACK
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...black);
    const scoreValue = formatScore(scores[index]);
    doc.text(scoreValue, boxX + scoreBoxWidth / 2, yPos + scoreBoxHeight / 2 + 1.5, { align: 'center' });

    // Label below
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...black);
    doc.text(label, boxX + scoreBoxWidth / 2, yPos + scoreBoxHeight + 4, { align: 'center' });
  });

  // Overall Band Score box - positioned at the end (right side)
  const overallBoxX = scoreStartX + (scoreBoxWidth * 6) + (scoreBoxSpacing * 5);

  // Thick black border box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...black);
  doc.setLineWidth(0.8);
  doc.rect(overallBoxX, yPos, overallBoxWidth, overallBoxHeight, 'FD');

  // Score text - BLACK
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...black);
  doc.text(formatScore(overallScore), overallBoxX + overallBoxWidth / 2, yPos + overallBoxHeight / 2 + 1.5, { align: 'center' });

  // Label below
  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...black);
  doc.text('Overall Band Score', overallBoxX + overallBoxWidth / 2, yPos + overallBoxHeight + 4, { align: 'center' });

  yPos += scoreBoxHeight + 12;

  // Bottom section: Writing Examiner Number, Speaking Examiner Number, Administrator's Signature
  const bottomY = yPos;

  // Writing Examiner Number
  doc.setFontSize(7);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...black);
  doc.text('Writing Examiner Number:', margin, bottomY);
  doc.setFont(undefined, 'normal');
  doc.text(formatValue(client.writing_examiner_number || '-'), margin, bottomY + 4);

  // Speaking Examiner Number
  doc.setFont(undefined, 'bold');
  doc.text('Speaking Examiner Number:', margin, bottomY + 8);
  doc.setFont(undefined, 'normal');
  doc.text(formatValue(client.speaking_examiner_number || '-'), margin, bottomY + 12);

  // Administrator's Signature (center)
  const signatureX = pageWidth / 2 - 45;
  doc.setDrawColor(...black);
  doc.setLineWidth(0.5);
  doc.line(signatureX, bottomY + 6, signatureX + 90, bottomY + 6);

  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...black);
  doc.text('Administrator\'s Signature', signatureX + 45, bottomY + 11, { align: 'center' });

  doc.setFontSize(6);
  // Date yozuvi va sana qiymati orasidagi masofani kamaytirish
  doc.text('Date:', gridCol3, yPos);
  doc.text(formatDate(client.date || client.created_at), gridCol3 + 15, yPos); // 180 o'rniga gridCol3 + 15

  // Test Report Form Number (bottom right) - white background with black border
  const formNumberY = pageHeight - 10;
  const formNumber = client.id ? String(client.id).replace(/-/g, '').toUpperCase().slice(0, 20) : '-';

  // White box with black border for form number
  const formNumberBoxWidth = 55;
  const formNumberBoxHeight = 6;
  const formNumberBoxX = pageWidth - margin - formNumberBoxWidth;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...black);
  doc.setLineWidth(0.8);
  doc.rect(formNumberBoxX, formNumberY - 4, formNumberBoxWidth, formNumberBoxHeight, 'FD');

  doc.setFontSize(6);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...black);
  doc.text(formatValue(formNumber), formNumberBoxX + formNumberBoxWidth / 2, formNumberY, { align: 'center' });

  doc.setFontSize(5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...darkGray);
  doc.text('Test Report Form Number', formNumberBoxX + formNumberBoxWidth / 2, formNumberY + 4, { align: 'center' });

  // Add version number (bottom left)
  doc.setFontSize(5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...darkGray);
  const versionText = `Version: ${formatValue(client.version || settings?.version || '1.0')}`;
  doc.text(versionText, margin, formNumberY);

  // Save PDF
  const fileName = `IELTS_Mock_Test_Report_${candidateNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};