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
 * @param {string} testType - Type of test (e.g., "Reading", "Listening", "Writing")
 * @returns {Promise<number>} - The Y position after the header
 */
export const addBrandHeader = async (doc, pageWidth, testType, settings = {}) => {
    const margin = 20;
    let yPos = margin;
    const logoSize = 24;
    const iconSize = 2; // Size for social media icons
    const primaryColor = [59, 130, 246]; // #3B82F6 - Primary blue
    const darkGray = [31, 41, 55]; // #1F2937 - Dark gray for text
    const lightGray = [243, 244, 246]; // #F3F4F6 - Light gray for backgrounds
  
    // Add top line separator
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);
    yPos = margin;

    // Format contact information with labels and icons
    const formatContactInfo = (type, value) => {
      if (!value || String(value).trim() === '') return null;
      const val = String(value).trim();
      
      switch (type) {
        case 'support_link':
          // Check if it's an email or a URL
          if (val.includes('@')) {
            return { text: val, icon: 'email' };
          } else {
            return { text: val, icon: null };
          }
        case 'telegram_admin_username':
          return { text: val, icon: 'telegram' };
        case 'phone_number':
          return { text: val, icon: 'phone' };
        case 'instagram_channel':
          return { text: val, icon: 'instagram' };
        case 'telegram_channel':
          return { text: val, icon: 'telegram' };
        default:
          return { text: val, icon: null };
      }
    };

    const contactInfo = [
      formatContactInfo('support_link', settings?.support_link),
      formatContactInfo('telegram_admin_username', settings?.telegram_admin_username),
      formatContactInfo('phone_number', settings?.phone_number),
      formatContactInfo('instagram_channel', settings?.instagram_channel),
      formatContactInfo('telegram_channel', settings?.telegram_channel),
    ].filter((val) => val != null);

    try {
      // Header background box with rounded corners effect
      const headerHeight = 50;
      doc.setFillColor(...lightGray);
      doc.roundedRect(margin, yPos, pageWidth - 2 * margin, headerHeight, 2, 2, 'F');
      
      // Load and add logo
      const logoUrl = '/logo.png';
      const logoDataUrl = await imageToBase64(logoUrl);
      const logoX = margin + 8;
      const logoY = yPos + (headerHeight - logoSize) / 2;
      doc.addImage(logoDataUrl, 'png', logoX, logoY, logoSize, logoSize);
  
      // Company name next to logo
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.setFont(undefined, 'bold');
      const companyX = logoX + logoSize + 8;
      const companyY = logoY + logoSize / 2 - 2;
      doc.text('IELTSCORE', companyX, companyY);
      
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
          email: imageToBase64('/gmail.png').catch(() => null),
        };
        
        const icons = {
          telegram: await iconPromises.telegram,
          instagram: await iconPromises.instagram,
          phone: await iconPromises.phone,
          email: await iconPromises.email,
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
      doc.text('IELTSCORE', margin + 8, yPos + 15);
      
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
          telegram: imageToBase64('/telegram.png').catch(() => null),
          instagram: imageToBase64('/instagram.png').catch(() => null),
          phone: imageToBase64('/phone.png').catch(() => null),
          email: imageToBase64('/gmail.png').catch(() => null),
        };
        
        const icons = {
          telegram: await iconPromises.telegram,
          instagram: await iconPromises.instagram,
          phone: await iconPromises.phone,
          email: await iconPromises.email,
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