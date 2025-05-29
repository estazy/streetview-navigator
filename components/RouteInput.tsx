
import React, { useState, useRef, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

// Fix: Declared 'google' as 'any' to suppress TypeScript errors for Google Maps types, as type definitions were not being found.
declare const google: any;

interface RouteInputProps {
  start: string;
  onStartChange: (value: string) => void;
  end: string;
  onEndChange: (value: string) => void;
  onSearch: () => void;
  disabled: boolean;
}

export const RouteInput: React.FC<RouteInputProps> = ({ start, onStartChange, end, onEndChange, onSearch, disabled }) => {
  const { t, language } = useLocalization();
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkApi = () => {
      // Fix: Cast window to any to access google maps property without full Window type definition.
      if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
        setIsApiLoaded(true);
      } else {
        setTimeout(checkApi, 100); 
      }
    };
    checkApi();
  }, []);

  useEffect(() => {
    if (isApiLoaded && startInputRef.current && endInputRef.current) {
      const startAutocomplete = new google.maps.places.Autocomplete(startInputRef.current);
      startAutocomplete.addListener('place_changed', () => {
        const place = startAutocomplete.getPlace();
        onStartChange(place.formatted_address || place.name || '');
      });

      const endAutocomplete = new google.maps.places.Autocomplete(endInputRef.current);
      endAutocomplete.addListener('place_changed', () => {
        const place = endAutocomplete.getPlace();
        onEndChange(place.formatted_address || place.name || '');
      });
    }
  }, [isApiLoaded, onStartChange, onEndChange]);

  const getButtonText = () => {
    if (disabled && !isApiLoaded) return t.searchButtonLoadingApi;
    if (disabled) return t.searchButtonSearching;
    return language === 'en' ? "Get Ride" : t.searchButtonGetRide;
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch justify-center gap-2">
      <input
        ref={startInputRef}
        type="text"
        placeholder={t.startPlaceholder}
        value={start}
        onChange={(e) => onStartChange(e.target.value)}
        className="p-2.5 text-sm border border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-gray-700 text-white placeholder-gray-400 w-full sm:flex-1 transition-colors duration-200"
        disabled={disabled || !isApiLoaded}
        aria-label={t.startPlaceholder}
      />
      <input
        ref={endInputRef}
        type="text"
        placeholder={t.endPlaceholder}
        value={end}
        onChange={(e) => onEndChange(e.target.value)}
        className="p-2.5 text-sm border border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-gray-700 text-white placeholder-gray-400 w-full sm:flex-1 transition-colors duration-200"
        disabled={disabled || !isApiLoaded}
        aria-label={t.endPlaceholder}
      />
      <button
        onClick={onSearch}
        disabled={disabled || !start || !end}
        className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 disabled:bg-gray-500 text-white font-semibold py-2.5 px-5 text-sm rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105 disabled:transform-none"
      >
        {getButtonText()}
      </button>
    </div>
  );
};
