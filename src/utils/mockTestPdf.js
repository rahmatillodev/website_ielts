import jsPDF from "jspdf";

/**
 * Generates an IELTS Test Report Form style PDF
 * @param {Object} client - Client information object
 * @param {Object} results - Test results object with listening, reading, writing
 * @param {Object} settings - Optional settings (not used, kept for compatibility)
 */
export const generateMockTestPDF = async (client, results, settings = {}) => {
  if (!client) {
    console.error('Client data is required');
    return;
  }

  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const primaryColor = [59, 130, 246]; // #3B82F6
  const darkGray = [31, 41, 55]; // #1F2937
  const lightGray = [243, 244, 246]; // #F3F4F6
  const borderColor = [200, 200, 200]; // Light gray for borders

  // Start from top margin (no header)
  let yPos = margin;

  // IELTS Test Report Form Title Section
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('IELTS', margin, yPos);
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...darkGray);
  doc.text('Test Report Form', margin + 35, yPos);
  
  yPos += 20;

  // Candidate Information Section
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Candidate Information', margin, yPos);
  
  yPos += 8;
  
  // Draw border box for candidate info
  const candidateInfoHeight = 50;
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos, pageWidth - 2 * margin, candidateInfoHeight);
  
  // Candidate details
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...darkGray);
  
  const nameParts = client.full_name ? client.full_name.split(' ') : ['', ''];
  const familyName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || 'N/A';
  const firstName = nameParts[0] || 'N/A';
  
  const infoLeftX = margin + 5;
  const infoRightX = pageWidth / 2 + 10;
  let infoY = yPos + 8;
  
  doc.setFont(undefined, 'bold');
  doc.text('Family Name:', infoLeftX, infoY);
  doc.setFont(undefined, 'normal');
  doc.text(familyName, infoLeftX + 35, infoY);
  
  infoY += 7;
  doc.setFont(undefined, 'bold');
  doc.text('First Name:', infoLeftX, infoY);
  doc.setFont(undefined, 'normal');
  doc.text(firstName, infoLeftX + 35, infoY);
  
  infoY += 7;
  doc.setFont(undefined, 'bold');
  doc.text('Candidate ID:', infoLeftX, infoY);
  doc.setFont(undefined, 'normal');
  const candidateId = client.id ? String(client.id).slice(0, 8) : 'N/A';
  doc.text(candidateId, infoLeftX + 35, infoY);
  
  // Email and Phone on the right
  infoY = yPos + 8;
  if (client.email) {
    doc.setFont(undefined, 'bold');
    doc.text('Email:', infoRightX, infoY);
    doc.setFont(undefined, 'normal');
    doc.text(client.email, infoRightX + 20, infoY);
    infoY += 7;
  }
  
  if (client.phone_number) {
    doc.setFont(undefined, 'bold');
    doc.text('Phone:', infoRightX, infoY);
    doc.setFont(undefined, 'normal');
    doc.text(client.phone_number, infoRightX + 20, infoY);
  }
  
  yPos += candidateInfoHeight + 15;

  // Test Results Section
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Test Results', margin, yPos);
  
  yPos += 10;

  // Results Table
  const tableStartY = yPos;
  const tableWidth = pageWidth - 2 * margin;
  const colWidth = tableWidth / 5;
  const rowHeight = 25;
  const headerHeight = 12;

  // Table header
  doc.setFillColor(...primaryColor);
  doc.rect(margin, yPos, tableWidth, headerHeight, 'F');
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(255, 255, 255);
  const headers = ['Listening', 'Reading', 'Writing', 'Speaking', 'Overall'];
  headers.forEach((header, index) => {
    const x = margin + (index * colWidth) + (colWidth / 2);
    doc.text(header, x, yPos + headerHeight / 2 + 3, { align: 'center' });
  });

  yPos += headerHeight;

  // Table body with scores
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.5);
  doc.rect(margin, tableStartY, tableWidth, headerHeight + rowHeight);
  
  // Vertical lines
  for (let i = 1; i < 5; i++) {
    const x = margin + (i * colWidth);
    doc.line(x, tableStartY, x, tableStartY + headerHeight + rowHeight);
  }
  
  // Horizontal line between header and body
  doc.line(margin, tableStartY + headerHeight, margin + tableWidth, tableStartY + headerHeight);

  // Scores - show 0 if score is 0, otherwise show score or 'N/A'
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...darkGray);
  
  // Helper function to get score value (preserves 0, shows N/A only for null/undefined)
  const getScore = (score) => {
    if (score === null || score === undefined) return 'N/A';
    return score;
  };
  
  const listeningScore = getScore(results?.listening?.score);
  const readingScore = getScore(results?.reading?.score);
  const writingScore = getScore(results?.writing?.score);
  const speakingScore = getScore(results?.speaking?.score);
  const overallScore = getScore(client.total_score);
  
  const scores = [listeningScore, readingScore, writingScore, speakingScore, overallScore];
  scores.forEach((score, index) => {
    const x = margin + (index * colWidth) + (colWidth / 2);
    doc.text(String(score), x, yPos + rowHeight / 2 + 4, { align: 'center' });
  });

  yPos += rowHeight + 20;

  // Centre Stamp and Administrator's Signature Section
  const stampY = yPos;
  const stampSize = 60;
  const stampX = margin + 30;
  const signatureX = pageWidth - margin - 100;

  // Centre Stamp box
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(1);
  doc.setFillColor(255, 255, 255);
  doc.circle(stampX, stampY + stampSize / 2, stampSize / 2, 'FD');
  
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text('Centre Stamp', stampX, stampY + stampSize / 2, { align: 'center' });

  // Administrator's Signature line
  doc.setDrawColor(...darkGray);
  doc.setLineWidth(0.5);
  doc.line(signatureX, stampY + 40, signatureX + 100, stampY + 40);
  
  doc.setFontSize(8);
  doc.setTextColor(...darkGray);
  doc.text('Administrator\'s Signature', signatureX + 50, stampY + 45, { align: 'center' });

  // Footer
  const footerY = pageHeight - 15;
  doc.setFontSize(7);
  doc.setFont(undefined, 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text(
    'This is an unofficial test report form generated by IELTSCORE',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Save PDF
  const fileName = `IELTS_Mock_Test_Report_${candidateId}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};