import jsPDF from "jspdf";
import { imageToBase64 } from "@/utils/pdfHeader";

// Layout: jsPDF uses mm. 1px ≈ 0.264583mm at 96dpi
const PX = 0.264583;
const MARGIN = 18 * PX;
const HEADER_TOP_PADDING = 5; // mm — отступ сверху перед "IELTS"
const BORDER = 0.35; // 1px
const FONT_BASE = 10;   // ~10px
const FONT_SMALL = 7;
const FONT_IELTS = 22;  // 28–32px equivalent in pt for "IELTS"
const FIELD_HEIGHT_22 = 22 * PX; // 22px box height
const CANDIDATE_FIELD_HEIGHT = 28 * PX; // высота инпутов Family Name, First Name, Candidate ID (больше чем 22px)
const LABEL_ABOVE = 3.5;  // space for label above value box
const ID_ROW_GAP = 10 * PX;   // 10px between identification boxes
const ID_BOX_PADDING = 6 * PX; // 6px padding inside
const SECTION_TITLE_MARGIN_TOP = 14 * PX;
const SECTION_TITLE_MARGIN_BOTTOM = 8 * PX;
const PERSONAL_ROW_HEIGHT = CANDIDATE_FIELD_HEIGHT; // как у Family Name, First Name, Candidate ID
const FILL_LIGHT_GRAY = [224, 224, 224]; // #E0E0E0 — фон полей с данными как на оригинале
const LABEL_TO_BOX_GAP = 1.5;   // небольшой отступ между подписью и полем (не склеены, но вместе)
const BETWEEN_GROUPS_GAP = 5;   // отступ между группами label+block (чтобы различать блоки)
const PHOTO_EXTRA_HEIGHT = 12;  // дополнительная высота блока для картинки (мм)

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return String(value).trim();
};

const formatDate = (date) => {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).replace(/\//g, "/");
  } catch {
    return "";
  }
};

const calculateOverallScore = (scores) => {
  const validScores = scores.filter(
    (s) => s !== null && s !== undefined && !isNaN(s)
  );
  if (validScores.length === 0) return null;
  const average =
    validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  return Math.round(average * 2) / 2;
};

/** IELTS band to CEFR level */
const scoreToCEFR = (score) => {
  if (score === null || score === undefined || score === "") return "";
  const n = Number(score);
  if (isNaN(n)) return "";
  if (n >= 8.5) return "C2";
  if (n >= 7.5) return "C1";
  if (n >= 6.5) return "B2";
  if (n >= 5.5) return "B1";
  if (n >= 4.5) return "B1";
  return "A2";
};

/**
 * Draw: label above, then bordered box with value (value bold). Value vertically centered, padding-left 6px.
 * valueFill: true — заливка поля светло-серым как на оригинале TRF.
 * Returns y after the block.
 */
const drawLabelValueBox = (doc, x, y, width, boxHeight, label, value, options = {}) => {
  const { paddingLeft = 6 * PX, valueFill = false } = options;
  doc.setFontSize(FONT_SMALL);
  doc.setFont(undefined, "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(label, x, y + 3);
  const boxY = y + LABEL_ABOVE;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(BORDER);
  if (valueFill) {
    doc.setFillColor(...FILL_LIGHT_GRAY);
    doc.rect(x, boxY, width, boxHeight, "FD");
  } else {
    doc.rect(x, boxY, width, boxHeight);
  }
  doc.setFont(undefined, "bold");
  const valueY = boxY + boxHeight / 2 + 1.5;
  doc.text(value !== "" ? value : "", x + paddingLeft, valueY);
  return boxY + boxHeight;
};

/**
 * Draw one row: label on the left, bordered value box on the right (label и блок в одну линию, блоки друг под другом).
 * Returns y after the row.
 */
const LABEL_LINE_HEIGHT = 3.5;

const drawLabelLeftBoxRight = (doc, labelX, boxX, y, boxW, boxH, label, value, options = {}) => {
  const { paddingLeft = 6 * PX, valueFill = false, wrapLabel = false } = options;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(BORDER);
  if (valueFill) {
    doc.setFillColor(...FILL_LIGHT_GRAY);
    doc.rect(boxX, y, boxW, boxH, "FD");
  } else {
    doc.rect(boxX, y, boxW, boxH);
  }
  doc.setFontSize(FONT_SMALL);
  doc.setFont(undefined, "normal");
  doc.setTextColor(0, 0, 0);
  const labelBaselineY = y + boxH / 2 + 1.5;
  if (wrapLabel) {
    const maxLabelW = Math.max(10, boxX - labelX - 2);
    const lines = doc.splitTextToSize(label, maxLabelW);
    lines.forEach((line, idx) => {
      doc.text(line, labelX, labelBaselineY - (lines.length - 1 - idx) * LABEL_LINE_HEIGHT);
    });
  } else {
    doc.text(label, labelX, labelBaselineY);
  }
  doc.setFont(undefined, "bold");
  doc.text(value !== "" ? value : "", boxX + paddingLeft, labelBaselineY);
  return y + boxH;
};

/**
 * Draw justified text (approx) by splitting to size and drawing lines.
 */
const drawJustifiedText = (doc, text, x, y, maxWidth) => {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.setFontSize(FONT_SMALL);
  doc.setFont(undefined, "normal");
  doc.text(lines, x, y);
  return y + lines.length * 3.5;
};

export const generateMockTestPDF = async (client, results, settings = {}) => {
  if (!client) {
    console.error("Client data is required");
    return;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - 2 * MARGIN;

  doc.setFont("helvetica");
  doc.setLineWidth(BORDER);
  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);

  let y = MARGIN + HEADER_TOP_PADDING;

  // ----- HEADER: IELTS (large bold) top-left, Test Report Form below; right: GENERAL TRAINING / ACADEMIC box -----
  doc.setFontSize(FONT_IELTS);
  doc.setFont(undefined, "bold");
  doc.text("IELTS", MARGIN, y);
  y += 8;

  doc.setFontSize(FONT_BASE);
  doc.setFont(undefined, "normal");
  doc.text("Test Report Form", MARGIN, y);

  const testTypeRaw = settings?.testType ?? client.test_type ?? "ACADEMIC";
  const testTypeLabel = String(testTypeRaw).toUpperCase();
  const typeBoxW = 32;
  const typeBoxH = 7;
  const typeBoxX = pageWidth - MARGIN - typeBoxW;
  const typeBoxY = y - 5;
  doc.setFillColor(255, 255, 255);
  doc.rect(typeBoxX, typeBoxY, typeBoxW, typeBoxH, "FD");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(BORDER);
  doc.rect(typeBoxX, typeBoxY, typeBoxW, typeBoxH);
  doc.setFont(undefined, "bold");
  doc.setFontSize(FONT_BASE);
  doc.text(testTypeLabel, typeBoxX + typeBoxW / 2, typeBoxY + typeBoxH / 2 + 1.5, { align: "center" });

  y += 6;

  // NOTE paragraph - 7px, full width
  const noteText =
    "NOTE: Admission to undergraduate and post graduate courses should be based on the ACADEMIC Reading and Writing Modules. GENERAL TRAINING Reading and Writing Modules are not designed to test the full range of language skills required for academic purposes. It is recommended that the candidate's language ability as indicated in this Test Report Form be re-assessed after two years from the date of the test.";
  y = drawJustifiedText(doc, noteText, MARGIN, y, contentWidth);
  y += 4;

  // ----- IDENTIFICATION ROW: белый фон инпутов, отступ между подписью и инпутом -----
  const idBoxPaddingMm = ID_BOX_PADDING;
  const idLabelToBoxGap = 2;  // отступ между текстом подписи и инпутом
  const idValueBoxW = 22;
  const idValueBoxH = 8;

  const idLabels = ["Centre Number", "Test Date", "Candidate Number"];
  const idValues = [
    formatValue(settings?.centreNumber),
    formatDate(client.date || client.created_at),
    formatValue(client.id ? String(client.id).slice(0, 8) : ""),
  ];
  doc.setFontSize(FONT_SMALL);
  doc.setFont(undefined, "normal");
  const idGroupWidths = idLabels.map((l) => doc.getTextWidth(l) + idLabelToBoxGap + idValueBoxW);
  const idX1 = MARGIN;
  const idX3End = pageWidth - MARGIN;
  const idX3 = idX3End - idGroupWidths[2];
  const idCenterX = pageWidth / 2;
  const idX2 = idCenterX - idGroupWidths[1] / 2;
  const idPositions = [idX1, idX2, idX3];
  for (let i = 0; i < 3; i++) {
    const idX = idPositions[i];
    const labelW = doc.getTextWidth(idLabels[i]);
    const boxX = idX + labelW + idLabelToBoxGap;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(BORDER);
    doc.setFillColor(255, 255, 255);
    doc.rect(boxX, y, idValueBoxW, idValueBoxH, "FD");
    doc.setDrawColor(0, 0, 0);
    doc.rect(boxX, y, idValueBoxW, idValueBoxH);
    doc.text(idLabels[i], idX, y + idValueBoxH / 2 + 1.5);
    doc.setFont(undefined, "bold");
    doc.text(idValues[i] || "", boxX + idBoxPaddingMm, y + idValueBoxH / 2 + 1.5);
    doc.setFont(undefined, "normal");
  }
  const candidateDetailsMargin = SECTION_TITLE_MARGIN_BOTTOM + 2;
  const candidateDetailsMarginTop = 3;  // дополнительный отступ над "Candidate Details" от верхней формы
  y += idValueBoxH + candidateDetailsMargin + candidateDetailsMarginTop;

  // ----- SECTION TITLE: Candidate Details -----
  doc.setFontSize(FONT_BASE);
  doc.setFont(undefined, "bold");
  doc.text("Candidate Details", MARGIN, y);
  y += candidateDetailsMargin;

  // ----- CANDIDATE DETAILS GRID: блок фото — нижний край на уровне нижнего края блока "Scheme Code"; высота больше → width тоже увеличиваем -----
  const candLabelZoneW = 28;
  const candBoxX = MARGIN + candLabelZoneW + LABEL_TO_BOX_GAP;
  const candFieldGap = 2;
  const candRowH = CANDIDATE_FIELD_HEIGHT + candFieldGap;
  const photoH = candRowH * 2.8 + candFieldGap + PERSONAL_ROW_HEIGHT;
  const photoW = photoH;
  const photoGap = 2;
  const photoX = pageWidth - MARGIN - photoW;
  const candBoxW = photoX - candBoxX - photoGap;
  const photoY = y;

  const nameParts = client.full_name ? client.full_name.trim().split(/\s+/) : ["", ""];
  const familyName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : nameParts[0] || "";
  const firstName = nameParts[0] || "";
  const candidateId = formatValue(client.candidate_id || (client.id ? String(client.id).slice(0, 8) : ""));

  let fieldY = y;
  fieldY = drawLabelLeftBoxRight(doc, MARGIN, candBoxX, fieldY, candBoxW, CANDIDATE_FIELD_HEIGHT, "Family Name", formatValue(familyName), { paddingLeft: idBoxPaddingMm, valueFill: true });
  fieldY += candFieldGap;
  fieldY = drawLabelLeftBoxRight(doc, MARGIN, candBoxX, fieldY, candBoxW, CANDIDATE_FIELD_HEIGHT, "First Name", formatValue(firstName), { paddingLeft: idBoxPaddingMm, valueFill: true });
  fieldY += candFieldGap;
  fieldY = drawLabelLeftBoxRight(doc, MARGIN, candBoxX, fieldY, candBoxW, CANDIDATE_FIELD_HEIGHT, "Candidate ID", candidateId, { paddingLeft: idBoxPaddingMm, valueFill: true });

  doc.rect(photoX, photoY, photoW, photoH);
  const photoSource = client.photo_url || client.photo || client.avatar_image;
  if (photoSource) {
    try {
      let photoData = photoSource;
      if (typeof photoSource === "string" && photoSource.startsWith("http")) {
        photoData = await imageToBase64(photoSource, {
          maxWidth: 400,
          maxHeight: 400,
          format: "image/jpeg",
          quality: 0.85,
        });
      }
      if (photoData) {
        const imgW = photoW - 2;
        const imgH = photoH - 2;
        const format = typeof photoData === "string" && photoData.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(photoData, format, photoX + 1, photoY + 1, imgW, imgH);
      }
    } catch (_) {
      // leave photo block empty on load/embed error
    }
  }

  y = fieldY + candFieldGap;

  // ----- PERSONAL INFO Row 1: label+поле с малым отступом; между группами — больший отступ -----
  const personalY = y;
  const dobBoxW = 24;
  const sexBoxW = 8;
  doc.setFontSize(FONT_SMALL);
  doc.setFont(undefined, "normal");
  // Date of Birth, Sex, Scheme Code — белый фон инпутов
  drawLabelLeftBoxRight(doc, MARGIN, candBoxX, personalY, dobBoxW, PERSONAL_ROW_HEIGHT, "Date of Birth", formatDate(client.date_of_birth), { valueFill: false });
  const sexLabelW = doc.getTextWidth("Sex");
  const sexBoxX = candBoxX + dobBoxW + BETWEEN_GROUPS_GAP + sexLabelW + LABEL_TO_BOX_GAP;
  drawLabelLeftBoxRight(doc, candBoxX + dobBoxW + BETWEEN_GROUPS_GAP, sexBoxX, personalY, sexBoxW, PERSONAL_ROW_HEIGHT, "Sex", formatValue(client.sex), { valueFill: false });
  const schemeLabelW = doc.getTextWidth("Scheme Code");
  const schemeBoxX = sexBoxX + sexBoxW + BETWEEN_GROUPS_GAP + schemeLabelW + LABEL_TO_BOX_GAP;
  const schemeBoxW = photoX - schemeBoxX - photoGap;
  drawLabelLeftBoxRight(doc, sexBoxX + sexBoxW + BETWEEN_GROUPS_GAP, schemeBoxX, personalY, schemeBoxW, PERSONAL_ROW_HEIGHT, "Scheme Code", formatValue(client.scheme_code), { valueFill: false });
  y = personalY + PERSONAL_ROW_HEIGHT + 3;

  const fullBoxW = photoX + photoW - candBoxX;
  y = drawLabelLeftBoxRight(doc, MARGIN, candBoxX, y, fullBoxW, PERSONAL_ROW_HEIGHT, "Country or Region of Origin", formatValue(client.country || client.region), { valueFill: false, wrapLabel: true }) + 3;
  y = drawLabelLeftBoxRight(doc, MARGIN, candBoxX, y, fullBoxW, PERSONAL_ROW_HEIGHT, "Country of Nationality", formatValue(client.country_of_nationality || client.country), { valueFill: false }) + 3;
  y = drawLabelLeftBoxRight(doc, MARGIN, candBoxX, y, fullBoxW, PERSONAL_ROW_HEIGHT, "First Language", formatValue(client.first_language), { valueFill: false }) + 6;

  y += 5;

  // ----- TEST RESULTS: label above each block; each block = | score | CEFR | -----
  doc.setFontSize(FONT_BASE);
  doc.setFont(undefined, "bold");
  doc.text("Test Results", MARGIN, y);
  y += 6;

  const formatScore = (s) => {
    if (s === null || s === undefined || s === "") return "";
    const n = Number(s);
    return isNaN(n) ? "" : n.toFixed(1);
  };
  const scores = [
    results?.listening?.score,
    results?.reading?.score,
    results?.writing?.score,
    results?.speaking?.score,
  ];
  const overallScore = calculateOverallScore(scores) ?? client.total_score;
  const allScores = [...scores.map(formatScore), formatScore(overallScore)];
  const labels = ["Listening", "Reading", "Writing", "Speaking", "Overall Band Score"];

  const scoreCellSize = 10;
  const overallWider = 4;
  const oneBlockW = scoreCellSize * 2 + 1;
  const overallBlockW = oneBlockW + overallWider;
  const totalBlocksW = oneBlockW * 4 + overallBlockW;
  const scoreBlockGap = (contentWidth - totalBlocksW) / 4;
  let blockX = MARGIN;

  const scoreLabelToBoxGap = 2;
  for (let i = 0; i < 5; i++) {
    const isOverall = i === 4;
    const blockWidth = isOverall ? overallBlockW : oneBlockW;
    doc.setFontSize(FONT_SMALL);
    doc.setFont(undefined, "bold");
    doc.text(labels[i], blockX + blockWidth / 2, y, { align: "center" });
    const rowY = y + scoreLabelToBoxGap;
    const scoreVal = allScores[i] || "";
    const cefrVal = isOverall ? scoreToCEFR(overallScore) : scoreToCEFR(scores[i]);
    const cellSize = scoreCellSize;
    if (isOverall) {
      doc.setFillColor(...FILL_LIGHT_GRAY);
      doc.rect(blockX, rowY, blockWidth, cellSize, "FD");
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(scoreVal, blockX + blockWidth / 2, rowY + cellSize / 2 + 1.5, { align: "center" });
    } else {
      doc.setFillColor(...FILL_LIGHT_GRAY);
      doc.rect(blockX, rowY, cellSize, cellSize, "FD");
      doc.setFillColor(255, 255, 255);
      doc.rect(blockX + cellSize + 0.5, rowY, cellSize, cellSize, "FD");
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(BORDER);
      doc.rect(blockX, rowY, cellSize, cellSize);
      doc.rect(blockX + cellSize + 0.5, rowY, cellSize, cellSize);
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(scoreVal, blockX + cellSize / 2, rowY + cellSize / 2 + 1.5, { align: "center" });
      doc.setFontSize(FONT_SMALL);
      doc.setFont(undefined, "normal");
      doc.text(cefrVal, blockX + cellSize + 0.5 + cellSize / 2, rowY + cellSize / 2 + 1.5, { align: "center" });
    }
    doc.setFontSize(FONT_SMALL);
    blockX += blockWidth + scoreBlockGap;
  }
  y += scoreLabelToBoxGap + scoreCellSize + 8;

  // ----- ADMIN SECTION: Left Administrator Comments (large box), Right Centre Stamp + Validation Stamp (side by side) -----
  const adminH = 22;
  const adminLeftW = contentWidth * 0.55;
  const adminRightW = contentWidth * 0.45 - 4;
  const stampGap = 4;
  const stampBoxH = 16;
  const stampW = (adminRightW - stampGap) / 2;
  const stampAreaX = MARGIN + adminLeftW + 4;
  const stampTextTopPadding = 4;
  doc.setFontSize(FONT_SMALL);
  doc.setFont(undefined, "normal");
  doc.text("Administrator Comments", MARGIN, y);
  y += 3.5;
  doc.rect(MARGIN, y, adminLeftW, adminH);
  doc.rect(stampAreaX, y, stampW, stampBoxH);
  doc.rect(stampAreaX + stampW + stampGap, y, stampW, stampBoxH);
  doc.setFont(undefined, "bold");
  doc.text("Centre Stamp", stampAreaX + stampW / 2, y + stampTextTopPadding, { align: "center" });
  doc.text("Validation Stamp", stampAreaX + stampW + stampGap + stampW / 2, y + stampTextTopPadding, { align: "center" });
  y += Math.max(adminH, stampBoxH) + 6;

  // ----- SIGNATURE + DATE -----
  const sigLineW = contentWidth * 0.4;
  doc.line(MARGIN, y + 3, MARGIN + sigLineW, y + 3);
  doc.setFontSize(FONT_SMALL);
  doc.text("Administrator's Signature", MARGIN + sigLineW / 2, y + 7, { align: "center" });
  const dateBoxX = MARGIN + sigLineW + 8;
  const dateBoxW = 28;
  const dateBoxH = 8;
  doc.setFillColor(...FILL_LIGHT_GRAY);
  doc.rect(dateBoxX, y, dateBoxW, dateBoxH, "FD");
  doc.setDrawColor(0, 0, 0);
  doc.rect(dateBoxX, y, dateBoxW, dateBoxH);
  doc.setFontSize(FONT_SMALL);
  doc.setFont(undefined, "normal");
  doc.text("Issue Date", dateBoxX + 2, y + 3);
  doc.setFont(undefined, "bold");
  doc.text(formatDate(client.date || client.created_at), dateBoxX + 2, y + 6.5);
  y += 14;

  // ----- BOTTOM INFO ROW: UKVI CEFR Threshold (tick boxes, white) | UKVI Unique Ref (gray) | Test Report Form Number (gray) -----
  const bottomRowH = 10;
  const thirdW = contentWidth / 3 - 3;
  const leftThirdX = MARGIN;
  const midThirdX = MARGIN + contentWidth / 3 + 2;
  const rightThirdX = MARGIN + (contentWidth / 3) * 2 + 2;
  const bottomLabelH = 4;
  const bottomValueH = bottomRowH - bottomLabelH;

  doc.rect(leftThirdX, y, thirdW, bottomRowH);
  doc.setFontSize(6);
  doc.setFont(undefined, "normal");
  doc.text("(UKVI CEFR Threshold Met)", leftThirdX + 2, y + 3);
  const tickSize = 2.5;
  const tickY = y + 5;
  ["B1", "B2", "C1", "C2"].forEach((label, idx) => {
    const tx = leftThirdX + 4 + idx * (tickSize + 6);
    doc.rect(tx, tickY, tickSize, tickSize);
    doc.text(label, tx + tickSize + 1, tickY + tickSize / 2 + 1);
  });

  doc.setFontSize(FONT_SMALL);
  doc.text("UKVI Unique Reference Number", midThirdX + 2, y + 3);
  doc.setFillColor(...FILL_LIGHT_GRAY);
  doc.rect(midThirdX, y + bottomLabelH, thirdW, bottomValueH, "FD");
  doc.setDrawColor(0, 0, 0);
  doc.rect(midThirdX, y + bottomLabelH, thirdW, bottomValueH);
  doc.setFont(undefined, "bold");
  doc.text(formatValue(client.ukvi_reference_number), midThirdX + 2, y + bottomLabelH + bottomValueH / 2 + 1.5);

  doc.setFont(undefined, "normal");
  doc.text("Test Report Form Number", rightThirdX + 2, y + 3);
  doc.setFillColor(...FILL_LIGHT_GRAY);
  doc.rect(rightThirdX, y + bottomLabelH, thirdW, bottomValueH, "FD");
  doc.setDrawColor(0, 0, 0);
  doc.rect(rightThirdX, y + bottomLabelH, thirdW, bottomValueH);
  doc.setFont(undefined, "bold");
  const formNumber = client.id ? String(client.id).replace(/-/g, "").toUpperCase().slice(0, 20) : "";
  doc.text(formNumber || "", rightThirdX + 2, y + bottomLabelH + bottomValueH / 2 + 1.5);
  y += bottomRowH + 6;

  // ----- FOOTER: centered verification sentence 7px -----
  doc.setFontSize(FONT_SMALL);
  doc.setFont(undefined, "normal");
  const verificationText = "The validity of this IELTS Test Report Form can be verified online by recognising organisations at ielts.org/verify";
  doc.text(verificationText, pageWidth / 2, Math.min(y, pageHeight - MARGIN - 4), { align: "center" });

  const versionText = `Version: ${formatValue(client.version || settings?.version || "1.0")}`;
  doc.setFontSize(6);
  doc.text(versionText, pageWidth - MARGIN, pageHeight - MARGIN, { align: "right" });

  const fileName = `IELTS_TRF_${candidateId || "report"}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};
