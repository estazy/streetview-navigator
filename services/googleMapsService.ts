
// Global declaration for Google Maps API, used because @types/google.maps is not installed.
declare const google: any;

// Promise to ensure Google Maps API is loaded before making calls.
let googleMapsApiPromise: Promise<void> | null = null;

/**
 * Loads the Google Maps API script if not already loaded.
 * Resolves when the necessary Google Maps services are available.
 * @returns {Promise<void>} A promise that resolves when the API is ready.
 */
export const loadGoogleMapsApi = (): Promise<void> => {
  if (!googleMapsApiPromise) {
    googleMapsApiPromise = new Promise((resolve, reject) => {
      const checkApi = () => {
        // Check if core Google Maps objects and specific services/libraries are available on the window object.
        if ((window as any).google && 
            (window as any).google.maps && 
            (window as any).google.maps.DirectionsService && 
            (window as any).google.maps.StreetViewService && 
            (window as any).google.maps.Geocoder && 
            (window as any).google.maps.geometry && 
            (window as any).google.maps.geometry.poly &&  // For polyline interactions
            (window as any).google.maps.geometry.spherical) { // For distance/heading calculations
          resolve();
        } else if ((document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]') as HTMLScriptElement | null)?.src.includes('YOUR_GOOGLE_MAPS_API_KEY_HERE')) {
          // Critical error: Placeholder API key detected in the script URL.
          console.error("Google Maps API key placeholder detected in script tag. API calls will fail.");
          reject(new Error("Google Maps API key is a placeholder. Please configure a valid API key in index.html."));
        }
        else {
          // If API not ready, check again shortly.
          setTimeout(checkApi, 100); 
        }
      };
      checkApi();
    });
  }
  return googleMapsApiPromise;
};

/**
 * Fetches route directions between two locations using Google Maps Directions Service.
 * @param {string} start - The starting location address or query.
 * @param {string} end - The ending location address or query.
 * @returns {Promise<any>} A promise that resolves with the DirectionsResult object (typed as 'any').
 */
export const getRouteDirections = async (
  start: string,
  end: string
): Promise<any> => { // Was Promise<google.maps.DirectionsResult>
  await loadGoogleMapsApi(); // Ensure API is loaded

  const directionsService = new (window as any).google.maps.DirectionsService();
  
  return new Promise((resolve, reject) => {
    directionsService.route(
      {
        origin: start,
        destination: end,
        travelMode: (window as any).google.maps.TravelMode.DRIVING, // Assuming driving directions
      },
      (result: any, status: any) => { // result: google.maps.DirectionsResult, status: google.maps.DirectionsStatus
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

/**
 * Generates a detailed path for simulation by stepping along each segment of the route's DirectionsSteps.
 * Each point in the detailed path is tagged with the index of its original DirectionsStep.
 * This allows linking Street View images back to specific turn-by-turn instructions.
 *
 * @param {any[]} steps - An array of google.maps.DirectionsStep objects from a DirectionsResult.
 * @param {number} stepDistance - The desired distance (in meters) between points on the detailed path.
 * @returns {Array<{ point: any, originalStepIndex: number }>} An array of PathSegment objects.
 *           Each PathSegment contains a google.maps.LatLng 'point' and its 'originalStepIndex'.
 */
export const generateDetailedPathWithStepInfo = (
  steps: any[], // google.maps.DirectionsStep[]
  stepDistance: number
): Array<{ point: any, originalStepIndex: number }> => { // Returns PathSegment[]
  // Ensure the spherical geometry library is loaded, as it's used for calculations.
  if (!(window as any).google?.maps?.geometry?.spherical) {
    console.warn("Google Maps Geometry library (spherical) not loaded for detailed path generation.");
    return [];
  }
  const detailedPathWithInfo: Array<{ point: any, originalStepIndex: number }> = [];

  // Iterate over each step in the original directions (e.g., "Turn left onto Main St").
  for (let originalStepIndex = 0; originalStepIndex < steps.length; originalStepIndex++) {
    const currentStep = steps[originalStepIndex];
    // `path` within a DirectionsStep is an array of google.maps.LatLng objects forming that step's geometry.
    const pathForThisStep: any[] = currentStep.path; 

    if (!pathForThisStep || pathForThisStep.length === 0) continue; // Skip if a step has no path.

    // Get the last point added to the global detailed path to avoid duplicates if steps connect seamlessly.
    let lastAddedPointToGlobalPath = detailedPathWithInfo.length > 0 ? detailedPathWithInfo[detailedPathWithInfo.length - 1].point : null;

    // Add the first point of the current step's path, if it's different from the last point added globally.
    // This ensures each step's start is represented.
    if (!lastAddedPointToGlobalPath || !pathForThisStep[0].equals(lastAddedPointToGlobalPath)) {
        detailedPathWithInfo.push({ point: pathForThisStep[0], originalStepIndex });
    }
    
    // `currentPositionOnSegment` tracks our position as we "walk" along the segments of `pathForThisStep`.
    // Initialize to the start of the current step's path.
    let currentPositionOnSegment = pathForThisStep[0];

    // Iterate through the segments within the current DirectionsStep's path.
    // A segment is defined by two consecutive LatLngs from `pathForThisStep`.
    for (let i = 0; i < pathForThisStep.length - 1; i++) {
      const segmentStartNode = pathForThisStep[i]; // The actual start node of this sub-segment from Google.
      const segmentEndNode = pathForThisStep[i+1];   // The actual end node of this sub-segment from Google.
      
      // Reset currentPositionOnSegment to the true start of this sub-segment.
      currentPositionOnSegment = segmentStartNode;

      let accumulatedDistanceOnSegment = 0;
      // Calculate the total length of this sub-segment.
      const totalSegmentLength = google.maps.geometry.spherical.computeDistanceBetween(currentPositionOnSegment, segmentEndNode);
      
      // If the segment is very short, just ensure its end node is considered and move to the next segment.
      if (totalSegmentLength < 0.1) { // Threshold for "very short" (e.g., 10cm)
         if (detailedPathWithInfo.length === 0 || !segmentEndNode.equals(detailedPathWithInfo[detailedPathWithInfo.length -1].point)){
            detailedPathWithInfo.push({ point: segmentEndNode, originalStepIndex });
         }
         currentPositionOnSegment = segmentEndNode; // Move to the end for the next iteration.
         continue;
      }

      // Calculate the heading (direction) from the start to the end of this sub-segment.
      const heading = google.maps.geometry.spherical.computeHeading(currentPositionOnSegment, segmentEndNode);

      // "Walk" along the sub-segment, adding points at `stepDistance` intervals.
      while (accumulatedDistanceOnSegment + stepDistance < totalSegmentLength) {
        // Calculate the next point by offsetting from the current position by `stepDistance` along the `heading`.
        currentPositionOnSegment = google.maps.geometry.spherical.computeOffset(currentPositionOnSegment, stepDistance, heading);
        detailedPathWithInfo.push({ point: currentPositionOnSegment, originalStepIndex });
        accumulatedDistanceOnSegment += stepDistance;
      }
      
      // Add the actual end node of the sub-segment from Google's path.
      // This ensures path accuracy and includes all original nodes from Google.
      // Avoid adding if it's identical to the last point already added (can happen if stepDistance aligns perfectly).
       if (detailedPathWithInfo.length === 0 || !segmentEndNode.equals(detailedPathWithInfo[detailedPathWithInfo.length -1].point)){
           detailedPathWithInfo.push({ point: segmentEndNode, originalStepIndex });
       }
      currentPositionOnSegment = segmentEndNode; // Move to the end node for the next segment iteration.
    }
  }

  // Final pass: Filter out any strictly consecutive duplicate points (identical LatLngs).
  // This can occasionally happen due to the interaction of stepDistance and segment lengths.
  if (detailedPathWithInfo.length === 0) return [];
  const finalFilteredPath = [detailedPathWithInfo[0]]; // Start with the first point.
  for (let i = 1; i < detailedPathWithInfo.length; i++) {
    // If the current point is different from the last one added to finalFilteredPath, add it.
    if (!detailedPathWithInfo[i].point.equals(finalFilteredPath[finalFilteredPath.length - 1].point)) {
      finalFilteredPath.push(detailedPathWithInfo[i]);
    } else {
      // If points are the same, but originalStepIndex differs, update the existing point in finalFilteredPath
      // to use the originalStepIndex of the "later" occurrence. This is a safeguard;
      // the generation logic should mostly handle this, but it ensures step transitions are correctly associated.
      finalFilteredPath[finalFilteredPath.length - 1].originalStepIndex = detailedPathWithInfo[i].originalStepIndex;
    }
  }
  return finalFilteredPath;
};


/**
 * Reverse geocodes a LatLng coordinate to a human-readable address.
 * @param {any} latLng - The google.maps.LatLng object to geocode (typed as 'any').
 * @returns {Promise<string>} A promise that resolves with the formatted address string.
 */
export const reverseGeocode = async (latLng: any): Promise<string> => { // Was latLng: google.maps.LatLng
  await loadGoogleMapsApi();
  const geocoder = new (window as any).google.maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: latLng }, (results: any, status: any) => { // results: google.maps.GeocoderResult[], status: google.maps.GeocoderStatus
      if (status === (window as any).google.maps.GeocoderStatus.OK && results && results[0]) {
        resolve(results[0].formatted_address);
      } else {
        reject(new Error(`Reverse geocoding failed: ${status}`));
      }
    });
  });
};
