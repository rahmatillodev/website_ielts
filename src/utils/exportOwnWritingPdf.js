import jsPDF from "jspdf";
import "jspdf-autotable";
import { addBrandHeader } from "./pdfHeader";

const LINE_HEIGHT_QUESTION = 6.5;
const LINE_HEIGHT_ANSWER = 5.5;
const BOTTOM_MARGIN = 50;
const TASK_GAP = 35;
const primaryColor = [59, 130, 246]; // #3B82F6
const darkGray = [31, 41, 55]; // #1F2937
const lightGray = [243, 244, 246]; // #F3F4F6
const accentGray = [229, 231, 235]; // #E5E7EB

/**
 * Draws multi-line text with automatic page breaks. Returns final yPos.
 */
function drawTextWithPagination(doc, lines, x, yPos, { lineHeight, margin }) {
  const pageHeight = doc.internal.pageSize.getHeight();
  lines.forEach((line) => {
    if (yPos + lineHeight > pageHeight - BOTTOM_MARGIN) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(line, x, yPos);
    yPos += lineHeight;
  });
  return yPos;
}

/**
 * Draws a section box with rounded corners
 */
function drawSectionBox(doc, x, y, width, height, { fillColor, borderColor, borderWidth = 0.5 }) {
  if (fillColor) {
    doc.setFillColor(...fillColor);
    doc.roundedRect(x, y, width, height, 2, 2, 'F');
  }
  if (borderColor) {
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(borderWidth);
    doc.roundedRect(x, y, width, height, 2, 2, 'S');
  }
}

export const generateWritingPDF = async (tasks, totalTime, settings) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  let yPos = await addBrandHeader(doc, pageWidth, "writing", settings);

  // Overall time display at the top (only for Task 1)
  if (tasks.task1 && totalTime) {
    yPos += 5;
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.setTextColor(...darkGray);
    doc.text(`Total Time: ${totalTime}`, pageWidth - margin, yPos, { align: "right" });
    yPos += 12;
  }

  for (const taskKey of ["task1", "task2"]) {
    if (taskKey === "task2") {
      if (yPos + TASK_GAP > pageHeight - BOTTOM_MARGIN) {
        doc.addPage();
        yPos = margin;
      } else {
        yPos += TASK_GAP;
      }
    }

    const task = tasks[taskKey];
    if (!task) continue;

    // Task header section
    const taskHeaderY = yPos;
    const taskHeaderHeight = 25;
    
    // Task header background
    drawSectionBox(doc, margin, taskHeaderY, pageWidth - 2 * margin, taskHeaderHeight, {
      fillColor: primaryColor,
      borderColor: primaryColor
    });

    // Task number and title
    doc.setFont(undefined, "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(
      taskKey === "task1" ? "Task 1" : "Task 2",
      margin + 10,
      taskHeaderY + 10
    );

    // Task description
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.setTextColor(255, 255, 255);
    const taskDesc = taskKey === "task1" 
      ? "Academic Writing Task 1" 
      : "Academic Writing Task 2";
    doc.text(taskDesc, margin + 10, taskHeaderY + 18);

    yPos = taskHeaderY + taskHeaderHeight + 12;

    // Question section
    const questionBoxY = yPos;
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Question:", margin + 5, yPos);
    yPos += 8;

    // Question text box
    const questionTextWidth = pageWidth - 2 * margin - (taskKey === "task1" && task.image ? 70 : 0);
    const questionLines = doc.splitTextToSize(
      task.question || "",
      questionTextWidth - 10
    );
    const questionStartY = yPos;
    const questionPadding = 8;

    // Question background box
    const questionBoxHeight = Math.max(
      questionLines.length * LINE_HEIGHT_QUESTION + questionPadding * 2,
      (taskKey === "task1" && task.image ? 60 : 0) + questionPadding * 2
    );
    
    drawSectionBox(doc, margin + 5, questionStartY - 3, questionTextWidth, questionBoxHeight, {
      fillColor: lightGray,
      borderColor: accentGray
    });

    doc.setFont(undefined, "normal");
    doc.setFontSize(11);
    doc.setTextColor(...darkGray);
    
    yPos = drawTextWithPagination(
      doc, 
      questionLines, 
      margin + 10, 
      questionStartY + questionPadding - 3, 
      {
        lineHeight: LINE_HEIGHT_QUESTION,
        margin,
      }
    );

    // Image for Task 1
    if (taskKey === "task1" && task.image) {
      const imgWidth = 55;
      const imgHeight = 55;
      const imgX = pageWidth - margin - imgWidth - 5;
      const imgY = questionStartY + questionPadding - 3;
      
      // Image border
      doc.setDrawColor(...accentGray);
      doc.setLineWidth(1);
      doc.roundedRect(imgX - 2, imgY - 2, imgWidth + 4, imgHeight + 4, 2, 2, 'S');
      
      doc.addImage(
        task.image,
        "PNG",
        imgX,
        imgY,
        imgWidth,
        imgHeight
      );
    }

    const questionHeight = questionLines.length * LINE_HEIGHT_QUESTION + questionPadding * 2;
    const imageHeight = taskKey === "task1" && task.image ? 60 : 0;
    yPos = Math.max(yPos, questionStartY + Math.max(questionHeight, imageHeight)) + 15;

    if (yPos > pageHeight - BOTTOM_MARGIN) {
      doc.addPage();
      yPos = margin;
    }

    // Answer section
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Your Answer:", margin + 5, yPos);
    yPos += 8;

    // Answer text box
    const answerTextWidth = pageWidth - 2 * margin - 10;
    const answerLines = doc.splitTextToSize(task.answer || "", answerTextWidth - 10);
    const answerStartY = yPos;
    const answerPadding = 8;
    const answerBoxHeight = answerLines.length * LINE_HEIGHT_ANSWER + answerPadding * 2;
    
    drawSectionBox(doc, margin + 5, answerStartY - 3, answerTextWidth, answerBoxHeight, {
      fillColor: [255, 255, 255],
      borderColor: accentGray
    });

    doc.setFont(undefined, "normal");
    doc.setFontSize(11);
    doc.setTextColor(...darkGray);
    
    yPos = drawTextWithPagination(
      doc, 
      answerLines, 
      margin + 10, 
      answerStartY + answerPadding - 3, 
      {
        lineHeight: LINE_HEIGHT_ANSWER,
        margin,
      }
    );

    yPos = answerStartY + answerBoxHeight + 10;

    // Word count badge
    const wordCount = task.answer ? task.answer.trim().split(/\s+/).length : 0;
    if (yPos + 15 > pageHeight - BOTTOM_MARGIN) {
      doc.addPage();
      yPos = margin;
    }
    
    // Word count box
    const wordCountWidth = 60;
    const wordCountHeight = 12;
    doc.setFillColor(...primaryColor);
    doc.roundedRect(margin + 5, yPos, wordCountWidth, wordCountHeight, 2, 2, 'F');
    
    doc.setFont(undefined, "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`Words: ${wordCount}`, margin + 10, yPos + 8);
    
    yPos += wordCountHeight + 15;
  }

  // Footer on last page
  const currentPage = doc.internal.getNumberOfPages();
  doc.setPage(currentPage);
  doc.setFontSize(7);
  doc.setTextColor(...darkGray);
  doc.setFont(undefined, "italic");
  doc.text(
    "Generated by  - IELTS Preparation Platform",
    pageWidth / 2,
    pageHeight - 15,
    { align: "center" }
  );

  doc.save(`Writing_Tasks_${new Date().toISOString().split("T")[0]}.pdf`);
};
