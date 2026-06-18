import React from 'react';
import '../styles/LoadingOverlay.css';
import '../styles/Spinner.css';

interface LoadingOverlayProps {
  progress: number; // Recibir el progreso como prop
  currentCount: number; // Recibir el número de registros procesados
  totalCount: number;   // Recibir el total de registros
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ progress, currentCount, totalCount }) => {
  return (
    <div className="loading-overlay">
        <div className="tesseract-container">
        <div className="tesseract">
          <div className="cube outer">
            <div className="face front"></div>
            <div className="face back"></div>
            <div className="face top"></div>
            <div className="face bottom"></div>
            <div className="face left"></div>
            <div className="face right"></div>
          </div>
          <div className="cube inner">
            <div className="face front"></div>
            <div className="face back"></div>
            <div className="face top"></div>
            <div className="face bottom"></div>
            <div className="face left"></div>
            <div className="face right"></div>
          </div>
        </div>
      </div>
        
      {progress > 0 && (
        <>
          <div className="progress-container-overlay">
            <div className="progress-bar-overlay" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="progress-text-overlay">
              {currentCount === 0 
              ? "Cargando..."  // Si no hay registros procesados
              : `${currentCount} / ${totalCount} registros procesados`}  
          </div>
        </>
      )}
    </div>
  );
};

export default LoadingOverlay;
