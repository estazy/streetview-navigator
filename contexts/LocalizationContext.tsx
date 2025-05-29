import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { th } from '../locales/th';
import { en } from '../locales/en';

type Language = 'th' | 'en';
type Translations = typeof th | typeof en; // Based on the structure of your translation files

interface LocalizationContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translations;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

interface LocalizationProviderProps {
  children: ReactNode;
}

const locales: Record<Language, Translations> = {
  th,
  en,
};

export const LocalizationProvider: React.FC<LocalizationProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('th'); // Default to Thai

  useEffect(() => {
    // Optionally, try to get language from browser preferences or localStorage
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'en' || browserLang === 'th') {
      setLanguage(browserLang as Language);
    }
  }, []);
  
  const t = useMemo(() => locales[language], [language]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LocalizationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
