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
export const addBrandHeader = async (doc, pageWidth, testType, settings = {}) => {
    const margin = 20;
    let yPos = margin;
    const logoSize = 20;
    const blueColor = [59, 130, 246]; // #3B82F6 in RGB
  
    const contactInfo = [
      settings?.support_link,
      settings?.telegram_admin_username,
      settings?.phone_number,
      settings?.instagram_channel,
      settings?.telegram_channel,
    ].map((val) => (val != null ? String(val) : ''));

    try {
      // Load and add logo
      const logoUrl = '/Background.svg';
      const logoDataUrl = await imageToBase64(logoUrl);
      doc.addImage(logoDataUrl, 'PNG', margin, yPos, logoSize, logoSize);
  
      // Company name below logo
      doc.setFontSize(8);
      doc.setTextColor(...blueColor);
      doc.setFont(undefined, 'normal');
      doc.text('EDUCATION CORP', margin, yPos + logoSize + 5);
  
      // Contact information on the right
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