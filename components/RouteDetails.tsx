
import React, { useEffect, useRef } from 'react';
import { AppRoute } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';

interface RouteDetailsProps {
  route: AppRoute | null;
  currentStepInfo: string | null;
  currentDirectionsStepIndex: number | null; // Added for synchronization
}

export const RouteDetails: React.FC<RouteDetailsProps> = ({ route, currentStepInfo, currentDirectionsStepIndex }) => {
  const { t } = useLocalization();
  // Fix: Use 'any' for Google Maps types to suppress TypeScript errors when full type definitions are not available.
  const stepItemRefs = useRef<Array<HTMLLIElement | null>>([]);

  // Derive firstLeg here, before any early returns. It might be undefined if route is null.
  const firstLeg = route?.googleMapsRoute?.routes?.[0]?.legs?.[0];

  // This useEffect is now called unconditionally.
  useEffect(() => {
    if (firstLeg?.steps) {
      // Ensure refs array is the correct size
      stepItemRefs.current = Array(firstLeg.steps.length).fill(null).map((_, i) => stepItemRefs.current[i] || null);
    } else {
      // If no steps (e.g., route is null or has no steps), clear the refs array
      stepItemRefs.current = [];
    }
  }, [firstLeg?.steps]);

  // This useEffect is also called unconditionally.
  useEffect(() => {
    if (currentDirectionsStepIndex !== null && 
        currentDirectionsStepIndex >= 0 && 
        currentDirectionsStepIndex < stepItemRefs.current.length && 
        stepItemRefs.current[currentDirectionsStepIndex]) {
      stepItemRefs.current[currentDirectionsStepIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentDirectionsStepIndex]);

  if (!route) { // Early return is now fine as all hooks have been called.
    return (
      <div className="p-3 text-center text-gray-400 h-full flex items-center justify-center">
        <p className="text-sm">{t.noRoutePlanned}</p>
      </div>
    );
  }

  // The rest of the component can safely use `firstLeg` which is derived above.
  const { geminiSummary } = route;
  // `googleMapsRoute` is still part of `route` if needed for other things, but `firstLeg` is more specific for steps.

  return (
    <div className="p-2 sm:p-3 h-full flex flex-col text-xs sm:text-sm">
      {currentStepInfo && (
        <div className="mb-2.5 p-2 bg-teal-700 bg-opacity-50 rounded-md">
          <h3 className="text-sm sm:text-base font-semibold text-teal-300 mb-0.5">{t.currentViewTitle}</h3>
          <p className="text-gray-200 text-xs sm:text-sm">{currentStepInfo}</p>
        </div>
      )}

      {geminiSummary && (
        <div className="mb-2.5">
          <h3 className="text-base sm:text-lg font-semibold text-teal-400 mb-1">{t.geminiNarrativeTitle}</h3>
          <div className="p-2 bg-gray-700 rounded-md max-h-36 sm:max-h-40 overflow-y-auto custom-scrollbar">
            <p className="text-gray-300 whitespace-pre-wrap text-xs sm:text-sm">{geminiSummary}</p>
          </div>
        </div>
      )}

      {firstLeg && (
        <div className="flex-grow overflow-hidden flex flex-col">
          <h3 className="text-base sm:text-lg font-semibold text-teal-400 mb-1">{t.turnByTurnTitle}</h3>
          <div className="p-0.5 bg-gray-700 rounded-md flex-grow overflow-y-auto custom-scrollbar">
            <ul className="space-y-1.5 p-1">
              {firstLeg.steps.map((step: any, index: number) => (
                <li 
                  key={index} 
                  ref={el => { if (el) stepItemRefs.current[index] = el; }}
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
                    dangerouslySetInnerHTML={{ __html: step.instructions || "N/A" }}
                  ></p>
                  <div className="text-2xs sm:text-xs text-gray-400 flex justify-between mt-0.5">
                    <span>{step.distance?.text || ''}</span>
                    <span>{step.duration?.text || ''}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-700 text-right text-xs sm:text-sm">
            <p className="font-semibold text-gray-300">{t.totalDistance}: {firstLeg.distance?.text}</p>
            <p className="font-semibold text-gray-300">{t.totalDuration}: {firstLeg.duration?.text}</p>
          </div>
        </div>
      )}
       {!firstLeg && !geminiSummary && !currentStepInfo && ( 
         <div className="p-3 text-center text-gray-400 h-full flex items-center justify-center">
          <p className="text-sm">{t.routeDetailsNotLoaded}</p>
        </div>
       )}
    </div>
  );
};
