import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

interface ErrorDisplayProps {
  message: string;
  onClose?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onClose }) => {
  const { t } = useLocalization();
  if (!message) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-600 text-white p-4 rounded-lg shadow-xl z-50 w-11/12 max-w-md" role="alert">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{t.errorTitle}</span>
        {onClose && (
          <button onClick={onClose} className="text-red-100 hover:text-white" aria-label={t.closeErrorLabel}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      <p className="mt-2 text-sm">{message}</p>
    </div>
  );
};