
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SimulationStatus, PathSegment } from '../types'; // Added PathSegment
import { STREET_VIEW_POV_PITCH, STREET_VIEW_RADIUS } from '../constants';
import { useLocalization } from '../contexts/LocalizationContext';

// Fix: Declared 'google' as 'any' to suppress TypeScript errors for Google Maps types, as type definitions were not being found.
declare const google: any;

interface StreetViewPlayerProps {
  routePath: PathSegment[]; // Updated type
  simulationStatus: SimulationStatus;
  speed: number; 
  onStepUpdate: (info: string | null) => void;
  onProgressUpdate: (progress: number) => void;
  onSimulationEnd: () => void;
  onPathSegmentUpdate: (segment: PathSegment) => void; // Renamed and new signature
  jumpToPathIndex: number | null;
  onJumpComplete: () => void;
}

export const StreetViewPlayer: React.FC<StreetViewPlayerProps> = ({
  routePath,
  simulationStatus,
  speed,
  onStepUpdate,
  onProgressUpdate,
  onSimulationEnd,
  onPathSegmentUpdate, // Updated prop name
  jumpToPathIndex,
  onJumpComplete,
}) => {
  const { t } = useLocalization();
  const streetViewRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<any | null>(null); // Was google.maps.StreetViewPanorama
  const streetViewServiceRef = useRef<any | null>(null); // Was google.maps.StreetViewService
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPanoMessage, setCurrentPanoMessage] = useState<string | null>(null);
  const [isSearchingInitialPano, setIsSearchingInitialPano] = useState<boolean>(false);
  
  const animationFrameIdRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  const updatePanoramaInternal = useCallback( (
      idx: number, 
      service: any | null, 
      pano: any | null, 
      path: PathSegment[], // Updated type
      isInitialSearch: boolean = false
    ): Promise<any | null> => { 
    return new Promise((resolve) => {
      if (!service || !pano || idx >= path.length || idx < 0) {
        if(idx >= path.length && path.length > 0 && !isInitialSearch) { 
          onSimulationEnd();
          onStepUpdate(t.streetViewRideFinished);
        }
        resolve(null); 
        return;
      }

      const currentSegment = path[idx];
      const currentLocation = currentSegment.point; // Use .point from PathSegment
      if (!isInitialSearch) { 
        onPathSegmentUpdate(currentSegment); // Pass full segment
      }
      
      service.getPanorama(
        { location: currentLocation, radius: STREET_VIEW_RADIUS }, 
        (data: any, status: any) => { 
          try { 
            if (status === google.maps.StreetViewStatus.OK && data && data.location && data.location.pano) {
              pano.setPano(data.location.pano);
              
              let heading = pano.getPov().heading;
              if (idx + 1 < path.length) {
                const nextLocation = path[idx + 1].point; // Use .point
                heading = google.maps.geometry.spherical.computeHeading(data.location.latLng!, nextLocation);
              } else if (idx > 0 && idx < path.length) { 
                const prevLocation = path[idx -1].point; // Use .point
                heading = google.maps.geometry.spherical.computeHeading(prevLocation, data.location.latLng!);
              }

              pano.setPov({ heading, pitch: STREET_VIEW_POV_PITCH });
              pano.setVisible(true);
              if (!isInitialSearch) {
                setCurrentPanoMessage(null);
                const description = data.location.shortDescription || data.location.description || t.streetViewNearRoute;
                onStepUpdate(`${t.streetViewSegment(idx + 1, path.length)}. ${t.streetViewFrom(description)}`);
              }
              resolve(google.maps.StreetViewStatus.OK);
            } else {
              if (!isInitialSearch) {
                setCurrentPanoMessage(t.streetViewUnavailable + ` (ID: ${currentLocation.toString()}, Status: ${status})`);
                onStepUpdate(t.streetViewTryingNext);
                if (simulationStatus === SimulationStatus.PLAYING) { 
                    lastUpdateTimeRef.current = performance.now() - speed; 
                    if (animationFrameIdRef.current === null) {
                       animationFrameIdRef.current = requestAnimationFrame(animate);
                    }
                }
              }
              resolve(status); 
            }
          } catch (e) {
            console.error("Error inside getPanorama callback:", e);
            if (!isInitialSearch) {
                setCurrentPanoMessage(t.streetViewUnavailable + ` (Callback Error: ${(e as Error).message})`);
                onStepUpdate(t.streetViewTryingNext);
            }
            resolve(google.maps.StreetViewStatus.UNKNOWN_ERROR); 
          }
        }
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSimulationEnd, onStepUpdate, onPathSegmentUpdate, simulationStatus, speed, t]); 

  const findAndSetInitialPanorama = useCallback(async (startIndex: number) => {
    if (!streetViewServiceRef.current || !panoramaRef.current || routePath.length === 0) {
      setIsSearchingInitialPano(false);
      if (panoramaRef.current) panoramaRef.current.setVisible(false);
      onStepUpdate(routePath.length === 0 ? null : t.noStreetViewOnRoute);
      setCurrentPanoMessage(routePath.length === 0 ? null : t.noStreetViewOnRoute);
      return;
    }

    setIsSearchingInitialPano(true);
    onStepUpdate(t.findingStreetView);
    setCurrentPanoMessage(null);

    try {
      for (let i = startIndex; i < routePath.length; i++) {
        const initialStatus = await updatePanoramaInternal(i, streetViewServiceRef.current, panoramaRef.current, routePath, true);
        
        if (initialStatus === google.maps.StreetViewStatus.OK) {
          // Point i was initially OK. Now try to finalize it with description.
          const finalStatus = await updatePanoramaInternal(i, streetViewServiceRef.current, panoramaRef.current, routePath, false);
          
          if (finalStatus === google.maps.StreetViewStatus.OK) {
            // Successfully finalized point i
            setCurrentIndex(i);
            onProgressUpdate(((i + 1) / routePath.length) * 100);
            // onPathSegmentUpdate is called inside updatePanoramaInternal when isInitialSearch=false
            setIsSearchingInitialPano(false); // Important: set before returning
            return; // Found and set the initial panorama
          } else {
            // Point i was OK initially, but failed to finalize (e.g., ZERO_RESULTS on the second call).
            console.warn(`Initial Street View point ${i} (Location: ${routePath[i].point.toString()}) was OK, but failed to finalize with status: ${finalStatus}. Trying next point.`);
            // Clear any specific error message set by the failing updatePanoramaInternal(..., false)
            // as we are continuing the search.
            setCurrentPanoMessage(null); 
            onStepUpdate(t.findingStreetView); // Reset step update message
          }
        }
        // If initialStatus was not OK, or if finalization failed for an initially OK point, the loop continues.
      }

      // If loop completes without finding and successfully finalizing any panorama:
      setCurrentPanoMessage(t.noStreetViewOnRoute);
      onStepUpdate(t.noStreetViewOnRoute);
      if (panoramaRef.current) panoramaRef.current.setVisible(false);
    } catch (error) {
      console.error("Error during findAndSetInitialPanorama:", error);
      setCurrentPanoMessage(t.noStreetViewOnRoute + ` (Search Error: ${(error as Error).message})`);
      onStepUpdate(t.noStreetViewOnRoute);
      if (panoramaRef.current) panoramaRef.current.setVisible(false);
    } finally {
      setIsSearchingInitialPano(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePath, updatePanoramaInternal, onProgressUpdate, onStepUpdate, t]);


  useEffect(() => {
    if (streetViewRef.current && (window as any).google && (window as any).google.maps && (window as any).google.maps.geometry) {
      if (!panoramaRef.current) { 
        panoramaRef.current = new google.maps.StreetViewPanorama(streetViewRef.current, {
          pov: { heading: 0, pitch: STREET_VIEW_POV_PITCH }, visible: false, addressControl: false, linksControl: false,
          panControl: true, enableCloseButton: false, fullscreenControl: false, zoomControlOptions: { style: google.maps.ZoomControlStyle.SMALL },
        });
      }
      if(!streetViewServiceRef.current) {
         streetViewServiceRef.current = new google.maps.StreetViewService();
      }
    }

    if (simulationStatus === SimulationStatus.STOPPED || routePath.length === 0) {
        setCurrentIndex(0);
        onProgressUpdate(0);
        setCurrentPanoMessage(null); // Clear message on stop or no route

        if (routePath.length > 0 && panoramaRef.current && streetViewServiceRef.current) {
            if(!isSearchingInitialPano) findAndSetInitialPanorama(0);
        } else {
            if (panoramaRef.current) panoramaRef.current.setVisible(false);
            onStepUpdate(null); 
        }
    }
    
    return () => { 
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null; 
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePath, simulationStatus]); 

  useEffect(() => {
    if (jumpToPathIndex !== null && jumpToPathIndex >= 0 && jumpToPathIndex < routePath.length && !isSearchingInitialPano) {
      if (streetViewServiceRef.current && panoramaRef.current) {
        setCurrentIndex(jumpToPathIndex);
        updatePanoramaInternal(jumpToPathIndex, streetViewServiceRef.current, panoramaRef.current, routePath, false);
        onProgressUpdate(Math.min(100, ((jumpToPathIndex + 1) / routePath.length) * 100));
      }
      onJumpComplete(); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToPathIndex, routePath, onProgressUpdate, onJumpComplete, isSearchingInitialPano]);


  // eslint-disable-next-line react-hooks/exhaustive-deps
  const animate = useCallback((timestamp: number) => {
    if (simulationStatus !== SimulationStatus.PLAYING || routePath.length === 0 || isSearchingInitialPano) {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
      return;
    }

    if (!lastUpdateTimeRef.current) lastUpdateTimeRef.current = timestamp;
    const deltaTime = timestamp - lastUpdateTimeRef.current;

    if (deltaTime >= speed) {
      lastUpdateTimeRef.current = timestamp; 
      setCurrentIndex(prevIndex => {
        const nextIdx = prevIndex + 1;
        if (nextIdx >= routePath.length) {
          onSimulationEnd();
          if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
          animationFrameIdRef.current = null;
          return prevIndex; 
        }
        if (panoramaRef.current && streetViewServiceRef.current) {
          updatePanoramaInternal(nextIdx, streetViewServiceRef.current, panoramaRef.current, routePath, false);
        }
        onProgressUpdate(Math.min(100, ((nextIdx + 1) / routePath.length) * 100));
        return nextIdx;
      });
    }
    animationFrameIdRef.current = requestAnimationFrame(animate);
  }, [simulationStatus, speed, routePath, onSimulationEnd, onProgressUpdate, isSearchingInitialPano, updatePanoramaInternal]); 

  useEffect(() => {
    if (isSearchingInitialPano) {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
      return;
    }

    if (simulationStatus === SimulationStatus.STOPPED) {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
      lastUpdateTimeRef.current = 0; 
      // The main useEffect([routePath, simulationStatus]) handles calling findAndSetInitialPanorama.
      // And jumpToPathIndex handles explicit jumps to 0.
      // No need to call updatePanoramaInternal here directly for index 0 if STOPPED,
      // as it can conflict with the initial search or jump logic.
      return;
    }
    
    if (simulationStatus === SimulationStatus.PLAYING) {
        if (animationFrameIdRef.current === null && routePath.length > 0 && currentIndex < routePath.length -1) { 
             lastUpdateTimeRef.current = performance.now(); 
             animationFrameIdRef.current = requestAnimationFrame(animate);
        }
    } else { // PAUSED or FINISHED
        if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
    }

    return () => { 
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationStatus, routePath, isSearchingInitialPano, animate, currentIndex]); 


  return (
    <div className="w-full h-full relative bg-gray-600">
      <div ref={streetViewRef} className="w-full h-full" aria-label="Street View Display" />
      {currentPanoMessage && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white p-2 rounded text-sm z-10" role="alert">
          {currentPanoMessage}
        </div>
      )}
      {isSearchingInitialPano && (
         <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-20">
            <p className="text-lg text-white">{t.findingStreetView}</p>
        </div>
      )}
    </div>
  );
};
