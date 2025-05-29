
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SimulationStatus, PathSegment } from '../types';
import { STREET_VIEW_POV_PITCH, STREET_VIEW_RADIUS } from '../constants';
import { useLocalization } from '../contexts/LocalizationContext';

// Global declaration for Google Maps API
declare const google: any;

interface StreetViewPlayerProps {
  routePath: PathSegment[]; // Array of points defining the route for Street View
  simulationStatus: SimulationStatus; // Current status: PLAYING, PAUSED, STOPPED, FINISHED
  speed: number; // Time in ms between Street View steps
  onStepUpdate: (info: string | null) => void; // Callback to update textual step information
  onProgressUpdate: (progress: number) => void; // Callback to update simulation progress (0-100)
  onSimulationEnd: () => void; // Callback when simulation reaches the end of the path
  onPathSegmentUpdate: (segment: PathSegment) => void; // Callback when Street View moves to a new segment
  jumpToPathIndex: number | null; // If set, Street View should jump to this index in routePath
  onJumpComplete: () => void; // Callback after a jump operation is completed
}

export const StreetViewPlayer: React.FC<StreetViewPlayerProps> = ({
  routePath,
  simulationStatus,
  speed,
  onStepUpdate,
  onProgressUpdate,
  onSimulationEnd,
  onPathSegmentUpdate,
  jumpToPathIndex,
  onJumpComplete,
}) => {
  const { t } = useLocalization(); // Localization hook
  const streetViewRef = useRef<HTMLDivElement>(null); // Ref for the Street View container div
  const panoramaRef = useRef<any | null>(null); // Ref for the google.maps.StreetViewPanorama instance
  const streetViewServiceRef = useRef<any | null>(null); // Ref for the google.maps.StreetViewService instance
  
  // State
  const [currentIndex, setCurrentIndex] = useState(0); // Current index in the routePath array
  const [currentPanoMessage, setCurrentPanoMessage] = useState<string | null>(null); // Message for Street View status (e.g., "Unavailable")
  const [isSearchingInitialPano, setIsSearchingInitialPano] = useState<boolean>(false); // Flag when actively searching for the first usable panorama
  
  // Refs for animation loop control
  const animationFrameIdRef = useRef<number | null>(null); // Stores the ID from requestAnimationFrame
  const lastUpdateTimeRef = useRef<number>(0); // Timestamp of the last animation frame update

  // Internal function to update the Street View panorama to a specific path index.
  // This is the core function for displaying Street View.
  const updatePanoramaInternal = useCallback( (
      idx: number, 
      service: any | null, // StreetViewService instance
      pano: any | null,    // StreetViewPanorama instance
      path: PathSegment[], 
      isInitialSearch: boolean = false // Flag to differentiate initial search from regular updates
    ): Promise<any | null> => { // Returns a promise with the StreetViewStatus or null
    return new Promise((resolve) => {
      if (!service || !pano || idx >= path.length || idx < 0) {
        // If path ended and it's not an initial search, signal simulation end.
        if(idx >= path.length && path.length > 0 && !isInitialSearch) { 
          onSimulationEnd();
          onStepUpdate(t.streetViewRideFinished);
        }
        resolve(null); 
        return;
      }

      const currentSegment = path[idx];
      const currentLocation = currentSegment.point; // google.maps.LatLng from the path segment
      
      // If not an initial search, update the parent component with the current segment
      if (!isInitialSearch) { 
        onPathSegmentUpdate(currentSegment);
      }
      
      // Request panorama data from Google Street View service
      service.getPanorama(
        { location: currentLocation, radius: STREET_VIEW_RADIUS }, 
        (data: any, status: any) => { // data: StreetViewPanoramaData, status: StreetViewStatus
          try { 
            if (status === google.maps.StreetViewStatus.OK && data && data.location && data.location.pano) {
              // Panorama found successfully
              pano.setPano(data.location.pano); // Set the panorama ID
              
              // Calculate heading for the POV
              let heading = pano.getPov().heading; // Default to current heading
              if (idx + 1 < path.length) { // If there's a next point, aim towards it
                const nextLocation = path[idx + 1].point;
                heading = google.maps.geometry.spherical.computeHeading(data.location.latLng!, nextLocation);
              } else if (idx > 0 && idx < path.length) { // If it's the last point, aim from previous
                const prevLocation = path[idx -1].point;
                heading = google.maps.geometry.spherical.computeHeading(prevLocation, data.location.latLng!);
              }

              pano.setPov({ heading, pitch: STREET_VIEW_POV_PITCH });
              pano.setVisible(true);

              if (!isInitialSearch) {
                setCurrentPanoMessage(null); // Clear any previous error message
                const description = data.location.shortDescription || data.location.description || t.streetViewNearRoute;
                onStepUpdate(`${t.streetViewSegment(idx + 1, path.length)}. ${t.streetViewFrom(description)}`);
              }
              resolve(google.maps.StreetViewStatus.OK);
            } else {
              // Panorama not found or error occurred
              if (!isInitialSearch) {
                setCurrentPanoMessage(t.streetViewUnavailable + ` (ID: ${currentLocation.toString()}, Status: ${status})`);
                onStepUpdate(t.streetViewTryingNext);
                // If playing, try to advance to the next point automatically after a short delay (implicitly by animate function)
                if (simulationStatus === SimulationStatus.PLAYING) { 
                    lastUpdateTimeRef.current = performance.now() - speed; // Force immediate next step in animate
                    if (animationFrameIdRef.current === null) {
                       animationFrameIdRef.current = requestAnimationFrame(animate); // Restart animation if stopped
                    }
                }
              }
              resolve(status); // Resolve with the error status
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
  // Dependencies: onSimulationEnd, onStepUpdate, onPathSegmentUpdate, simulationStatus, speed, t (translations)
  // These are callbacks and values that influence how the panorama update behaves or reports status.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSimulationEnd, onStepUpdate, onPathSegmentUpdate, simulationStatus, speed, t]); 

  // Finds and sets the initial Street View panorama when a new route is loaded or simulation is stopped.
  // It iterates through the path to find the first usable panorama.
  const findAndSetInitialPanorama = useCallback(async (startIndex: number) => {
    if (!streetViewServiceRef.current || !panoramaRef.current || routePath.length === 0) {
      setIsSearchingInitialPano(false);
      if (panoramaRef.current) panoramaRef.current.setVisible(false); // Hide panorama if it exists
      onStepUpdate(routePath.length === 0 ? null : t.noStreetViewOnRoute);
      setCurrentPanoMessage(routePath.length === 0 ? null : t.noStreetViewOnRoute);
      return;
    }

    setIsSearchingInitialPano(true); // Set flag to indicate search is in progress
    onStepUpdate(t.findingStreetView);
    setCurrentPanoMessage(null);

    try {
      for (let i = startIndex; i < routePath.length; i++) {
        // First attempt: just check if panorama exists (isInitialSearch = true)
        const initialStatus = await updatePanoramaInternal(i, streetViewServiceRef.current, panoramaRef.current, routePath, true);
        
        if (initialStatus === google.maps.StreetViewStatus.OK) {
          // Second attempt (finalization): get full details and update UI (isInitialSearch = false)
          const finalStatus = await updatePanoramaInternal(i, streetViewServiceRef.current, panoramaRef.current, routePath, false);
          
          if (finalStatus === google.maps.StreetViewStatus.OK) {
            // Successfully found and finalized an initial panorama
            setCurrentIndex(i);
            onProgressUpdate(((i + 1) / routePath.length) * 100);
            // onPathSegmentUpdate is called inside updatePanoramaInternal when isInitialSearch=false
            setIsSearchingInitialPano(false); // Clear search flag
            return; // Exit after successfully setting initial panorama
          } else {
            // Panorama was OK initially but failed finalization (e.g., description not available)
            console.warn(`Initial Street View point ${i} (Location: ${routePath[i].point.toString()}) was OK, but failed to finalize with status: ${finalStatus}. Trying next point.`);
            setCurrentPanoMessage(null); // Clear specific error message from failed finalization
            onStepUpdate(t.findingStreetView); // Reset step update message to "finding..."
          }
        }
        // If initialStatus was not OK, or if finalization failed, loop continues to the next point.
      }

      // If loop completes without finding any usable panorama
      setCurrentPanoMessage(t.noStreetViewOnRoute);
      onStepUpdate(t.noStreetViewOnRoute);
      if (panoramaRef.current) panoramaRef.current.setVisible(false);
    } catch (error) {
      console.error("Error during findAndSetInitialPanorama:", error);
      setCurrentPanoMessage(t.noStreetViewOnRoute + ` (Search Error: ${(error as Error).message})`);
      onStepUpdate(t.noStreetViewOnRoute);
      if (panoramaRef.current) panoramaRef.current.setVisible(false);
    } finally {
      setIsSearchingInitialPano(false); // Ensure search flag is cleared
    }
  // Dependencies: routePath, updatePanoramaInternal, onProgressUpdate, onStepUpdate, t
  // These are essential for the search logic and reporting its status.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePath, updatePanoramaInternal, onProgressUpdate, onStepUpdate, t]);


  // Effect for initializing StreetViewPanorama and StreetViewService instances.
  // Also handles setting the initial panorama when the route/simulation status changes.
  useEffect(() => {
    // Initialize Google Maps objects if they haven't been already and API is loaded
    if (streetViewRef.current && (window as any).google?.maps?.geometry) { // Check for geometry too, as it's used
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

    // Handle simulation stop or route path clearing
    if (simulationStatus === SimulationStatus.STOPPED || routePath.length === 0) {
        setCurrentIndex(0);
        onProgressUpdate(0);
        setCurrentPanoMessage(null);

        if (routePath.length > 0 && panoramaRef.current && streetViewServiceRef.current) {
            // If not already searching, find the initial panorama starting from index 0
            if(!isSearchingInitialPano) findAndSetInitialPanorama(0);
        } else {
            // No route path, or Maps objects not ready; hide panorama and clear step update.
            if (panoramaRef.current) panoramaRef.current.setVisible(false);
            onStepUpdate(null); 
        }
    }
    
    // Cleanup function: cancel any pending animation frame when component unmounts or dependencies change
    return () => { 
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null; 
    };
  // Dependencies: routePath, simulationStatus. These trigger re-initialization or state reset.
  // findAndSetInitialPanorama is a callback, its dependencies are managed separately.
  // isSearchingInitialPano helps prevent re-triggering findAndSetInitialPanorama if it's already running.
  // onProgressUpdate, onStepUpdate are stable callbacks.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePath, simulationStatus]); 

  // Effect to handle jumping to a specific path index (e.g., from map click)
  useEffect(() => {
    if (jumpToPathIndex !== null && jumpToPathIndex >= 0 && jumpToPathIndex < routePath.length && !isSearchingInitialPano) {
      if (streetViewServiceRef.current && panoramaRef.current) {
        setCurrentIndex(jumpToPathIndex); // Update internal current index
        // Update panorama to the jumped-to index; not an initial search
        updatePanoramaInternal(jumpToPathIndex, streetViewServiceRef.current, panoramaRef.current, routePath, false);
        onProgressUpdate(Math.min(100, ((jumpToPathIndex + 1) / routePath.length) * 100));
      }
      onJumpComplete(); // Notify parent that jump is processed
    }
  // Dependencies: jumpToPathIndex, routePath, onProgressUpdate, onJumpComplete, isSearchingInitialPano
  // These control when and how a jump occurs. updatePanoramaInternal is a stable callback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToPathIndex, routePath, onProgressUpdate, onJumpComplete, isSearchingInitialPano]);


  // Animation loop function using requestAnimationFrame for smooth playback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const animate = useCallback((timestamp: number) => {
    // Stop animation if not playing, no route path, or currently searching for initial pano
    if (simulationStatus !== SimulationStatus.PLAYING || routePath.length === 0 || isSearchingInitialPano) {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
      return;
    }

    if (!lastUpdateTimeRef.current) lastUpdateTimeRef.current = timestamp;
    const deltaTime = timestamp - lastUpdateTimeRef.current; // Time elapsed since last update

    // If enough time has passed (based on speed setting)
    if (deltaTime >= speed) {
      lastUpdateTimeRef.current = timestamp; 
      setCurrentIndex(prevIndex => {
        const nextIdx = prevIndex + 1;
        if (nextIdx >= routePath.length) { // Reached end of path
          onSimulationEnd();
          if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
          animationFrameIdRef.current = null;
          return prevIndex; // Keep index at the end
        }
        // Update panorama to the next index
        if (panoramaRef.current && streetViewServiceRef.current) {
          updatePanoramaInternal(nextIdx, streetViewServiceRef.current, panoramaRef.current, routePath, false);
        }
        onProgressUpdate(Math.min(100, ((nextIdx + 1) / routePath.length) * 100));
        return nextIdx; // Advance index
      });
    }
    // Request next animation frame
    animationFrameIdRef.current = requestAnimationFrame(animate);
  }, [simulationStatus, speed, routePath, onSimulationEnd, onProgressUpdate, isSearchingInitialPano, updatePanoramaInternal]); 

  // Effect to manage the animation loop (start/stop based on simulationStatus)
  useEffect(() => {
    // If searching for initial pano, ensure animation is stopped
    if (isSearchingInitialPano) {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
      return;
    }

    if (simulationStatus === SimulationStatus.STOPPED) {
      // Stop animation and reset last update time.
      // Initial panorama setting is handled by the useEffect watching [routePath, simulationStatus].
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
      lastUpdateTimeRef.current = 0; 
      return;
    }
    
    if (simulationStatus === SimulationStatus.PLAYING) {
        // Start animation if not already running and there's a path and not at the end
        if (animationFrameIdRef.current === null && routePath.length > 0 && currentIndex < routePath.length -1) { 
             lastUpdateTimeRef.current = performance.now(); // Reset timer for immediate start
             animationFrameIdRef.current = requestAnimationFrame(animate);
        }
    } else { // PAUSED or FINISHED
        // Stop animation if paused or finished
        if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
    }

    // Cleanup: ensure animation is cancelled on unmount or if dependencies change
    return () => { 
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  // Dependencies: simulationStatus, routePath, isSearchingInitialPano, animate callback, currentIndex
  // These control the starting, stopping, and continuation of the animation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationStatus, routePath, isSearchingInitialPano, animate, currentIndex]); 


  return (
    <div className="w-full h-full relative bg-gray-600">
      {/* Div container for the Google Street View Panorama */}
      <div ref={streetViewRef} className="w-full h-full" aria-label="Street View Display" />
      {/* Display message if panorama is unavailable or other issues */}
      {currentPanoMessage && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white p-2 rounded text-sm z-10" role="alert">
          {currentPanoMessage}
        </div>
      )}
      {/* Display loading message when searching for initial panorama */}
      {isSearchingInitialPano && (
         <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-20">
            <p className="text-lg text-white">{t.findingStreetView}</p>
        </div>
      )}
    </div>
  );
};
