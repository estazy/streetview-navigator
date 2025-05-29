
import React, { useEffect, useRef } from 'react';
import { MAP_DARK_THEME_STYLES } from '../constants';
import { useLocalization } from '../contexts/LocalizationContext';

// Global declaration for Google Maps API
declare const google: any;

interface MapDisplayProps {
  originalRoute: any | null; // google.maps.DirectionsRoute | null - used for initial map bounds
  interactivePath: any[]; // google.maps.LatLng[] - detailed path for drawing the polyline
  currentLocation: any | null; // google.maps.LatLng | null - current location for the marker
  isGoogleMapsApiLoaded: boolean; // Flag indicating if the Google Maps API is ready
  onRouteJumpRequest: (indexOnDetailedPath: number) => void; // Callback when user clicks on map to jump
}

export const MapDisplay: React.FC<MapDisplayProps> = ({ 
    originalRoute, 
    interactivePath, 
    currentLocation, 
    isGoogleMapsApiLoaded,
    onRouteJumpRequest 
}) => {
  const { t } = useLocalization(); // Localization hook
  const mapRef = useRef<HTMLDivElement>(null); // Ref for the map container div
  const googleMapRef = useRef<any | null>(null); // Ref for the google.maps.Map instance
  const routePolylineRef = useRef<any | null>(null); // Ref for the google.maps.Polyline instance representing the route
  const currentLocationMarkerRef = useRef<any | null>(null); // Ref for the google.maps.Marker instance for current location
  const mapClickListenerRef = useRef<any | null>(null); // Ref for the map click event listener

  // Effect to initialize the Google Map instance once the API is loaded and the map div is available
  useEffect(() => {
    if (isGoogleMapsApiLoaded && mapRef.current && !googleMapRef.current) {
      // Create new Google Map instance
      googleMapRef.current = new (window as any).google.maps.Map(mapRef.current, {
        center: { lat: 13.7563, lng: 100.5018 }, // Default center (Bangkok)
        zoom: 6, // Default zoom
        styles: MAP_DARK_THEME_STYLES, // Apply dark theme styles
        disableDefaultUI: true, // Disable default map UI elements
        zoomControl: true, // Enable zoom control
        mapTypeControl: false, // Disable map type control
        streetViewControl: false, // Disable Street View pegman
        fullscreenControl: false, // Disable fullscreen control
      });
    }
  }, [isGoogleMapsApiLoaded]); // Runs when API load status changes

  // Effect to draw/update the route polyline on the map and handle map clicks for jumping
  useEffect(() => {
    if (googleMapRef.current && interactivePath.length > 0) {
      // If an old polyline exists, remove it from the map
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
      }
      
      // Create a new polyline with the interactivePath
      routePolylineRef.current = new (window as any).google.maps.Polyline({
        path: interactivePath, 
        geodesic: true,
        strokeColor: '#4299E1', // Teal-ish blue color for the route
        strokeOpacity: 0.8,
        strokeWeight: 5,
      });
      routePolylineRef.current.setMap(googleMapRef.current); // Add polyline to the map

      // Fit map bounds to the route
      if (originalRoute?.bounds) { // If original route object has bounds, use them
        googleMapRef.current.fitBounds(originalRoute.bounds);
      } else if (interactivePath.length > 0) { // Otherwise, calculate bounds from interactivePath
        const bounds = new (window as any).google.maps.LatLngBounds();
        interactivePath.forEach(point => bounds.extend(point));
        if(!bounds.isEmpty()) googleMapRef.current.fitBounds(bounds);
      }

      // Remove any existing click listener before adding a new one
      if (mapClickListenerRef.current) {
        mapClickListenerRef.current.remove();
      }
      // Add click listener to the map for route jumping
      mapClickListenerRef.current = googleMapRef.current.addListener('click', (mapsMouseEvent: any) => { // mapsMouseEvent: google.maps.MapMouseEvent
        if (mapsMouseEvent.latLng && interactivePath.length > 0 && (window as any).google.maps.geometry?.poly) {
          // Find the closest point on the interactivePath to the clicked location
          let closestPointIndex = -1;
          let minDistanceSq = Infinity; // Using squared distance for efficiency (avoids sqrt)

          interactivePath.forEach((point, index) => {
            const distSq = 
                Math.pow(mapsMouseEvent.latLng!.lat() - point.lat(), 2) + 
                Math.pow(mapsMouseEvent.latLng!.lng() - point.lng(), 2);
            if (distSq < minDistanceSq) {
              minDistanceSq = distSq;
              closestPointIndex = index;
            }
          });

          if (closestPointIndex !== -1) {
            // Check if the click was reasonably close to the polyline or the closest point
            let onPolyline = false;
            if (routePolylineRef.current) { 
                 onPolyline = google.maps.geometry.poly.isLocationOnEdge(
                    mapsMouseEvent.latLng, 
                    routePolylineRef.current, 
                    1e-3 // Tolerance for isLocationOnEdge
                );
            }
            // Allow jump if click is on polyline or within a certain spherical distance to the closest path point
            if(onPolyline || (google.maps.geometry.spherical.computeDistanceBetween(mapsMouseEvent.latLng, interactivePath[closestPointIndex]) < 2000) ){ // 2000 meters tolerance
                onRouteJumpRequest(closestPointIndex); // Trigger jump request
            }
          }
        }
      });

    } else if (googleMapRef.current && interactivePath.length === 0 && routePolylineRef.current) {
        // If interactivePath is empty (e.g., route cleared), remove polyline and listener
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
        if (mapClickListenerRef.current) {
            mapClickListenerRef.current.remove();
            mapClickListenerRef.current = null;
        }
    }

    // Cleanup: remove map click listener when component unmounts or dependencies change
    return () => { 
        if (mapClickListenerRef.current) {
            mapClickListenerRef.current.remove();
            mapClickListenerRef.current = null;
        }
    }
  // Dependencies: interactivePath, originalRoute (for bounds), isGoogleMapsApiLoaded, onRouteJumpRequest
  // These trigger re-drawing of the polyline or re-attachment of listeners.
  }, [interactivePath, originalRoute, isGoogleMapsApiLoaded, onRouteJumpRequest]);

  // Effect to update the current location marker on the map
  useEffect(() => {
    if (googleMapRef.current && currentLocation) {
      if (!currentLocationMarkerRef.current) {
        // Create new marker if it doesn't exist
        currentLocationMarkerRef.current = new (window as any).google.maps.Marker({
          position: currentLocation,
          map: googleMapRef.current,
          icon: { // Custom icon for the marker
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#F56565', // Red color
            fillOpacity: 1,
            strokeWeight: 1.5,
            strokeColor: '#FFF', // White border
          }
        });
      } else {
        // Update position of existing marker
        currentLocationMarkerRef.current.setPosition(currentLocation);
      }
      // Pan map to current location if it's outside the current map bounds
      const mapBounds = googleMapRef.current.getBounds();
      if (mapBounds && !mapBounds.contains(currentLocation)){
          if (googleMapRef.current && typeof googleMapRef.current.panTo === 'function') {
            googleMapRef.current.panTo(currentLocation); // Smoothly pan
          }
      }

    } else if (currentLocationMarkerRef.current && !currentLocation) {
        // If currentLocation is null (e.g., route cleared), remove the marker
        currentLocationMarkerRef.current.setMap(null);
        currentLocationMarkerRef.current = null;
    }
  // Dependencies: currentLocation, isGoogleMapsApiLoaded, interactivePath
  // interactivePath is included because map bounds might change with the path, influencing pan logic.
  }, [currentLocation, isGoogleMapsApiLoaded, interactivePath]);

  return (
    <div className="w-full h-full relative">
      {/* Div container for the Google Map */}
      <div ref={mapRef} className="w-full h-full" aria-label={t.mapPaneTitle}></div>
      {/* Display loading message if Google Maps API is not yet loaded */}
      {!isGoogleMapsApiLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-10">
          <p className="text-lg">{t.loadingGoogleMaps}</p>
        </div>
      )}
    </div>
  );
};
