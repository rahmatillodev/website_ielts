// components/pdf/PdfContainer.jsx
import React from 'react';

const PdfContainer = ({ children, innerRef }) => {
  return (
    <div 
      ref={innerRef}
      style={{
        // Гарантируем, что Tailwind не влияет на содержимое
        all: 'initial',
        // Но восстанавливаем базовые стили для PDF
        fontFamily: 'Arial, Helvetica, sans-serif',
        display: 'block'
      }}
    >
      {children}
    </div>
  );
};

export default PdfContainer;