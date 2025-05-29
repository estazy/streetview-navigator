

import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLocalization();

  return (
    <div className="absolute top-3 right-3 flex items-center gap-x-1.5 sm:gap-x-2.5 bg-gray-700 p-1.5 rounded-md shadow">
      {/* Removed the language label span that was here */}
      <button
        onClick={() => setLanguage('th')}
        className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md ${
          language === 'th' ? 'bg-teal-500 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
        } transition-colors`}
        aria-pressed={language === 'th'}
      >
        ไทย
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md ${
          language === 'en' ? 'bg-teal-500 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
        } transition-colors`}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
    </div>
  );
};