import jsPDF from "jspdf";
import "jspdf-autotable";

/**
 * Converts an image URL to base64 data URL for use in jsPDF
 * @param {string} url - The image URL
 * @returns {Promise<string>} - Base64 data URL
 */
const imageToBase64 = (url) => {
  return new Promise((resolve, reject) => {
    // For same-origin resources, we can load directly
    // For SVGs, we'll use fetch and convert to blob if needed
    if (url.endsWith('.svg')) {
      fetch(url)
        .then(response => response.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width || 60;
              canvas.height = img.height || 60;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              try {
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
              } catch (error) {
                reject(error);
              }
            };
            img.onerror = reject;
            img.src = reader.result;
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(reject);
    } else {
      const img = new Image();
      // Only set crossOrigin for external resources
      if (url.startsWith('http') && !url.startsWith(window.location.origin)) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        try {
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = url;
    }
  });
};

/**
 * Adds the brand header to the PDF document
 * @param {jsPDF} doc - The jsPDF document instance
 * @param {number} pageWidth - The page width
 * @param {string} testType - Type of test (e.g., "Reading", "Listening")
 * @returns {Promise<number>} - The Y position after the header
 */
const addBrandHeader = async (doc, pageWidth, testType) => {
  const margin = 20;
  let yPos = margin;
  const logoSize = 20;
  const blueColor = [59, 130, 246]; // #3B82F6 in RGB

  try {
    // Load and add logo
    // const logoUrl = '/logo.svg';
    const logoUrl = "/image.png"
    const logoDataUrl = await imageToBase64(logoUrl);
    doc.addImage(logoDataUrl, 'PNG', margin, yPos, logoSize, logoSize);
    
    // Company name below logo
    doc.setFontSize(8);
    doc.setTextColor(...blueColor);
    doc.setFont(undefined, 'normal');
    doc.text('EDUCATION CORP', margin, yPos + logoSize + 5);
    
    // Contact information on the right
    const contactInfo = [
      'Boston, MA 02108',
      'education@corp.com',
      'education.com',
      '222 555 7777'
    ];
    
    doc.setFontSize(8);
    doc.setTextColor(...blueColor);
    const rightAlignX = pageWidth - margin;
    let contactY = yPos;
    contactInfo.forEach((line) => {
      doc.text(line, rightAlignX, contactY, { align: 'right' });
      contactY += 4;
    });
    
    // Horizontal line separator
    const lineY = yPos + logoSize + 12;
    doc.setDrawColor(...blueColor);
    doc.setLineWidth(0.5);
    doc.line(margin, lineY, pageWidth - margin, lineY);
    
    // Title below the line
    const titleY = lineY + 10;
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...blueColor);
    doc.text(`IELTS ${testType || 'Test'} Test Results`, pageWidth / 2, titleY, { align: 'center' });
    
    return titleY + 8;
  } catch (error) {
    console.warn('Failed to load logo, using text-only header:', error);
    // Fallback: text-only header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...blueColor);
    doc.text('EDUCATION CORP', margin, yPos);
    
    const contactInfo = [
      'Boston, MA 02108',
      'education@corp.com',
      'education.com',
      '222 555 7777'
    ];
    doc.setFontSize(8);
    const rightAlignX = pageWidth - margin;
    let contactY = yPos;
    contactInfo.forEach((line) => {
      doc.text(line, rightAlignX, contactY, { align: 'right' });
      contactY += 4;
    });
    
    const lineY = yPos + 8;
    doc.setDrawColor(...blueColor);
    doc.setLineWidth(0.5);
    doc.line(margin, lineY, pageWidth - margin, lineY);
    
    const titleY = lineY + 10;
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`IELTS ${testType || 'Test'} Test Results`, pageWidth / 2, titleY, { align: 'center' });
    
    return titleY + 8;
  }
};

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
  defaultTestTitle = `Academic ${testType} Practice Test`
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
  let yPos = await addBrandHeader(doc, pageWidth, testType);

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

