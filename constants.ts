

// Fix: Declared 'google' as 'any' to suppress TypeScript errors for Google Maps types, as type definitions were not being found.
declare const google: any;

export const DEFAULT_SIMULATION_SPEED = 1500; // ms per step/transition
export const MIN_SIMULATION_SPEED = 250; // ms
export const MAX_SIMULATION_SPEED = 5000; // ms

export const GEMINI_MODEL_TEXT = "gemini-2.5-flash-preview-04-17";

// Placeholder to remind user. Actual key is in index.html
export const GOOGLE_MAPS_API_KEY_PLACEHOLDER = "YOUR_GOOGLE_MAPS_API_KEY_HERE"; 

export const STREET_VIEW_POV_PITCH = 0; // Default pitch for Street View camera
export const STREET_VIEW_RADIUS = 100; // Radius in meters to search for a Street View panorama
                                      // Increased from 50 to 100.
                                      // A larger radius might find a pano if exact point is off-road
                                      // but might also result in less accurate views.

export const INTERPOLATION_THRESHOLD_METERS = 50; // Subdivide segments longer than this for smoother SV

// Street View Step Distance parameters
export const MIN_SV_STEP_DISTANCE = 50;     // Min meters per step for "Fine" detail
export const MAX_SV_STEP_DISTANCE = 1000;   // Max meters per step for "Coarse" detail (Increased to 1km)
export const DEFAULT_SV_STEP_DISTANCE = 200; // Default meters per step (Adjusted for new range)

// Dark theme for Google Maps
// Fix: Use 'any' for Google Maps types to suppress TypeScript errors when full type definitions are not available.
export const MAP_DARK_THEME_STYLES: any[] = [ // Was google.maps.MapTypeStyle[]
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];