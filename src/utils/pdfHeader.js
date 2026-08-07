import { CONTACT } from '@/lib/contact';

/**
 * Converts an image URL to base64 data URL for use in jsPDF
 * @param {string} url - The image URL
 * @returns {Promise<string>} - Base64 data URL
 */
export const imageToBase64 = (url, options = {}) => {
  const {
    maxWidth = 64,
    maxHeight = 64,
    quality = 0.9,     // 0.4–0.7 ideal
    format = 'image/png',
    sharpen = false  
  } = options;
  const imageCache = {};

  if (imageCache[url]) {
    return Promise.resolve(imageCache[url]);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    if (url.startsWith('http') && !url.startsWith(window.location.origin)) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      let { width, height } = img;

      // 🔽 resize logic
      const scale = Math.min(maxWidth / width, maxHeight / height, 1);
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // 🔥 soft sharpen
      if (sharpen) {
        ctx.globalAlpha = 0.35;                  // kuchi
        ctx.filter = 'contrast(1.08)';           // tiniqlik
        ctx.drawImage(canvas, 0, 0, width, height);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }

      const dataURL = canvas.toDataURL(format, quality);

      // cache
      imageCache[url] = dataURL;
      resolve(dataURL);
    };

    img.onerror = reject;
    img.src = url;
  });
};


  


/**
 * Adds the brand header to the PDF document
 * @param {jsPDF} doc - The jsPDF document instance
 * @param {number} pageWidth - The page width
 * @param {string} testType - Type of test (e.g., "Reading", "Listening", "Writing")
 * @returns {Promise<number>} - The Y position after the header
 */
export const addBrandHeader = async (doc, pageWidth, testType) => {
    const margin = 20;
    let yPos = margin;
    const logoSize = 24;
    const iconSize = 2; // Size for social media icons
    // The brand red, #e30613. jsPDF takes 0-255 components, not CSS, so this
    // cannot be a token — keep it in step with --brand-600 by hand.
    const primaryColor = [227, 6, 19];
    const darkGray = [31, 41, 55]; // #1F2937 - Dark gray for text
    const lightGray = [243, 244, 246]; // #F3F4F6 - Light gray for backgrounds
  
    // Add top line separator
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);
    yPos = margin;

    // The public contact block: one Telegram, the phone, and Instagram. Every
    // line is drawn with doc.text, never doc.textWithLink or doc.link, so the
    // PDF carries no clickable annotation over any of it.
    const contactInfo = [
      { text: CONTACT.telegram, icon: 'telegram' },
      { text: CONTACT.phone, icon: 'phone' },
      { text: CONTACT.instagram, icon: 'instagram' },
    ];

    try {
      // Header background box with rounded corners effect
      const headerHeight = 50;
      doc.setFillColor(...lightGray);
      doc.roundedRect(margin, yPos, pageWidth - 2 * margin, headerHeight, 2, 2, 'F');
      
      // Load and add logo
      // Kvadrat ikonka: PDF logoni logoSize x logoSize qilib chizadi (addImage), shuning uchun
      // keng wordmark (2250x994) siqilib ketardi. logo-icon.png kvadrat (512x512).
      const logoUrl = '/logo-icon.png';
      const logoDataUrl = await imageToBase64(logoUrl, {
        maxWidth: 64,
        maxHeight: 64,
        quality: 0.7,
        format: 'image/png',
        sharpen: true
      });
            const logoX = margin + 8;
      const logoY = yPos + (headerHeight - logoSize) / 2;
      doc.addImage(logoDataUrl, 'png', logoX, logoY, logoSize, logoSize);
  
      // Company name next to logo
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.setFont(undefined, 'bold');
      const companyX = logoX + logoSize + 8;
      const companyY = logoY + logoSize / 2 - 2;
      doc.text('EDU', companyX, companyY);
      
      // Subtitle
      doc.setFontSize(7);
      doc.setTextColor(...darkGray);
      doc.setFont(undefined, 'normal');
      doc.text('IELTS Preparation Platform', companyX, companyY + 5);
  
      // Contact information on the right
      if (contactInfo.length > 0) {
        doc.setFontSize(7);
        doc.setTextColor(...darkGray);
        doc.setFont(undefined, 'normal');
        const rightAlignX = pageWidth - margin - 8;
        let contactY = logoY + 2;
        
        // Load icons from public folder
        const iconPromises = {
          telegram: imageToBase64('/telegram.png').catch(() => null),
          instagram: imageToBase64('/instagram.png').catch(() => null),
          phone: imageToBase64('/phone.png').catch(() => null),
        };

        const icons = {
          telegram: await iconPromises.telegram,
          instagram: await iconPromises.instagram,
          phone: await iconPromises.phone,
        };

        for (const contact of contactInfo) {
          let textX = rightAlignX;
          
          // Add icon if available
          if (contact.icon && icons[contact.icon]) {
            const iconX = rightAlignX - iconSize - 2;
            doc.addImage(icons[contact.icon], 'png', iconX, contactY - iconSize / 2 - 0.9, iconSize, iconSize);
            textX = iconX - 2; // Adjust text position
          }
          
          doc.text(contact.text, textX, contactY, { align: 'right' });
          contactY += 4;
        }
      }
  
      // Bottom border of header box
      const borderY = yPos + headerHeight;
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(1);
      doc.line(margin, borderY, pageWidth - margin, borderY);
  
      // Title section with accent
      const titleY = borderY + 18;
      
      // Title background accent
      doc.setFillColor(...primaryColor);
      doc.roundedRect(margin, titleY - 8, 4, 20, 1, 1, 'F');
      
      // Main title
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...primaryColor);
      const titleText = testType === 'writing' 
        ? 'IELTS Writing Tasks' 
        : `IELTS ${testType || 'Test'} Test Results`;
      doc.text(titleText, margin + 10, titleY + 4);
      
      // Subtitle with date
      doc.setFontSize(9);
      doc.setTextColor(...darkGray);
      doc.setFont(undefined, 'normal');
      const dateStr = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      doc.text(`Generated on ${dateStr}`, margin + 10, titleY + 10);
  
      return titleY + 20;
    } catch (error) {
      console.warn('Failed to load logo, using text-only header:', error);
      // Fallback: text-only header with improved design
      const headerHeight = 45;
      doc.setFillColor(...lightGray);
      doc.roundedRect(margin, yPos, pageWidth - 2 * margin, headerHeight, 2, 2, 'F');
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('EDU', margin + 8, yPos + 15);
      
      doc.setFontSize(7);
      doc.setTextColor(...darkGray);
      doc.setFont(undefined, 'normal');
      doc.text('IELTS Preparation Platform', margin + 8, yPos + 22);
  
      if (contactInfo.length > 0) {
        doc.setFontSize(7);
        doc.setTextColor(...darkGray);
        const rightAlignX = pageWidth - margin - 8;
        let contactY = yPos + 8;
        
        // Load icons from public folder
        const iconPromises = {
          telegram: imageToBase64('/telegram.png', { maxWidth: 24, maxHeight: 24, quality: 0.6 }).catch(() => null),
          instagram: imageToBase64('/instagram.png', { maxWidth: 24, maxHeight: 24, quality: 0.6 }).catch(() => null),
          phone: imageToBase64('/phone.png', { maxWidth: 24, maxHeight: 24, quality: 0.6 }).catch(() => null),
        };


        const icons = {
          telegram: await iconPromises.telegram,
          instagram: await iconPromises.instagram,
          phone: await iconPromises.phone,
        };

        for (const contact of contactInfo) {
          let textX = rightAlignX;
          
          // Add icon if available
          if (contact.icon && icons[contact.icon]) {
            const iconX = rightAlignX - iconSize - 2;
            doc.addImage(icons[contact.icon], 'png', iconX, contactY - iconSize / 2, iconSize, iconSize);
            textX = iconX - 2; // Adjust text position
          }
          
          doc.text(contact.text, textX, contactY, { align: 'right' });
          contactY += 4;
        }
      }
  
      const borderY = yPos + headerHeight;
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(1);
      doc.line(margin, borderY, pageWidth - margin, borderY);
  
      const titleY = borderY + 18;
      doc.setFillColor(...primaryColor);
      doc.roundedRect(margin, titleY - 8, 4, 20, 1, 1, 'F');
      
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...primaryColor);
      const titleText = testType === 'writing' 
        ? 'IELTS Writing Tasks' 
        : `IELTS ${testType || 'Test'} Test Results`;
      doc.text(titleText, margin + 10, titleY + 4);
      
      doc.setFontSize(9);
      doc.setTextColor(...darkGray);
      doc.setFont(undefined, 'normal');
      const dateStr = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      doc.text(`Generated on ${dateStr}`, margin + 10, titleY + 10);
  
      return titleY + 20;
    }
  };