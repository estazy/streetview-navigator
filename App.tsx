


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
// Fix: Import reverseGeocode from googleMapsService
import { loadGoogleMapsApi, getRouteDirections, generateDetailedPathWithStepInfo, reverseGeocode } from './services/googleMapsService'; // Updated import
import { getGeminiRouteNarrative } from './services/geminiService';
import { AppRoute, SimulationStatus, PathSegment } from './types'; // Added PathSegment
import { DEFAULT_SIMULATION_SPEED, MIN_SIMULATION_SPEED, MAX_SIMULATION_SPEED, GOOGLE_MAPS_API_KEY_PLACEHOLDER, DEFAULT_SV_STEP_DISTANCE } from './constants'; // Removed INTERPOLATION_THRESHOLD_METERS
import { useLocalization } from './contexts/LocalizationContext';

// Fix: Declared 'google' as 'any' to suppress TypeScript errors for Google Maps types, as type definitions were not being found.
declare const google: any;

const App: React.FC = () => {
  const { t, language } = useLocalization();
  const [startLocation, setStartLocation] = useState<string>('');
  const [endLocation, setEndLocation] = useState<string>('');
  const [route, setRoute] = useState<AppRoute | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleMapsApiLoaded, setIsGoogleMapsApiLoaded] = useState<boolean>(false);
  
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus>(SimulationStatus.STOPPED);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(DEFAULT_SIMULATION_SPEED);
  const [currentStepInfo, setCurrentStepInfo] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [currentRoutePoint, setCurrentRoutePoint] = useState<any | null>(null); // google.maps.LatLng

  const [streetViewStepDistance, setStreetViewStepDistance] = useState<number>(DEFAULT_SV_STEP_DISTANCE);
  const [detailedPathForSimulation, setDetailedPathForSimulation] = useState<PathSegment[]>([]); // Updated type
  const [jumpToPathIndex, setJumpToPathIndex] = useState<number | null>(null);
  const [currentDirectionsStepIndex, setCurrentDirectionsStepIndex] = useState<number | null>(null);
  
  const previousSimulationStatusRef = useRef<SimulationStatus>(SimulationStatus.STOPPED);
  const previousRoutePointRef = useRef<any | null>(null); // google.maps.LatLng

  useEffect(() => {
    const script = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]') as HTMLScriptElement | null;
    if (script && script.src.includes(GOOGLE_MAPS_API_KEY_PLACEHOLDER)) {
      setError(t.criticalApiKeyError);
    }
    if (!process.env.API_KEY) {
      console.warn(t.geminiApiKeyWarning);
    }
  }, [t]);

  useEffect(() => {
    loadGoogleMapsApi()
      .then(() => setIsGoogleMapsApiLoaded(true))
      .catch(apiError => {
        console.error("Failed to load Google Maps API:", apiError);
        setError(t.loadingGoogleMaps + `: ${(apiError as Error).message}`);
      });
  }, [t.loadingGoogleMaps]);

  useEffect(() => {
    if (isGoogleMapsApiLoaded && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const address = await reverseGeocode(new google.maps.LatLng(latitude, longitude) as any);
            setStartLocation(address);
          } catch (geoError) {
            console.warn("Error reverse geocoding current location:", geoError);
          }
        },
        (err) => {
          console.warn("Error getting current location:", err.message);
        }
      );
    }
  }, [isGoogleMapsApiLoaded]);

  const routeSteps = useMemo(() => route?.googleMapsRoute?.routes?.[0]?.legs?.[0]?.steps || [], [route]);

  useEffect(() => {
    if (routeSteps.length > 0 && isGoogleMapsApiLoaded) {
      const statusBeforeStepChange = previousSimulationStatusRef.current; 
      previousRoutePointRef.current = currentRoutePoint; 
      
      const newDetailedPath = generateDetailedPathWithStepInfo(routeSteps, streetViewStepDistance);
      setDetailedPathForSimulation(newDetailedPath);
      
      if (newDetailedPath.length > 0) {
        let newStartIndex = 0;
        if (previousRoutePointRef.current && newDetailedPath.length > 0 && (window as any).google?.maps?.geometry?.spherical) {
          let minDistance = Infinity;
          newDetailedPath.forEach((segment, index) => {
            const distance = google.maps.geometry.spherical.computeDistanceBetween(previousRoutePointRef.current, segment.point);
            if (distance < minDistance) {
              minDistance = distance;
              newStartIndex = index;
            }
          });
        }
        
        setCurrentRoutePoint(newDetailedPath[newStartIndex].point);
        setCurrentDirectionsStepIndex(newDetailedPath[newStartIndex].originalStepIndex);
        setProgress(Math.min(100, ((newStartIndex + 1) / newDetailedPath.length) * 100));
        setJumpToPathIndex(newStartIndex); 
        
        if (statusBeforeStepChange === SimulationStatus.PLAYING) {
          setSimulationStatus(SimulationStatus.PLAYING);
        } else { 
          setSimulationStatus(SimulationStatus.PAUSED);
        }
        
        if (statusBeforeStepChange !== SimulationStatus.FINISHED) {
          setCurrentStepInfo(t.streetViewSegment(newStartIndex + 1, newDetailedPath.length) + ". " + t.streetViewRouteLoaded); 
        }

      } else {
        setCurrentRoutePoint(null);
        setCurrentDirectionsStepIndex(null);
        setProgress(0);
        setSimulationStatus(SimulationStatus.STOPPED);
        setCurrentStepInfo(null);
      }
    } else if (route === null) { 
      setDetailedPathForSimulation([]);
      setCurrentRoutePoint(null);
      setCurrentDirectionsStepIndex(null);
      setProgress(0);
      setCurrentStepInfo(null);
      setSimulationStatus(SimulationStatus.STOPPED);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSteps, streetViewStepDistance, isGoogleMapsApiLoaded, t.streetViewSegment, t.streetViewRouteLoaded]); // Removed currentRoutePoint from deps to avoid loop


  const handleRouteSearch = useCallback(async () => {
    if (!startLocation || !endLocation) {
      setError(t.enterStartEnd);
      return;
    }
    if (!isGoogleMapsApiLoaded) {
      setError(t.googleMapsApiNotLoaded);
      return;
    }

    setIsLoading(true);
    setError(null);
    setRoute(null); 
    setCurrentRoutePoint(null);
    setCurrentDirectionsStepIndex(null);
    previousSimulationStatusRef.current = SimulationStatus.STOPPED; 
    setSimulationStatus(SimulationStatus.STOPPED);
    setProgress(0);
    setCurrentStepInfo(null);
    setDetailedPathForSimulation([]); 

    try {
      const directionsResult = await getRouteDirections(startLocation, endLocation);
      let geminiSummary: string | undefined = undefined;
      
      if (process.env.API_KEY) {
        try {
          geminiSummary = await getGeminiRouteNarrative(startLocation, endLocation, language);
        } catch (geminiError) {
          console.warn("Failed to get Gemini route narrative:", geminiError);
        }
      } else {
        console.warn("Gemini API key not configured. Skipping route narrative.");
      }
      
      const newRoute: AppRoute = {
        googleMapsRoute: directionsResult,
        geminiSummary: geminiSummary,
      };
      setRoute(newRoute); 
      // Path generation will be triggered by useEffect watching routeSteps
      
    } catch (err) {
      console.error("Error fetching route:", err);
      const errorMessage = (err as Error).message || t.routeSearchErrorDefault;
      if (errorMessage.includes("NOT_FOUND") || errorMessage.includes(t.routeSearchErrorNotFound)) setError(t.routeSearchErrorNotFound);
      else if (errorMessage.includes("ZERO_RESULTS") || errorMessage.includes(t.routeSearchErrorZeroResults)) setError(t.routeSearchErrorZeroResults);
      else if (errorMessage.includes("REQUEST_DENIED") || errorMessage.includes(t.routeSearchErrorRequestDenied)) setError(t.routeSearchErrorRequestDenied);
      else if (errorMessage.includes("OVER_QUERY_LIMIT") || errorMessage.includes(t.routeSearchErrorOverQueryLimit)) setError(t.routeSearchErrorOverQueryLimit);
      else setError(errorMessage);
      setRoute(null);
    } finally {
      setIsLoading(false);
    }
  }, [startLocation, endLocation, isGoogleMapsApiLoaded, t, language]);

  const handlePlayPause = useCallback(() => {
    if (simulationStatus === SimulationStatus.PLAYING) {
      setSimulationStatus(SimulationStatus.PAUSED);
    } else {
      setSimulationStatus(SimulationStatus.PLAYING);
      if (jumpToPathIndex !== null) setJumpToPathIndex(null); 
    }
  }, [simulationStatus, jumpToPathIndex]);

  const handleStop = useCallback(() => {
    setSimulationStatus(SimulationStatus.STOPPED);
    setProgress(0); 
    setCurrentStepInfo(t.streetViewRouteLoaded);
    setJumpToPathIndex(null); 
    if (detailedPathForSimulation.length > 0) {
      setCurrentRoutePoint(detailedPathForSimulation[0].point);
      setCurrentDirectionsStepIndex(detailedPathForSimulation[0].originalStepIndex);
      setJumpToPathIndex(0); 
    }
  }, [detailedPathForSimulation, t.streetViewRouteLoaded]);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSimulationSpeed(Math.max(MIN_SIMULATION_SPEED, Math.min(MAX_SIMULATION_SPEED, newSpeed)));
  }, []);

  const handleStreetViewStepDistanceChange = useCallback((newDistance: number) => {
    previousSimulationStatusRef.current = simulationStatus; 
    setStreetViewStepDistance(newDistance);
  }, [simulationStatus]);
  
  const handlePathSegmentUpdate = useCallback((segment: PathSegment) => {
    setCurrentRoutePoint(segment.point);
    setCurrentDirectionsStepIndex(segment.originalStepIndex);
  }, []);

  const handleRouteJumpRequest = useCallback((indexOnDetailedPath: number) => {
    if (indexOnDetailedPath >= 0 && indexOnDetailedPath < detailedPathForSimulation.length) {
      const wasPlaying = simulationStatus === SimulationStatus.PLAYING;
      setJumpToPathIndex(indexOnDetailedPath);
      const targetSegment = detailedPathForSimulation[indexOnDetailedPath];
      setCurrentRoutePoint(targetSegment.point);
      setCurrentDirectionsStepIndex(targetSegment.originalStepIndex);
      setProgress(Math.min(100, ((indexOnDetailedPath + 1) / detailedPathForSimulation.length) * 100));
      if (wasPlaying) {
        setSimulationStatus(SimulationStatus.PLAYING);
      } else {
        setSimulationStatus(SimulationStatus.PAUSED); 
      }
    }
  }, [detailedPathForSimulation, simulationStatus]);
  
  const currentGoogleRoute = useMemo(() => route?.googleMapsRoute?.routes?.[0] || null, [route]);
  const mapInteractivePath = useMemo(() => detailedPathForSimulation.map(segment => segment.point), [detailedPathForSimulation]);

  const headerAppTitle = "Street View Navigator"; // Use fixed string for both languages

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white antialiased">
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

      {isLoading && <LoadingSpinner />}
      {error && !isLoading && <ErrorDisplay message={error} onClose={() => setError(null)} />}
      
      <main className="flex-grow flex flex-col md:flex-row overflow-hidden p-1.5 sm:p-2 gap-1.5 sm:gap-2">
        <div className="flex-grow md:w-2/3 flex flex-col gap-1.5 sm:gap-2">
           <div className="street-view-pane bg-gray-700 rounded-lg shadow-xl overflow-hidden relative">
            {!isGoogleMapsApiLoaded && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-20">
                <p className="text-lg sm:text-xl">{t.loadingGoogleMaps}</p>
              </div>
            )}
            {isGoogleMapsApiLoaded && detailedPathForSimulation.length > 0 && (
              <StreetViewPlayer
                routePath={detailedPathForSimulation} // Now PathSegment[]
                simulationStatus={simulationStatus}
                speed={simulationSpeed}
                onStepUpdate={setCurrentStepInfo}
                onProgressUpdate={setProgress}
                onSimulationEnd={() => {
                  setSimulationStatus(SimulationStatus.FINISHED);
                  setCurrentStepInfo(t.streetViewRideFinished);
                  setJumpToPathIndex(null);
                }}
                onPathSegmentUpdate={handlePathSegmentUpdate} // Renamed and new signature
                jumpToPathIndex={jumpToPathIndex}
                onJumpComplete={() => setJumpToPathIndex(null)}
              />
            )}
            {isGoogleMapsApiLoaded && !route && !isLoading && !error && (
               <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                <p className="text-lg sm:text-xl text-gray-400">{t.initialPrompt}</p>
              </div>
            )}
             {route && detailedPathForSimulation.length === 0 && !isLoading && !error && !routeSteps.length && currentGoogleRoute && (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                <p className="text-lg sm:text-xl text-red-400">{t.noOverviewPath}</p> {/* Change to more generic error if routeSteps is empty */}
              </div>
            )}
          </div>
          <div className="map-pane bg-gray-700 rounded-lg shadow-xl overflow-hidden relative">
             <MapDisplay 
                originalRoute={currentGoogleRoute} 
                interactivePath={mapInteractivePath} // Derived from detailedPathForSimulation
                currentLocation={currentRoutePoint}
                isGoogleMapsApiLoaded={isGoogleMapsApiLoaded}
                onRouteJumpRequest={handleRouteJumpRequest}
             />
          </div>
        </div>
        <div className="md:w-1/3 h-full bg-gray-800 rounded-lg shadow-xl flex flex-col overflow-hidden p-0.5 sm:p-1">
          <RouteDetails 
            route={route} 
            currentStepInfo={currentStepInfo} 
            currentDirectionsStepIndex={currentDirectionsStepIndex} // Added prop
          />
        </div>
      </main>
      
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