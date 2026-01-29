import jsPDF from "jspdf";
import "jspdf-autotable";
import { addBrandHeader } from "./pdfHeader";

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
  if (!test || !stats || !answerDisplayData || !answerDisplayData.length) return;

  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const primaryColor = [59, 130, 246]; // #3B82F6
  const darkGray = [31, 41, 55]; // #1F2937
  const lightGray = [243, 244, 246]; // #F3F4F6
  const successColor = [34, 197, 94]; // #22C55E
  const errorColor = [239, 68, 68]; // #EF4444
  
  let yPos = await addBrandHeader(doc, pageWidth, testType, settings);

  // Statistics section with improved design
  yPos += 10;
  
  // Stats box background
  const statsBoxHeight = 45;
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, statsBoxHeight, 3, 3, 'F');
  
  // Stats title
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Test Summary', margin + 10, yPos + 8);
  
  // Stats content
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...darkGray);
  
  const statsLeftX = margin + 10;
  const statsRightX = pageWidth / 2 + 10;
  let statsY = yPos + 18;
  
  // Left column
  doc.text(`Total Questions: ${stats.totalQuestions || answerDisplayData.length}`, statsLeftX, statsY);
  statsY += 6;
  doc.text(`Correct Answers: ${stats.correctCount || answerDisplayData.filter(a => a.isCorrect).length}`, statsLeftX, statsY);
  statsY += 6;
  doc.text(`Score: ${stats.score || 'N/A'}`, statsLeftX, statsY);
  
  // Right column
  statsY = yPos + 18;
  doc.text(`Percentage: ${stats.percentage || 0}%`, statsRightX, statsY);
  statsY += 6;
  if (stats.timeTaken) {
    doc.text(`Time Taken: ${stats.timeTaken}`, statsRightX, statsY);
    statsY += 6;
  }
  if (completedDate && formatDate) {
    doc.text(`Completed: ${formatDate(completedDate)}`, statsRightX, statsY);
  }
  
  yPos += statsBoxHeight + 15;

  // Table data preparation
  const tableData = answerDisplayData.map((item) => {
    const row = [
      item.questionNumber.toString(),
      item.isCorrect ? 'Correct' : 'Incorrect',
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

  // Enhanced table design
  doc.autoTable({
    startY: yPos,
    head: [tableColumns],
    body: tableData,
    theme: 'striped',
    headStyles: { 
      fillColor: primaryColor, 
      textColor: 255, 
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: 5
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
      valign: 'middle',
      textColor: darkGray
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251] // Very light gray for stripes
    },
    styles: { 
      fontSize: 9, 
      cellPadding: 4, 
      valign: 'middle',
      lineColor: [229, 231, 235], // Border color
      lineWidth: 0.1
    },
    columnStyles: {
      0: { 
        cellWidth: 20, 
        halign: 'center',
        fontStyle: 'bold'
      },
      1: { 
        cellWidth: 30, 
        halign: 'center', 
        textColor: [255, 255, 255] // Hide text, show icon
      },
      2: { 
        cellWidth: showCorrectAnswers ? 70 : 120,
        halign: 'left'
      },
      ...(showCorrectAnswers && {
        3: { 
          cellWidth: 70,
          halign: 'left'
        }
      })
    },
    
    // Draw status icons
    didDrawCell: (data) => {
      if (data.column.index === 1 && data.section === 'body') {
        const isCorrect = answerDisplayData[data.row.index].isCorrect;
        const posX = data.cell.x + data.cell.width / 2;
        const posY = data.cell.y + data.cell.height / 2;
        
        const circleRadius = 4;

        if (isCorrect) {
          // Draw green circle
          doc.setFillColor(...successColor);
          doc.circle(posX, posY, circleRadius, 'F');
          
          // Draw checkmark using path
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(1.2);
          doc.setLineCap('round');
          doc.setLineJoin('round');
          
          // Checkmark path: two lines forming a check
          const checkSize = 3;
          const startX = posX - checkSize * 0.6;
          const startY = posY;
          const midX = posX - checkSize * 0.2;
          const midY = posY + checkSize * 0.4;
          const endX = posX + checkSize * 0.6;
          const endY = posY - checkSize * 0.4;
          
          doc.line(startX, startY, midX, midY);
          doc.line(midX, midY, endX, endY);
        } else {
          // Draw red circle
          doc.setFillColor(...errorColor);
          doc.circle(posX, posY, circleRadius, 'F');
          
          // Draw X using path
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(1.2);
          doc.setLineCap('round');
          doc.setLineJoin('round');
          
          // X path: two diagonal lines
          const xSize = 2.0;
          doc.line(posX - xSize, posY - xSize, posX + xSize, posY + xSize);
          doc.line(posX - xSize, posY + xSize, posX + xSize, posY - xSize);
        }
        
        doc.setTextColor(...darkGray);
        doc.setFont(undefined, 'normal');
      }
    },
// ... qolgan kodlar
    
    // Add page numbers
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setTextColor(...darkGray);
      doc.setFont(undefined, 'normal');
      const pageNum = doc.internal.getNumberOfPages();
      doc.text(
        `Page ${data.pageNumber} of ${pageNum}`,
        pageWidth - margin,
        pageHeight - 10,
        { align: 'right' }
      );
    }
  });

  // Footer with branding
  const finalY = doc.lastAutoTable.finalY || yPos;
  if (finalY < pageHeight - 30) {
    doc.setFontSize(7);
    doc.setTextColor(...darkGray);
    doc.setFont(undefined, 'italic');
    doc.text(
      'Generated by IELTSCORE - IELTS Preparation Platform',
      pageWidth / 2,
      pageHeight - 15,
      { align: 'center' }
    );
  }

  // Save file
  const fileName = `IELTS_${testType}_Results_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};