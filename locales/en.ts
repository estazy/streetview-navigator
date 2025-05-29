
export const en = {
  // App.tsx
  appTitle: "Street View Navigator",
  loadingGoogleMaps: "Loading Google Maps API...",
  googleMapsApiNotLoaded: "Google Maps API not loaded. Please wait.",
  enterStartEnd: "Please enter both start and end locations.",
  routeSearchErrorDefault: "Could not find the route. Please check locations and try again.",
  routeSearchErrorNotFound: "One or both locations could not be found. Please check the addresses.",
  routeSearchErrorZeroResults: "No route could be found between the specified locations.",
  routeSearchErrorRequestDenied: "Directions request denied. Check your Google Maps API key and permissions.",
  routeSearchErrorOverQueryLimit: "Directions request quota exceeded. Please try again later.",
  initialPrompt: "Please enter start and end locations to plan your journey.",
  noOverviewPath: "No overview path found for this route.",
  criticalApiKeyError: "CRITICAL ERROR: Google Maps API Key is not configured. Please replace 'YOUR_GOOGLE_MAPS_API_KEY_HERE' in index.html with your API key.",
  geminiApiKeyWarning: "WARNING: Gemini API key (process.env.API_KEY) is not set. Gemini features will be disabled.",
  geolocationError: "Could not retrieve current location. Please enter a starting point manually.",
  geolocationDisabled: "Geolocation is disabled or permission denied. Please enter a starting point manually.",

  // RouteInput.tsx
  startPlaceholder: "Start location (e.g., Eiffel Tower, Paris)",
  endPlaceholder: "End location (e.g., Louvre Museum, Paris)",
  searchButtonLoadingApi: "Loading API...",
  searchButtonSearching: "Searching...",
  searchButtonGetRide: "Get Ride",

  // StreetViewPlayer.tsx
  streetViewRouteLoaded: "Route loaded. Press play to start.",
  streetViewRideFinished: "Ride finished!",
  streetViewSegment: (current: number, total: number) => `Segment ${current} of ${total}`,
  streetViewUnavailable: "Street View unavailable for this segment.",
  streetViewTryingNext: "Street View unavailable. Trying next point...",
  streetViewFrom: (description: string) => `View from: ${description}`,
  streetViewNearRoute: "Near your route",
  noStreetViewOnRoute: "Street View is not available for any part of the generated path. Please try a different route.",
  findingStreetView: "Searching for nearest Street View...",

  // RouteDetails.tsx
  noRoutePlanned: "No route planned yet. Enter start and end locations to see details.",
  currentViewTitle: "Current View",
  geminiNarrativeTitle: "Route Narrative (by Gemini)",
  turnByTurnTitle: "Turn-by-Turn Directions",
  totalDistance: "Total Distance",
  totalDuration: "Total Duration",
  routeDetailsNotLoaded: "Could not load route details.",
  readAloudLabel: "Read route narrative aloud",
  pauseNarrationLabel: "Pause narrative",
  resumeNarrationLabel: "Resume narrative",
  speechNotSupported: "Text-to-speech not supported by your browser.",


  // ControlPanel.tsx
  playLabel: "Play",
  pauseLabel: "Pause",
  stopLabel: "Stop",
  speedLabel: "Speed:",
  progressLabel: "Progress",
  stepDistanceLabel: "Adjust Step:",
  stepDistanceCoarse: "Coarse",
  stepDistanceFine: "Fine",

  // LoadingSpinner.tsx
  loadingRoute: "Loading route...",

  // ErrorDisplay.tsx
  errorTitle: "Error",
  closeErrorLabel: "Close error message",

  // Attribution.tsx
  poweredBy: "Powered by",
  and: "and",
  simulationDisclaimer: "This is a simulation and may not reflect real-world conditions.",

  // MapDisplay.tsx
  mapPaneTitle: "Overview Map",

  // LanguageSwitcher.tsx
  languageSwitcherLabel: "Language:",
};
