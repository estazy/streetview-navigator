
// Fix: Declared 'google' as 'any' to suppress TypeScript errors for Google Maps types, as type definitions were not being found.
declare const google: any;

// Ensure google.maps types are available globally if not explicitly imported.
// This is usually handled by the Google Maps API script load.
// For explicit typing, you might install @types/google.maps

export interface GeoPosition {
  lat: number;
  lng: number;
}

export interface RouteStepInfo {
  instructions: string;
  distance: string;
  duration: string;
}

export interface AppRoute {
  // Fix: Use 'any' for Google Maps types to suppress TypeScript errors when full type definitions are not available.
  googleMapsRoute: any; // Was google.maps.DirectionsResult
  geminiSummary?: string;
  // Simplified steps can be derived in RouteDetails component if needed
}

export enum SimulationStatus {
  STOPPED = "STOPPED",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  FINISHED = "FINISHED",
}

// For StreetView status from the service, distinct from simulation status
export enum PanoramaStatus {
  OK = "OK",
  ZERO_RESULTS = "ZERO_RESULTS",
  UNKNOWN_ERROR = "UNKNOWN_ERROR", // Catch-all for other Google Maps errors
}

// For Gemini API (as per guidelines, direct types from SDK are preferred)
// This is a placeholder for expected structure if parsing Gemini output manually.
export interface GeminiNarrativeStep {
  maneuver?: string;
  instruction: string;
  visualCue?: string;
}
export interface GeminiRouteNarrative {
  summary: string;
  steps: GeminiNarrativeStep[];
}

// Represents a single point in the detailed simulation path,
// including the index of the original DirectionsStep it belongs to.
export interface PathSegment {
  // Fix: Use 'any' for Google Maps types
  point: any; // Was google.maps.LatLng
  originalStepIndex: number;
}
