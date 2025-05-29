
// Fix: Declared 'google' as 'any' to suppress TypeScript errors for Google Maps types, as type definitions were not being found.
declare const google: any;

let googleMapsApiPromise: Promise<void> | null = null;

export const loadGoogleMapsApi = (): Promise<void> => {
  if (!googleMapsApiPromise) {
    googleMapsApiPromise = new Promise((resolve, reject) => {
      const checkApi = () => {
        // Fix: Cast window to any to access google maps property without full Window type definition.
        if ((window as any).google && 
            (window as any).google.maps && 
            (window as any).google.maps.DirectionsService && 
            (window as any).google.maps.StreetViewService && 
            (window as any).google.maps.Geocoder && 
            (window as any).google.maps.geometry && 
            (window as any).google.maps.geometry.poly && 
            (window as any).google.maps.geometry.spherical) {
          resolve();
        } else if ((document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]') as HTMLScriptElement | null)?.src.includes('YOUR_GOOGLE_MAPS_API_KEY_HERE')) {
          console.error("Google Maps API key placeholder detected in script tag. API calls will fail.");
          reject(new Error("Google Maps API key is a placeholder. Please configure a valid API key in index.html."));
        }
        else {
          setTimeout(checkApi, 100); 
        }
      };
      checkApi();
    });
  }
  return googleMapsApiPromise;
};

export const getRouteDirections = async (
  start: string,
  end: string
  // Fix: Use 'any' for Google Maps types to suppress TypeScript errors when full type definitions are not available.
): Promise<any> => { // Was Promise<google.maps.DirectionsResult>
  await loadGoogleMapsApi(); 

  // Fix: Cast window to any to access google maps property without full Window type definition.
  const directionsService = new (window as any).google.maps.DirectionsService();
  
  return new Promise((resolve, reject) => {
    directionsService.route(
      {
        origin: start,
        destination: end,
        // Fix: Cast window to any to access google maps property without full Window type definition.
        travelMode: (window as any).google.maps.TravelMode.DRIVING,
      },
      (result: any, status: any) => { // result and status types become any
        // Fix: Cast window to any to access google maps property without full Window type definition.
        if (status === (window as any).google.maps.DirectionsStatus.OK && result) {
          resolve(result);
        } else {
          console.error(`Directions request failed due to ${status}`);
          reject(new Error(`Directions request failed due to ${status}`));
        }
      }
    );
  });
};

// Generates a detailed path by stepping 'stepDistance' along each segment of each DirectionsStep.
// Tags each point with the index of its original DirectionsStep.
export const generateDetailedPathWithStepInfo = (
  steps: any[], // google.maps.DirectionsStep[]
  stepDistance: number
): Array<{ point: any, originalStepIndex: number }> => {
  // Fix: Cast window to any to access google maps property without full Window type definition.
  if (!(window as any).google?.maps?.geometry?.spherical) {
    console.warn("Google Maps Geometry library not loaded for detailed path generation.");
    return [];
  }
  const detailedPathWithInfo: Array<{ point: any, originalStepIndex: number }> = [];

  for (let originalStepIndex = 0; originalStepIndex < steps.length; originalStepIndex++) {
    const currentStep = steps[originalStepIndex];
    const pathForThisStep: any[] = currentStep.path; // This is google.maps.LatLng[]

    if (!pathForThisStep || pathForThisStep.length === 0) continue;

    let lastAddedPointToGlobalPath = detailedPathWithInfo.length > 0 ? detailedPathWithInfo[detailedPathWithInfo.length - 1].point : null;

    // Add the first point of the step's path, if different from the last point added globally
    if (!lastAddedPointToGlobalPath || !pathForThisStep[0].equals(lastAddedPointToGlobalPath)) {
        detailedPathWithInfo.push({ point: pathForThisStep[0], originalStepIndex });
    }
    
    let currentPositionOnSegment = pathForThisStep[0];

    for (let i = 0; i < pathForThisStep.length - 1; i++) {
      const segmentStartNode = pathForThisStep[i]; // The actual start node of this sub-segment from Google
      const segmentEndNode = pathForThisStep[i+1];   // The actual end node of this sub-segment from Google
      
      // Ensure currentPositionOnSegment is segmentStartNode if we are starting a new sub-segment from original path
      currentPositionOnSegment = segmentStartNode;

      let accumulatedDistanceOnSegment = 0;
      const totalSegmentLength = google.maps.geometry.spherical.computeDistanceBetween(currentPositionOnSegment, segmentEndNode);
      
      if (totalSegmentLength < 0.1) { // Very short segment, just ensure end node is considered
         if (detailedPathWithInfo.length === 0 || !segmentEndNode.equals(detailedPathWithInfo[detailedPathWithInfo.length -1].point)){
            detailedPathWithInfo.push({ point: segmentEndNode, originalStepIndex });
         }
         currentPositionOnSegment = segmentEndNode;
         continue;
      }

      const heading = google.maps.geometry.spherical.computeHeading(currentPositionOnSegment, segmentEndNode);

      while (accumulatedDistanceOnSegment + stepDistance < totalSegmentLength) {
        currentPositionOnSegment = google.maps.geometry.spherical.computeOffset(currentPositionOnSegment, stepDistance, heading);
        detailedPathWithInfo.push({ point: currentPositionOnSegment, originalStepIndex });
        accumulatedDistanceOnSegment += stepDistance;
      }
      
      // Add the actual end node of the sub-segment from Google to ensure accuracy and anchor points
      // Avoid adding if it's the same as the last point added
       if (detailedPathWithInfo.length === 0 || !segmentEndNode.equals(detailedPathWithInfo[detailedPathWithInfo.length -1].point)){
           detailedPathWithInfo.push({ point: segmentEndNode, originalStepIndex });
       }
      currentPositionOnSegment = segmentEndNode; // Move to the end node for the next iteration
    }
  }

  // Final filter for strictly unique consecutive points (identical LatLng)
  // This is a simplified duplicate check after the more complex step-indexed logic.
  if (detailedPathWithInfo.length === 0) return [];
  const finalFilteredPath = [detailedPathWithInfo[0]];
  for (let i = 1; i < detailedPathWithInfo.length; i++) {
    if (!detailedPathWithInfo[i].point.equals(finalFilteredPath[finalFilteredPath.length - 1].point)) {
      finalFilteredPath.push(detailedPathWithInfo[i]);
    } else {
      // If points are same, ensure the originalStepIndex is retained from the "later" one if it differs,
      // though the generation logic should mostly handle this. This is a safeguard.
      finalFilteredPath[finalFilteredPath.length - 1].originalStepIndex = detailedPathWithInfo[i].originalStepIndex;
    }
  }
  return finalFilteredPath;
};


// Old generateDetailedPath - kept for reference or if needed for non-step-indexed paths,
// but not used for main simulation path anymore.
export const generateDetailedPath = (
    originalPath: any[], 
    interpolationThreshold: number, // This parameter is now effectively unused if generateDetailedPathWithStepInfo is primary
    stepDistance: number
  ): any[] => { 
    // Fix: Cast window to any to access google maps property without full Window type definition.
    if (!(window as any).google || !(window as any).google.maps || !(window as any).google.maps.geometry || !(window as any).google.maps.geometry.spherical) {
      console.warn("Google Maps Geometry library not loaded. Cannot generate detailed path.");
      return originalPath; 
    }
    if (originalPath.length < 2) {
      return originalPath;
    }
  
    const detailedPath: any[] = [originalPath[0]]; 
  
    for (let i = 0; i < originalPath.length - 1; i++) {
      const p1 = originalPath[i];
      const p2 = originalPath[i + 1];
      const segmentDistance = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
  
      // Original logic:
      if (segmentDistance > interpolationThreshold && segmentDistance > stepDistance) {
        const numberOfIntermediatePoints = Math.max(0, Math.floor(segmentDistance / stepDistance) -1); 
        for (let j = 1; j <= numberOfIntermediatePoints; j++) {
          const fraction = j / (numberOfIntermediatePoints + 1);
          const interpolatedPoint = google.maps.geometry.spherical.interpolate(p1, p2, fraction);
          if (interpolatedPoint) {
            detailedPath.push(interpolatedPoint);
          }
        }
      }
      detailedPath.push(p2);
    }
    
    return detailedPath.filter((point, index, self) =>
        index === 0 || !point.equals(self[index - 1])
    );
};


export const reverseGeocode = async (latLng: any): Promise<string> => { // Was latLng: google.maps.LatLng
  await loadGoogleMapsApi();
  // Fix: Cast window to any to access google maps property without full Window type definition.
  const geocoder = new (window as any).google.maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: latLng }, (results: any, status: any) => { // results and status types become any
      // Fix: Cast window to any to access google maps property without full Window type definition.
      if (status === (window as any).google.maps.GeocoderStatus.OK && results && results[0]) {
        resolve(results[0].formatted_address);
      } else {
        reject(new Error(`Reverse geocoding failed: ${status}`));
      }
    });
  });
};
