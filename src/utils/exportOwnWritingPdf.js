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
    const logoUrl = '/image.png';
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


export const generateWritingPDF = async (tasks, totalTime) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Add brand header
  let yPos = await addBrandHeader(doc, pageWidth, "writing");

  // --- TASKS ---
  for (const taskKey of ["task1", "task2"]) {
    if (taskKey === "task2") {
      doc.addPage();
      yPos = margin;
    }

    const task = tasks[taskKey];
    if (!task) continue;


    // Заголовок таска
    doc.setFont(undefined, "bold");
    doc.setFontSize(14);
    doc.text(taskKey === "task1" ? "Task 1" : "Task 2", margin, yPos);
    
    if (taskKey === "task1") {
      doc.setFont(undefined, "normal");
      doc.setFontSize(12);
      doc.text(`Time: ${totalTime}`, pageWidth - margin, yPos, { align: 'right' });
    }
    
    yPos += 10;
    
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("Question:", margin, yPos);
    yPos += 6;

    doc.setFont(undefined, "normal");
    doc.setFontSize(12);

    // Question
    const questionLines = doc.splitTextToSize(task.question || "", pageWidth - 2 * margin - 60);
    doc.text(questionLines, margin, yPos);

    // Task1: изображение справа, если есть
    if (taskKey === "task1" && task.image) {
      const imgWidth = 50;
      const imgHeight = 50;
      doc.addImage(task.image, "PNG", pageWidth - margin - imgWidth, yPos - 2, imgWidth, imgHeight);
    }

    const questionHeight = questionLines.length * 6;
    const imageHeight = taskKey === "task1" && task.image ? 50 : 0;

    // ⬇️ СНАЧАЛА отступ после вопроса
    yPos += Math.max(questionHeight, imageHeight) + 8;

    // ANSWER LABEL
    doc.setFont(undefined, "bold");
    doc.setFontSize(11);
    doc.text("Answer:", margin, yPos);
    yPos += 6;

    // Answer
    doc.setFont(undefined, "italic");
    const answerLines = doc.splitTextToSize(task.answer || "", pageWidth - 2 * margin);
    doc.text(answerLines, margin, yPos);

    yPos += answerLines.length * 5;

    const wordCount = task.answer ? task.answer.trim().split(/\s+/).length : 0;
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.text(`Words: ${wordCount}`, margin, yPos);
    yPos += 10;

    // Новая страница, если мало места
    if (yPos > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      yPos = margin;
    }
  }

  // --- SAVE PDF ---
  doc.save(`Writing_Tasks_${new Date().toISOString().split("T")[0]}.pdf`);
};
