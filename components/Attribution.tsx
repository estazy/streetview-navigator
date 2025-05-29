
import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

export const Attribution: React.FC = () => {
  const { t } = useLocalization();
  return (
    <div className="text-center text-xs text-gray-500 py-1.5 px-4 bg-gray-900">
      {t.poweredBy} <a href="https://cloud.google.com/maps-platform/" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300">Google Maps Platform</a>
      {process.env.API_KEY && (
         <>
          {' '}{t.and} <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300">Gemini API</a>
         </>
      )}
      . {t.simulationDisclaimer}
    </div>
  );
};
