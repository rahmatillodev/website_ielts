import jsPDF from "jspdf";
import "jspdf-autotable";
import { addBrandHeader } from "./pdfHeader";

// Dinamik o'lchamlar va masofalar (Ixchamlashtirildi)
const LINE_HEIGHT_QUESTION = 6.0;
const LINE_HEIGHT_ANSWER = 5.2;
const BOTTOM_MARGIN = 20;
const TASK_GAP = 12; // Tasklar orasidagi masofa
const SECTION_GAP = 6; // Sarlavha va kontent orasidagi masofa
const QUESTION_ANSWER_GAP = 8; // Savol va Javob bloklari orasidagi masofa

// Ranglar palitrasi
const primaryColor = [59, 130, 246]; // #3B82F6
const darkGray = [31, 41, 55]; // #1F2937
const lightGray = [248, 249, 250]; // #F8F9FA
const accentGray = [229, 231, 235]; // #E5E7EB

/**
 * Matnni avtomatik sahifalarga bo'lish bilan chizish
 */
function drawTextWithPagination(doc, lines, x, yPos, { lineHeight, margin }) {
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = yPos;

  lines.forEach((line) => {
    if (currentY + lineHeight > pageHeight - BOTTOM_MARGIN) {
      doc.addPage();
      currentY = margin + 10; // Yangi sahifada tepadan masofa
    }
    doc.text(line, x, currentY);
    currentY += lineHeight;
  });
  return currentY;
}

/**
 * Dumaloq burchakli blok chizish
 * NOTE: Borders REMOVED per instruction
 */
function drawSectionBox(doc, x, y, width, height, { fillColor }) {
  if (fillColor) {
    doc.setFillColor(...fillColor);
    doc.roundedRect(x, y, width, height, 2, 2, 'F');
  }
  // Borders removed
}

export const generateWritingPDF = async (tasks, totalTime, settings) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Brend headerini qo'shish
  let yPos = await addBrandHeader(doc, pageWidth, "writing", settings);

  // Umumiy vaqt (faqat mavjud bo'lsa)
  if (totalTime) {
    yPos += 5;
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.setTextColor(...darkGray);
    doc.text(`Total Duration: ${totalTime}`, pageWidth - margin, yPos, { align: "right" });
    yPos += 5;
  }

  yPos += 5; // Headerdan keyingi boshlang'ich masofa

  for (const taskKey of ["task1", "task2"]) {
    const task = tasks[taskKey];
    if (!task) continue;

    // Tasklar orasida yangi sahifa tekshiruvi
    if (yPos + 40 > pageHeight - BOTTOM_MARGIN) {
      doc.addPage();
      yPos = margin;
    }

    // --- Task Header Section ---
    const taskHeaderHeight = 18;
    drawSectionBox(doc, margin, yPos, pageWidth - 2 * margin, taskHeaderHeight, {
      fillColor: primaryColor
      // No borderColor
    });

    doc.setFont(undefined, "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(taskKey === "task1" ? "Writing Task 1" : "Writing Task 2", margin + 8, yPos + 8);

    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text(taskKey === "task1" ? "Academic/General Training" : "Essay Writing", margin + 8, yPos + 14);

    yPos += taskHeaderHeight + SECTION_GAP;

    // --- Question Section ---
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...primaryColor);
    doc.text("QUESTION PROMPT:", margin, yPos);
    yPos += 4;

    const hasImage = taskKey === "task1" && task.image;
    const questionTextWidth = pageWidth - 2 * margin - (hasImage ? 65 : 10);
    const questionLines = doc.splitTextToSize(task.question || "", questionTextWidth);
    
    const questionPadding = 6;
    const questionTextHeight = questionLines.length * LINE_HEIGHT_QUESTION;
    const imageHeight = hasImage ? 55 : 0;
    const questionBoxHeight = Math.max(questionTextHeight, imageHeight) + (questionPadding * 2);

    // Savol bloki foni
    drawSectionBox(doc, margin, yPos, pageWidth - 2 * margin, questionBoxHeight, {
      fillColor: lightGray
      // No borderColor
    });

    doc.setFont(undefined, "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...darkGray);
    
    // Matnni chizish
    const textStartY = yPos + questionPadding + 4;
    let textEndY = drawTextWithPagination(doc, questionLines, margin + 5, textStartY, {
      lineHeight: LINE_HEIGHT_QUESTION,
      margin,
    });

    // Rasm (Task 1 bo'lsa)
    if (hasImage) {
      const imgSize = 50;
      doc.addImage(task.image, "PNG", pageWidth - margin - imgSize - 5, yPos + questionPadding, imgSize, imgSize);
    }

    yPos += questionBoxHeight + QUESTION_ANSWER_GAP;

    // --- Answer Section ---
    if (yPos + 30 > pageHeight - BOTTOM_MARGIN) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...primaryColor);
    doc.text("CANDIDATE RESPONSE:", margin, yPos);
    yPos += 4;

    const answerLines = doc.splitTextToSize(task.answer || "No answer provided.", pageWidth - 2 * margin - 10);
    const answerPadding = 6;
    const answerContentHeight = answerLines.length * LINE_HEIGHT_ANSWER;
    const answerBoxHeight = Math.max(answerContentHeight + (answerPadding * 2), 20);

    drawSectionBox(doc, margin, yPos, pageWidth - 2 * margin, answerBoxHeight, {
      fillColor: [255, 255, 255]
      // No borderColor
    });

    doc.setFont(undefined, "normal");
    doc.setFontSize(10.5);
    let finalAnswerY = drawTextWithPagination(doc, answerLines, margin + 5, yPos + answerPadding + 4, {
      lineHeight: LINE_HEIGHT_ANSWER,
      margin,
    });

    yPos += answerBoxHeight + 6;

    // --- Word Count Badge ---
    const wordCount = task.answer ? task.answer.trim().split(/\s+/).length : 0;
    const badgeWidth = 35;
    const badgeHeight = 8;
    
    doc.setFillColor(...primaryColor);
    doc.roundedRect(margin, yPos, badgeWidth, badgeHeight, 1, 1, 'F');
    doc.setFont(undefined, "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`Words: ${wordCount}`, margin + 4, yPos + 5.5);
    
    yPos += badgeHeight + TASK_GAP;
  }

  // Sahifalar sonini va footerni qo'shish
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${totalPages} - IELTS Practice Hub`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  doc.save(`Writing_Report_${new Date().getTime()}.pdf`);
};