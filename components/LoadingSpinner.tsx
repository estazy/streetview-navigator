import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

export const LoadingSpinner: React.FC = () => {
  const { t } = useLocalization();
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50" role="alert" aria-live="assertive">
      <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent border-solid rounded-full animate-spin"></div>
      <p className="ml-4 text-xl text-white">{t.loadingRoute}</p>
    </div>
  );
};