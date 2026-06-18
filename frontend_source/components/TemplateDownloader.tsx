// src/components/TemplateDownloader.js

import React from 'react';
import { generateExcelFile } from '../utils/excelUtils';
import '../styles/FileTemplateSelector.css';
import { template } from '../config/settings';

const TemplateDownloader: React.FC = () => {
  const handleDownload = (): void => {
    const templateFileName = `Plantilla - ${template.name}.xlsx`;
    generateExcelFile(template, [], templateFileName); // Pass empty data array if no data
  };

  return (
    <div>
      <h2 className="title">Plantillas</h2>
      <div className="button-container">
        <button onClick={handleDownload} className="download-button">
          {template.name}
        </button>
      </div>
    </div>
  );
};

export default TemplateDownloader;
