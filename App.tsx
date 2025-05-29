
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { RouteInput } from './components/RouteInput';
import { StreetViewPlayer } from './components/StreetViewPlayer';
import { MapDisplay } from './components/MapDisplay';
import { RouteDetails } from './components/RouteDetails';
import { ControlPanel } from './components/ControlPanel';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';
import { Attribution } from './components/Attribution';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { loadGoogleMapsApi, getRouteDirections, generateDetailedPathWithStepInfo, reverseGeocode } from './services/googleMapsService';
import { getGeminiRouteNarrative } from './services/geminiService';
import { AppRoute, SimulationStatus, PathSegment } from './types';
import { DEFAULT_SIMULATION_SPEED, MIN_SIMULATION_SPEED, MAX_SIMULATION_SPEED, GOOGLE_MAPS_API_KEY_PLACEHOLDER, DEFAULT_SV_STEP_DISTANCE } from './constants';
import { useLocalization } from './contexts/LocalizationContext';

// Global declaration for Google Maps API, used because @types/google.maps is not installed.
declare const google: any;

const App: React.FC = () => {
  const { t, language } = useLocalization(); // Localization hook for internationalization

  // State for route inputs
  const [startLocation, setStartLocation] = useState<string>('');
  const [endLocation, setEndLocation] = useState<string>('');

  // State for the current route and loading/error status
  const [route, setRoute] = useState<AppRoute | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleMapsApiLoaded, setIsGoogleMapsApiLoaded] = useState<boolean>(false);
  
  // State for simulation control
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus>(SimulationStatus.STOPPED);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(DEFAULT_SIMULATION_SPEED);
  const [streetViewStepDistance, setStreetViewStepDistance] = useState<number>(DEFAULT_SV_STEP_DISTANCE);
  
  // State for simulation progress and current view
  const [currentStepInfo, setCurrentStepInfo] = useState<string | null>(null); // User-facing status message (e.g., "Segment 1 of 10")
  const [progress, setProgress] = useState<number>(0); // Simulation progress percentage
  const [currentRoutePoint, setCurrentRoutePoint] = useState<any | null>(null); // Current google.maps.LatLng for Street View/Map
  const [currentDirectionsStepIndex, setCurrentDirectionsStepIndex] = useState<number | null>(null); // Index of the current turn-by-turn direction step

  // State for managing the detailed path used by StreetViewPlayer and MapDisplay
  const [detailedPathForSimulation, setDetailedPathForSimulation] = useState<PathSegment[]>([]);
  const [jumpToPathIndex, setJumpToPathIndex] = useState<number | null>(null); // Allows jumping to a specific point in the detailed path

  // Refs to store previous values needed for logic across re-renders, especially when step distance changes.
  const previousSimulationStatusRef = useRef<SimulationStatus>(SimulationStatus.STOPPED);
  const previousRoutePointRef = useRef<any | null>(null); // Stores the google.maps.LatLng before a path regeneration

  // Effect to check for Google Maps API Key and Gemini API Key configurations on mount
  useEffect(() => {
    const script = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]') as HTMLScriptElement | null;
    // Check if the placeholder API key is still in index.html
    if (script && script.src.includes(GOOGLE_MAPS_API_KEY_PLACEHOLDER)) {
      setError(t.criticalApiKeyError); // Display a critical error if placeholder is found
    }
    // Check if Gemini API key is configured in environment variables (won't work client-side without a build step)
    if (!process.env.API_KEY) {
      console.warn(t.geminiApiKeyWarning); // Log a warning if not found
    }
  }, [t]); // Depends on translation function for error messages

  // Effect to load the Google Maps API script and set a flag upon successful load
  useEffect(() => {
    loadGoogleMapsApi()
      .then(() => setIsGoogleMapsApiLoaded(true))
      .catch(apiError => {
        console.error("Failed to load Google Maps API:", apiError);
        setError(t.loadingGoogleMaps + `: ${(apiError as Error).message}`);
      });
  }, [t.loadingGoogleMaps]); // Depends on translation function

  // Effect to attempt to get user's current location and set it as the start location
  useEffect(() => {
    if (isGoogleMapsApiLoaded && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Reverse geocode coordinates to get a human-readable address
            const address = await reverseGeocode(new google.maps.LatLng(latitude, longitude) as any);
            setStartLocation(address);
          } catch (geoError) {
            console.warn("Error reverse geocoding current location:", geoError);
            // Non-critical, user can still input manually
          }
        },
        (err) => {
          console.warn("Error getting current location:", err.message);
          // Non-critical, user can still input manually
        }
      );
    }
  }, [isGoogleMapsApiLoaded]); // Runs once Google Maps API is loaded

  // Memoized route steps from the Google Maps DirectionsResult
  const routeSteps = useMemo(() => route?.googleMapsRoute?.routes?.[0]?.legs?.[0]?.steps || [], [route]);

  // Effect to generate/regenerate the detailed path for simulation when routeSteps or stepDistance change.
  // This is a critical effect that drives the core simulation data.
  useEffect(() => {
    if (routeSteps.length > 0 && isGoogleMapsApiLoaded) {
      // Store current simulation state before potentially changing the path
      const statusBeforeStepChange = previousSimulationStatusRef.current; 
      previousRoutePointRef.current = currentRoutePoint; // Store current LatLng to try and resume near it
      
      // Generate a new detailed path based on routeSteps and the chosen streetViewStepDistance
      const newDetailedPath = generateDetailedPathWithStepInfo(routeSteps, streetViewStepDistance);
      setDetailedPathForSimulation(newDetailedPath);
      
      if (newDetailedPath.length > 0) {
        let newStartIndex = 0;
        // If there was a previous point, try to find the closest point in the new path to resume from
        if (previousRoutePointRef.current && (window as any).google?.maps?.geometry?.spherical) {
          let minDistance = Infinity;
          newDetailedPath.forEach((segment, index) => {
            const distance = google.maps.geometry.spherical.computeDistanceBetween(previousRoutePointRef.current, segment.point);
            if (distance < minDistance) {
              minDistance = distance;
              newStartIndex = index;
            }
          });
        }
        
        // Set the current point and progress based on the new path and start index
        setCurrentRoutePoint(newDetailedPath[newStartIndex].point);
        setCurrentDirectionsStepIndex(newDetailedPath[newStartIndex].originalStepIndex);
        setProgress(Math.min(100, ((newStartIndex + 1) / newDetailedPath.length) * 100));
        setJumpToPathIndex(newStartIndex); // Signal StreetViewPlayer to jump to this new starting index
        
        // Restore simulation status if it was playing, otherwise pause
        if (statusBeforeStepChange === SimulationStatus.PLAYING) {
          setSimulationStatus(SimulationStatus.PLAYING);
        } else { 
          setSimulationStatus(SimulationStatus.PAUSED);
        }
        
        // Update step info, unless the simulation had already finished
        if (statusBeforeStepChange !== SimulationStatus.FINISHED) {
          setCurrentStepInfo(t.streetViewSegment(newStartIndex + 1, newDetailedPath.length) + ". " + t.streetViewRouteLoaded); 
        }

      } else {
        // If no detailed path could be generated (e.g., empty routeSteps)
        setCurrentRoutePoint(null);
        setCurrentDirectionsStepIndex(null);
        setProgress(0);
        setSimulationStatus(SimulationStatus.STOPPED);
        setCurrentStepInfo(null);
      }
    } else if (route === null) { 
      // If the route is cleared, reset all path-related state
      setDetailedPathForSimulation([]);
      setCurrentRoutePoint(null);
      setCurrentDirectionsStepIndex(null);
      setProgress(0);
      setCurrentStepInfo(null);
      setSimulationStatus(SimulationStatus.STOPPED);
    }
  // Dependencies: This effect re-runs if the fundamental route steps, the desired step distance, or API readiness change.
  // currentRoutePoint was intentionally removed from deps to avoid re-triggering this effect when currentRoutePoint is updated *by this effect* or StreetViewPlayer.
  // previousSimulationStatusRef is updated within handlers, not a direct dependency for re-running this effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSteps, streetViewStepDistance, isGoogleMapsApiLoaded, t.streetViewSegment, t.streetViewRouteLoaded]);


  // Callback to handle the route search action
  const handleRouteSearch = useCallback(async () => {
    if (!startLocation || !endLocation) {
      setError(t.enterStartEnd);
      return;
    }
    if (!isGoogleMapsApiLoaded) {
      setError(t.googleMapsApiNotLoaded);
      return;
    }

    // Reset state for a new search
    setIsLoading(true);
    setError(null);
    setRoute(null); 
    setCurrentRoutePoint(null);
    setCurrentDirectionsStepIndex(null);
    previousSimulationStatusRef.current = SimulationStatus.STOPPED; // Reset ref
    setSimulationStatus(SimulationStatus.STOPPED);
    setProgress(0);
    setCurrentStepInfo(null);
    setDetailedPathForSimulation([]); 

    try {
      // Fetch route directions from Google Maps API
      const directionsResult = await getRouteDirections(startLocation, endLocation);
      let geminiSummary: string | undefined = undefined;
      
      // If Gemini API key is configured, fetch route narrative
      if (process.env.API_KEY) {
        try {
          geminiSummary = await getGeminiRouteNarrative(startLocation, endLocation, language);
        } catch (geminiError) {
          console.warn("Failed to get Gemini route narrative:", geminiError);
          // Non-critical, app continues without narrative
        }
      } else {
        console.warn("Gemini API key not configured. Skipping route narrative.");
      }
      
      const newRoute: AppRoute = {
        googleMapsRoute: directionsResult,
        geminiSummary: geminiSummary,
      };
      setRoute(newRoute); 
      // The useEffect watching `routeSteps` will handle generating the detailed path
      
    } catch (err) {
      console.error("Error fetching route:", err);
      const errorMessage = (err as Error).message || t.routeSearchErrorDefault;
      // Map specific Google Maps API errors to user-friendly messages
      if (errorMessage.includes("NOT_FOUND") || errorMessage.includes(t.routeSearchErrorNotFound)) setError(t.routeSearchErrorNotFound);
      else if (errorMessage.includes("ZERO_RESULTS") || errorMessage.includes(t.routeSearchErrorZeroResults)) setError(t.routeSearchErrorZeroResults);
      else if (errorMessage.includes("REQUEST_DENIED") || errorMessage.includes(t.routeSearchErrorRequestDenied)) setError(t.routeSearchErrorRequestDenied);
      else if (errorMessage.includes("OVER_QUERY_LIMIT") || errorMessage.includes(t.routeSearchErrorOverQueryLimit)) setError(t.routeSearchErrorOverQueryLimit);
      else setError(errorMessage);
      setRoute(null);
    } finally {
      setIsLoading(false);
    }
  }, [startLocation, endLocation, isGoogleMapsApiLoaded, t, language]); // Depends on inputs, API status, translations, and language

  // Callback to toggle play/pause state of the simulation
  const handlePlayPause = useCallback(() => {
    if (simulationStatus === SimulationStatus.PLAYING) {
      setSimulationStatus(SimulationStatus.PAUSED);
    } else {
      setSimulationStatus(SimulationStatus.PLAYING);
      if (jumpToPathIndex !== null) setJumpToPathIndex(null); // Clear any pending jump if user manually plays
    }
    previousSimulationStatusRef.current = simulationStatus === SimulationStatus.PLAYING ? SimulationStatus.PAUSED : SimulationStatus.PLAYING;
  }, [simulationStatus, jumpToPathIndex]);

  // Callback to stop the simulation and reset to the beginning of the route
  const handleStop = useCallback(() => {
    setSimulationStatus(SimulationStatus.STOPPED);
    setProgress(0); 
    setCurrentStepInfo(t.streetViewRouteLoaded);
    setJumpToPathIndex(null); 
    if (detailedPathForSimulation.length > 0) {
      // Reset to the first point of the path
      setCurrentRoutePoint(detailedPathForSimulation[0].point);
      setCurrentDirectionsStepIndex(detailedPathForSimulation[0].originalStepIndex);
      setJumpToPathIndex(0); // Signal StreetViewPlayer to jump to the start
    }
    previousSimulationStatusRef.current = SimulationStatus.STOPPED;
  }, [detailedPathForSimulation, t.streetViewRouteLoaded]);

  // Callback to change simulation speed
  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSimulationSpeed(Math.max(MIN_SIMULATION_SPEED, Math.min(MAX_SIMULATION_SPEED, newSpeed)));
  }, []);

  // Callback to change Street View step distance, which triggers path regeneration
  const handleStreetViewStepDistanceChange = useCallback((newDistance: number) => {
    previousSimulationStatusRef.current = simulationStatus; // Preserve status before path regeneration
    setStreetViewStepDistance(newDistance);
  }, [simulationStatus]); // Dependency: simulationStatus to correctly restore it after path regeneration
  
  // Callback for StreetViewPlayer to update current segment info (point and original step index)
  const handlePathSegmentUpdate = useCallback((segment: PathSegment) => {
    setCurrentRoutePoint(segment.point);
    setCurrentDirectionsStepIndex(segment.originalStepIndex);
  }, []);

  // Callback to handle requests to jump to a specific point on the route (e.g., from map click)
  const handleRouteJumpRequest = useCallback((indexOnDetailedPath: number) => {
    if (indexOnDetailedPath >= 0 && indexOnDetailedPath < detailedPathForSimulation.length) {
      const wasPlaying = simulationStatus === SimulationStatus.PLAYING;
      setJumpToPathIndex(indexOnDetailedPath); // Signal StreetViewPlayer to jump
      const targetSegment = detailedPathForSimulation[indexOnDetailedPath];
      setCurrentRoutePoint(targetSegment.point);
      setCurrentDirectionsStepIndex(targetSegment.originalStepIndex);
      setProgress(Math.min(100, ((indexOnDetailedPath + 1) / detailedPathForSimulation.length) * 100));
      
      // Restore play/pause state
      if (wasPlaying) {
        setSimulationStatus(SimulationStatus.PLAYING);
      } else {
        setSimulationStatus(SimulationStatus.PAUSED); 
      }
      previousSimulationStatusRef.current = wasPlaying ? SimulationStatus.PLAYING : SimulationStatus.PAUSED;
    }
  }, [detailedPathForSimulation, simulationStatus]);
  
  // Memoized current Google Maps route object (first route from the response)
  const currentGoogleRoute = useMemo(() => route?.googleMapsRoute?.routes?.[0] || null, [route]);
  // Memoized path for the MapDisplay, consisting of LatLng points
  const mapInteractivePath = useMemo(() => detailedPathForSimulation.map(segment => segment.point), [detailedPathForSimulation]);

  const headerAppTitle = "Street View Navigator"; // Static title

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white antialiased">
      {/* Header Section */}
      <header className="bg-gray-800 p-3 shadow-lg z-10 shrink-0 relative">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-teal-400 tracking-tight mb-4">{headerAppTitle}</h1>
          <LanguageSwitcher />
          <RouteInput
            start={startLocation}
            onStartChange={setStartLocation}
            end={endLocation}
            onEndChange={setEndLocation}
            onSearch={handleRouteSearch}
            disabled={isLoading || !isGoogleMapsApiLoaded}
          />
        </div>
      </header>

      {/* Loading and Error Displays */}
      {isLoading && <LoadingSpinner />}
      {error && !isLoading && <ErrorDisplay message={error} onClose={() => setError(null)} />}
      
      {/* Main Content Area (StreetView and Map) */}
      <main className="flex-grow flex flex-col md:flex-row overflow-hidden p-1.5 sm:p-2 gap-1.5 sm:gap-2">
        <div className="flex-grow md:w-2/3 flex flex-col gap-1.5 sm:gap-2">
           <div className="street-view-pane bg-gray-700 rounded-lg shadow-xl overflow-hidden relative">
            {/* Conditional rendering for StreetViewPlayer and placeholder messages */}
            {!isGoogleMapsApiLoaded && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-20">
                <p className="text-lg sm:text-xl">{t.loadingGoogleMaps}</p>
              </div>
            )}
            {isGoogleMapsApiLoaded && detailedPathForSimulation.length > 0 && (
              <StreetViewPlayer
                routePath={detailedPathForSimulation}
                simulationStatus={simulationStatus}
                speed={simulationSpeed}
                onStepUpdate={setCurrentStepInfo}
                onProgressUpdate={setProgress}
                onSimulationEnd={() => {
                  setSimulationStatus(SimulationStatus.FINISHED);
                  setCurrentStepInfo(t.streetViewRideFinished);
                  setJumpToPathIndex(null); // Clear jump state on finish
                  previousSimulationStatusRef.current = SimulationStatus.FINISHED;
                }}
                onPathSegmentUpdate={handlePathSegmentUpdate}
                jumpToPathIndex={jumpToPathIndex}
                onJumpComplete={() => setJumpToPathIndex(null)} // Clear jump state after completion
              />
            )}
            {/* Initial prompt when no route is loaded */}
            {isGoogleMapsApiLoaded && !route && !isLoading && !error && (
               <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                <p className="text-lg sm:text-xl text-gray-400">{t.initialPrompt}</p>
              </div>
            )}
            {/* Message if route exists but no path could be generated (e.g., walking route for driving app) */}
             {route && detailedPathForSimulation.length === 0 && !isLoading && !error && !routeSteps.length && currentGoogleRoute && (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                <p className="text-lg sm:text-xl text-red-400">{t.noOverviewPath}</p>
              </div>
            )}
          </div>
          <div className="map-pane bg-gray-700 rounded-lg shadow-xl overflow-hidden relative">
             <MapDisplay 
                originalRoute={currentGoogleRoute} 
                interactivePath={mapInteractivePath}
                currentLocation={currentRoutePoint}
                isGoogleMapsApiLoaded={isGoogleMapsApiLoaded}
                onRouteJumpRequest={handleRouteJumpRequest}
             />
          </div>
        </div>
        {/* Sidebar for Route Details */}
        <div className="md:w-1/3 h-full bg-gray-800 rounded-lg shadow-xl flex flex-col overflow-hidden p-0.5 sm:p-1">
          <RouteDetails 
            route={route} 
            currentStepInfo={currentStepInfo} 
            currentDirectionsStepIndex={currentDirectionsStepIndex}
          />
        </div>
      </main>
      
      {/* Footer for Control Panel (only shown if a route is loaded and path exists) */}
      {route && detailedPathForSimulation.length > 0 && (
         <footer className="bg-gray-800 p-2 sm:p-3 shadow-inner z-10 shrink-0">
            <ControlPanel
              simulationStatus={simulationStatus}
              onPlayPause={handlePlayPause}
              onStop={handleStop}
              speed={simulationSpeed}
              onSpeedChange={handleSpeedChange}
              streetViewStepDistance={streetViewStepDistance}
              onStreetViewStepDistanceChange={handleStreetViewStepDistanceChange}
              progress={progress}
              disabled={isLoading || detailedPathForSimulation.length === 0}
            />
        </footer>
      )}
      <Attribution />
    </div>
  );
};

export default App;
