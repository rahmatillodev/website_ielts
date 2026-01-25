import jsPDF from "jspdf";
import "jspdf-autotable";
import { addBrandHeader } from "./pdfHeader";

const LINE_HEIGHT_QUESTION = 6;
const LINE_HEIGHT_ANSWER = 5;
const BOTTOM_MARGIN = 40;
/** Заметный отступ между Task 1 и Task 2. Новая страница — только если отступ не помещается. */
const TASK_GAP = 28;

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

export const generateWritingPDF = async (tasks, totalTime, settings) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  let yPos = await addBrandHeader(doc, pageWidth, "writing", settings);

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

    doc.setFont(undefined, "bold");
    doc.setFontSize(14);
    doc.text(taskKey === "task1" ? "Task 1" : "Task 2", margin, yPos);

    if (taskKey === "task1") {
      doc.setFont(undefined, "normal");
      doc.setFontSize(12);
      doc.text(`Time: ${totalTime}`, pageWidth - margin, yPos, { align: "right" });
    }

    yPos += 10;

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("Question:", margin, yPos);
    yPos += 6;

    doc.setFont(undefined, "normal");
    doc.setFontSize(12);

    const questionLines = doc.splitTextToSize(
      task.question || "",
      pageWidth - 2 * margin - (taskKey === "task1" && task.image ? 60 : 0)
    );
    const questionStartY = yPos;

    yPos = drawTextWithPagination(doc, questionLines, margin, yPos, {
      lineHeight: LINE_HEIGHT_QUESTION,
      margin,
    });

    if (taskKey === "task1" && task.image) {
      const imgWidth = 50;
      const imgHeight = 50;
      doc.addImage(
        task.image,
        "PNG",
        pageWidth - margin - imgWidth,
        questionStartY - 2,
        imgWidth,
        imgHeight
      );
    }

    const questionHeight = questionLines.length * LINE_HEIGHT_QUESTION;
    const imageHeight = taskKey === "task1" && task.image ? 50 : 0;
    yPos = Math.max(yPos, questionStartY + Math.max(questionHeight, imageHeight)) + 8;

    if (yPos > pageHeight - BOTTOM_MARGIN) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFont(undefined, "bold");
    doc.setFontSize(11);
    doc.text("Answer:", margin, yPos);
    yPos += 6;

    doc.setFont(undefined, "italic");
    const answerLines = doc.splitTextToSize(task.answer || "", pageWidth - 2 * margin);
    yPos = drawTextWithPagination(doc, answerLines, margin, yPos, {
      lineHeight: LINE_HEIGHT_ANSWER,
      margin,
    });

    const wordCount = task.answer ? task.answer.trim().split(/\s+/).length : 0;
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    if (yPos + 10 > pageHeight - BOTTOM_MARGIN) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(`Words: ${wordCount}`, margin, yPos);
    yPos += 10;
  }

  doc.save(`Writing_Tasks_${new Date().toISOString().split("T")[0]}.pdf`);
};
