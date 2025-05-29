
import React, { useState, useRef, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

// Global declaration for Google Maps API
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
  const [isApiLoaded, setIsApiLoaded] = useState(false); // State to track if Google Places API is ready for Autocomplete
  const startInputRef = useRef<HTMLInputElement>(null); // Ref for the start location input field
  const endInputRef = useRef<HTMLInputElement>(null);   // Ref for the end location input field

  // Effect to check periodically if the Google Maps Places API is loaded
  useEffect(() => {
    const checkApi = () => {
      // Check if google.maps.places (specifically Autocomplete) is available
      if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
        setIsApiLoaded(true); // API is ready
      } else {
        setTimeout(checkApi, 100); // Check again shortly
      }
    };
    checkApi();
  }, []); // Runs once on mount

  // Effect to initialize Google Places Autocomplete on input fields once the API is loaded
  useEffect(() => {
    if (isApiLoaded && startInputRef.current && endInputRef.current) {
      // Initialize Autocomplete for the start location input
      const startAutocomplete = new google.maps.places.Autocomplete(startInputRef.current);
      startAutocomplete.addListener('place_changed', () => {
        const place = startAutocomplete.getPlace(); // Get selected place details
        // Update start location state with formatted address or name
        onStartChange(place.formatted_address || place.name || ''); 
      });

      // Initialize Autocomplete for the end location input
      const endAutocomplete = new google.maps.places.Autocomplete(endInputRef.current);
      endAutocomplete.addListener('place_changed', () => {
        const place = endAutocomplete.getPlace(); // Get selected place details
        // Update end location state with formatted address or name
        onEndChange(place.formatted_address || place.name || '');
      });

      // Note: No explicit cleanup for Autocomplete listeners is usually needed as they are tied to the input elements.
      // If these inputs were dynamically removed/added, more complex cleanup might be required.
    }
  }, [isApiLoaded, onStartChange, onEndChange]); // Re-run if API status or change handlers change

  // Determines the text for the search button based on loading/searching state
  const getButtonText = () => {
    if (disabled && !isApiLoaded) return t.searchButtonLoadingApi; // API still loading
    if (disabled) return t.searchButtonSearching; // Search in progress
    return language === 'en' ? "Get Ride" : t.searchButtonGetRide; // Default text
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
        disabled={disabled || !isApiLoaded} // Disable if main search is disabled or Places API not ready
        aria-label={t.startPlaceholder}
      />
      <input
        ref={endInputRef}
        type="text"
        placeholder={t.endPlaceholder}
        value={end}
        onChange={(e) => onEndChange(e.target.value)}
        className="p-2.5 text-sm border border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-gray-700 text-white placeholder-gray-400 w-full sm:flex-1 transition-colors duration-200"
        disabled={disabled || !isApiLoaded} // Disable if main search is disabled or Places API not ready
        aria-label={t.endPlaceholder}
      />
      <button
        onClick={onSearch}
        disabled={disabled || !start || !end} // Disable if main search disabled or inputs are empty
        className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 disabled:bg-gray-500 text-white font-semibold py-2.5 px-5 text-sm rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105 disabled:transform-none"
      >
        {getButtonText()}
      </button>
    </div>
  );
};
