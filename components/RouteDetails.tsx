
import React, { useEffect, useRef, useState } from 'react';
import { AppRoute } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';

// SVG Icon for Play/Speaker
const SpeakerPlayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.348 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.945.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
    <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
  </svg>
);

// SVG Icon for Pause
const SpeakerPauseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75V18a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75V18a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
  </svg>
);


interface RouteDetailsProps {
  route: AppRoute | null; // Current route data, including Gemini summary
  currentStepInfo: string | null; // Textual information about the current Street View segment
  currentDirectionsStepIndex: number | null; // Index of the currently highlighted turn-by-turn direction
}

export const RouteDetails: React.FC<RouteDetailsProps> = ({ route, currentStepInfo, currentDirectionsStepIndex }) => {
  const { t, language } = useLocalization(); // Localization hook
  const stepItemRefs = useRef<Array<HTMLLIElement | null>>([]); // Refs for each turn-by-turn list item for scrolling
  const firstLeg = route?.googleMapsRoute?.routes?.[0]?.legs?.[0]; // First leg of the Google Maps route

  // State for text-to-speech (TTS) functionality
  const [isSpeechApiAvailable, setIsSpeechApiAvailable] = useState(false); // Whether browser supports SpeechSynthesis
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]); // List of available TTS voices
  const [isPlayingNarration, setIsPlayingNarration] = useState(false); // Is TTS currently active (speaking or paused)
  const [isNarrationPaused, setIsNarrationPaused] = useState(false); // Is TTS specifically in a paused state
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null); // Ref for the current SpeechSynthesisUtterance instance

  // Effect to check for SpeechSynthesis API availability and load voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      setIsSpeechApiAvailable(true);
      const updateVoices = () => {
        setAvailableVoices(speechSynthesis.getVoices()); // Get available voices
      };
      updateVoices(); // Initial call
      speechSynthesis.addEventListener('voiceschanged', updateVoices); // Listen for changes in available voices
      
      // Cleanup function: remove listener and cancel any ongoing speech
      return () => {
        speechSynthesis.removeEventListener('voiceschanged', updateVoices);
        if (speechSynthesis.speaking || speechSynthesis.paused) {
          speechSynthesis.cancel(); // Stop TTS
        }
        // Clean up utterance event handlers to prevent memory leaks or errors on unmount
        if (utteranceRef.current) {
            utteranceRef.current.onstart = null;
            utteranceRef.current.onpause = null;
            utteranceRef.current.onresume = null;
            utteranceRef.current.onend = null;
            utteranceRef.current.onerror = null;
        }
        utteranceRef.current = null; // Clear the ref
      };
    } else {
      setIsSpeechApiAvailable(false); // Speech API not supported
    }
  }, []); // Runs once on mount

  // Effect to stop and reset TTS when the route summary or language changes
  useEffect(() => {
    // If TTS is active, cancel it
    if (speechSynthesis.speaking || speechSynthesis.paused) {
      speechSynthesis.cancel(); 
      // Note: `cancel()` should trigger the `onend` or `onerror` of the current utterance,
      // which will then reset isPlayingNarration and isNarrationPaused states.
    }
    // Explicitly reset state here as a safeguard or if `cancel` doesn't fire `onend` reliably in all browsers for cleanup.
    setIsPlayingNarration(false);
    setIsNarrationPaused(false);
    // Clean up old utterance event handlers if any exist from a previous summary/language
    if (utteranceRef.current) {
        utteranceRef.current.onstart = null;
        utteranceRef.current.onpause = null;
        utteranceRef.current.onresume = null;
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
    }
    utteranceRef.current = null; // Clear the utterance ref
  }, [route?.geminiSummary, language]); // Re-runs if summary or language changes


  // Handler to toggle play/pause/resume for the Gemini route narrative
  const handleToggleNarration = () => {
    if (!isSpeechApiAvailable || !route?.geminiSummary) return; // Do nothing if API unavailable or no summary

    if (isPlayingNarration && !isNarrationPaused) { // Case 1: Currently playing -> Pause
      speechSynthesis.pause();
      // The 'onpause' event handler on the utterance will set isNarrationPaused = true
    } else if (isPlayingNarration && isNarrationPaused) { // Case 2: Currently paused -> Resume
      speechSynthesis.resume();
      // The 'onresume' event handler on the utterance will set isNarrationPaused = false
    } else { // Case 3: Stopped or finished -> Start new narration
      if (speechSynthesis.speaking || speechSynthesis.paused) { // Safety check: clear any lingering speech
        speechSynthesis.cancel();
      }

      // Create a new utterance with the Gemini summary
      const newUtterance = new SpeechSynthesisUtterance(route.geminiSummary);
      utteranceRef.current = newUtterance; // Store it in the ref

      // Attempt to select a voice matching the current app language
      const targetLang = language === 'th' ? 'th-TH' : 'en-US'; // Full language code
      const targetLangShort = language; // Short language code ('th' or 'en')
      
      let selectedVoice = availableVoices.find(voice => voice.lang === targetLang);
      if (!selectedVoice) { // If exact match not found, try matching by short code (e.g., 'en' for 'en-GB')
        selectedVoice = availableVoices.find(voice => voice.lang.startsWith(targetLangShort));
      }
      if (selectedVoice) {
        newUtterance.voice = selectedVoice; // Set the selected voice
      }
      newUtterance.lang = targetLang; // Explicitly set the language of the utterance content

      // Define event handlers for the utterance lifecycle
      newUtterance.onstart = () => {
        setIsPlayingNarration(true);
        setIsNarrationPaused(false);
      };
      newUtterance.onpause = () => {
        setIsNarrationPaused(true); // Set paused state (e.g., when speechSyntesis.pause() is called)
      };
      newUtterance.onresume = () => {
        setIsNarrationPaused(false); // Clear paused state
      };
      newUtterance.onend = () => { // When speech finishes naturally or is cancelled
        setIsPlayingNarration(false);
        setIsNarrationPaused(false);
        utteranceRef.current = null; // Clear utterance ref as it's no longer active
      };
      newUtterance.onerror = (event) => { // Handle speech errors
        console.error('Speech synthesis error:', event.error);
        setIsPlayingNarration(false);
        setIsNarrationPaused(false);
        utteranceRef.current = null; // Clear utterance ref
      };
      speechSynthesis.speak(newUtterance); // Start speaking
    }
  };

  // Effect to manage the array of refs for turn-by-turn step list items
  // This is needed to scroll the active step into view.
  useEffect(() => {
    if (firstLeg?.steps) {
      // Ensure stepItemRefs array has the same length as the number of steps
      stepItemRefs.current = Array(firstLeg.steps.length).fill(null).map((_, i) => stepItemRefs.current[i] || null);
    } else {
      stepItemRefs.current = []; // Clear refs if no steps
    }
  }, [firstLeg?.steps]); // Re-run if steps change

  // Effect to scroll the current turn-by-turn direction step into view
  useEffect(() => {
    if (currentDirectionsStepIndex !== null && 
        currentDirectionsStepIndex >= 0 && 
        currentDirectionsStepIndex < stepItemRefs.current.length && 
        stepItemRefs.current[currentDirectionsStepIndex]) { // Check if ref exists
      stepItemRefs.current[currentDirectionsStepIndex]?.scrollIntoView({
        behavior: 'smooth', // Smooth scroll
        block: 'nearest',   // Scroll to the nearest edge of the container
      });
    }
  }, [currentDirectionsStepIndex]); // Re-run when the current step index changes

  // If no route is planned, display a placeholder message
  if (!route) {
    return (
      <div className="p-3 text-center text-gray-400 h-full flex items-center justify-center">
        <p className="text-sm">{t.noRoutePlanned}</p>
      </div>
    );
  }

  const { geminiSummary } = route;

  // Determine the accessible label for the narration button based on its state
  let narrationButtonLabel = t.readAloudLabel;
  if (isPlayingNarration && !isNarrationPaused) {
    narrationButtonLabel = t.pauseNarrationLabel;
  } else if (isPlayingNarration && isNarrationPaused) {
    narrationButtonLabel = t.resumeNarrationLabel;
  }

  return (
    <div className="p-2 sm:p-3 h-full flex flex-col text-xs sm:text-sm">
      {/* Display current Street View step information if available */}
      {currentStepInfo && (
        <div className="mb-2.5 p-2 bg-teal-700 bg-opacity-50 rounded-md">
          <h3 className="text-sm sm:text-base font-semibold text-teal-300 mb-0.5">{t.currentViewTitle}</h3>
          <p className="text-gray-200 text-xs sm:text-sm">{currentStepInfo}</p>
        </div>
      )}

      {/* Display Gemini route narrative if available */}
      {geminiSummary && (
        <div className="mb-2.5">
          <h3 className="text-base sm:text-lg font-semibold text-teal-400 mb-1 flex items-center justify-between">
            <span>{t.geminiNarrativeTitle}</span>
            {/* TTS button, shown if API is available */}
            {isSpeechApiAvailable && (
              <button
                onClick={handleToggleNarration}
                disabled={!geminiSummary} // Disable if no summary (though outer condition handles this)
                className="p-1.5 rounded-full hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label={narrationButtonLabel}
                title={narrationButtonLabel}
              >
                {/* Show Pause icon if playing and not paused, otherwise Play icon */}
                {isPlayingNarration && !isNarrationPaused 
                  ? <SpeakerPauseIcon className="w-4 h-4 sm:w-5 sm:h-5 text-teal-300" /> 
                  : <SpeakerPlayIcon className="w-4 h-4 sm:w-5 sm:h-5 text-teal-300" />
                }
              </button>
            )}
          </h3>
          <div className="p-2 bg-gray-700 rounded-md max-h-36 sm:max-h-40 overflow-y-auto custom-scrollbar">
            <p className="text-gray-300 whitespace-pre-wrap text-xs sm:text-sm">{geminiSummary}</p>
          </div>
        </div>
      )}

      {/* Display turn-by-turn directions if available */}
      {firstLeg && (
        <div className="flex-grow overflow-hidden flex flex-col">
          <h3 className="text-base sm:text-lg font-semibold text-teal-400 mb-1">{t.turnByTurnTitle}</h3>
          <div className="p-0.5 bg-gray-700 rounded-md flex-grow overflow-y-auto custom-scrollbar">
            <ul className="space-y-1.5 p-1">
              {firstLeg.steps.map((step: any, index: number) => (
                <li 
                  key={index} 
                  // Assign ref to this list item for scrolling
                  ref={el => { if (el) stepItemRefs.current[index] = el; }}
                  // Highlight the current step
                  className={`p-1.5 rounded shadow-sm transition-all duration-300 ${
                    index === currentDirectionsStepIndex 
                    ? 'bg-teal-700 bg-opacity-70 border-l-2 border-teal-400' 
                    : 'bg-gray-600'
                  }`}
                >
                  <p 
                    className={`font-medium text-xs sm:text-sm ${
                      index === currentDirectionsStepIndex ? 'text-teal-100' : 'text-gray-200'
                    }`} 
                    dangerouslySetInnerHTML={{ __html: step.instructions || "N/A" }} // Instructions can contain HTML
                  ></p>
                  <div className="text-2xs sm:text-xs text-gray-400 flex justify-between mt-0.5">
                    <span>{step.distance?.text || ''}</span>
                    <span>{step.duration?.text || ''}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {/* Display total distance and duration for the route leg */}
          <div className="mt-2 pt-2 border-t border-gray-700 text-right text-xs sm:text-sm">
            <p className="font-semibold text-gray-300">{t.totalDistance}: {firstLeg.distance?.text}</p>
            <p className="font-semibold text-gray-300">{t.totalDuration}: {firstLeg.duration?.text}</p>
          </div>
        </div>
      )}
      {/* Placeholder if no route details (no summary, no directions, no current step info) are available */}
       {!firstLeg && !geminiSummary && !currentStepInfo && ( 
         <div className="p-3 text-center text-gray-400 h-full flex items-center justify-center">
          <p className="text-sm">{t.routeDetailsNotLoaded}</p>
        </div>
       )}
    </div>
  );
};
