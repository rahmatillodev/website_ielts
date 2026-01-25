import jsPDF from "jspdf";
import "jspdf-autotable";
import { addBrandHeader } from "./pdfHeader";

/**
 * Generates and downloads a PDF report for IELTS test results
 * 
 * @param {Object} options - Configuration options for the PDF
 * @param {Object} options.test - The test object (must have a title property)
 * @param {Object} options.stats - Statistics object containing score, correctCount, totalQuestions, timeTaken
 * @param {Array} options.answerDisplayData - Array of answer items with questionNumber, yourAnswer, isCorrect, correctAnswer
 * @param {boolean} options.showCorrectAnswers - Whether to include correct answers column
 * @param {Function} options.formatDate - Function to format dates
 * @param {string|Date} options.completedDate - The completion date (can be timestamp string or Date)
 * @param {string} options.testType - Type of test (e.g., "Reading", "Listening") - used in title and filename
 * @param {string} [options.defaultTestTitle] - Default test title if test.title is not available
 * @returns {Promise<void>}
 */
export const generateTestResultsPDF = async ({
  test,
  stats,
  answerDisplayData,
  showCorrectAnswers,
  formatDate,
  completedDate,
  testType,
  defaultTestTitle = `Academic ${testType} Practice Test`,
  settings
}) => {
  // Validation
  if (!test || !stats || !answerDisplayData || !answerDisplayData.length) {
    console.warn('Missing required data for PDF generation');
    return;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  
  // Add brand header
  let yPos = await addBrandHeader(doc, pageWidth, testType, settings);

  // Test Info
  doc.setTextColor(0, 0, 0); // Reset to black
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`Test: ${test?.title || defaultTestTitle}`, margin, yPos);
  yPos += 6;
  doc.text(`Date: ${formatDate(completedDate)}`, margin, yPos);
  yPos += 6;
  doc.text(`Score: ${stats.score} / 9.0`, margin, yPos);
  yPos += 6;
  doc.text(`Correct Answers: ${stats.correctCount} / ${stats.totalQuestions}`, margin, yPos);
  yPos += 6;
  doc.text(`Time Taken: ${stats.timeTaken}`, margin, yPos);
  yPos += 15;

  // Prepare table data
  const tableData = answerDisplayData.map((item) => {
    const row = [
      item.questionNumber.toString(),
      item.isCorrect ? '' : '✗',
      item.yourAnswer || 'N/A',
    ];
    
    if (showCorrectAnswers) {
      row.push(item.isCorrect ? item.yourAnswer : (item.correctAnswer || 'N/A'));
    }
    
    return row;
  });

  const tableColumns = showCorrectAnswers
    ? ['#', 'Status', 'Your Answer', 'Correct Answer']
    : ['#', 'Status', 'Your Answer'];

  // Add table
  doc.autoTable({
    startY: yPos,
    head: [tableColumns],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: showCorrectAnswers ? 60 : 120 },
      ...(showCorrectAnswers && { 3: { cellWidth: 60 } }),
    },
  });

  // Save PDF
  const fileName = `IELTS_${testType}_Results_${test?.title?.replace(/\s+/g, '_') || 'Test'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

