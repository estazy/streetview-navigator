
import React, { useEffect, useRef } from 'react';
import { MAP_DARK_THEME_STYLES } from '../constants';
import { useLocalization } from '../contexts/LocalizationContext';

// Fix: Declared 'google' as 'any' to suppress TypeScript errors for Google Maps types, as type definitions were not being found.
declare const google: any;

interface MapDisplayProps {
  // Fix: Use 'any' for Google Maps types to suppress TypeScript errors when full type definitions are not available.
  originalRoute: any | null; // Was google.maps.DirectionsRoute | null
  // Fix: Use 'any' for Google Maps types to suppress TypeScript errors when full type definitions are not available.
  interactivePath: any[]; // Was google.maps.LatLng[]
  // Fix: Use 'any' for Google Maps types to suppress TypeScript errors when full type definitions are not available.
  currentLocation: any | null; // Was google.maps.LatLng | null
  isGoogleMapsApiLoaded: boolean;
  onRouteJumpRequest: (indexOnDetailedPath: number) => void;
}

export const MapDisplay: React.FC<MapDisplayProps> = ({ 
    originalRoute, 
    interactivePath, 
    currentLocation, 
    isGoogleMapsApiLoaded,
    onRouteJumpRequest 
}) => {
  const { t } = useLocalization();
  const mapRef = useRef<HTMLDivElement>(null);
  // Fix: Use 'any' for Google Maps types to suppress TypeScript errors when full type definitions are not available.
  const googleMapRef = useRef<any | null>(null); // Was google.maps.Map
  // Fix: Use 'any' for Google Maps types to suppress TypeScript errors when full type definitions are not available.
  const routePolylineRef = useRef<any | null>(null); // Was google.maps.Polyline
  // Fix: Use 'any' for Google Maps types to suppress TypeScript errors when full type definitions are not available.
  const currentLocationMarkerRef = useRef<any | null>(null); // Was google.maps.Marker
  // Fix: Use 'any' for Google Maps types to suppress TypeScript errors when full type definitions are not available.
  const mapClickListenerRef = useRef<any | null>(null); // Was google.maps.MapsEventListener

  useEffect(() => {
    if (isGoogleMapsApiLoaded && mapRef.current && !googleMapRef.current) {
      // Fix: Cast window to any to access google maps property without full Window type definition.
      googleMapRef.current = new (window as any).google.maps.Map(mapRef.current, {
        center: { lat: 13.7563, lng: 100.5018 }, 
        zoom: 6,
        styles: MAP_DARK_THEME_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
    }
  }, [isGoogleMapsApiLoaded]);

  useEffect(() => {
    if (googleMapRef.current && interactivePath.length > 0) {
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
      }
      
      // Fix: Cast window to any to access google maps property without full Window type definition.
      routePolylineRef.current = new (window as any).google.maps.Polyline({
        path: interactivePath, 
        geodesic: true,
        strokeColor: '#4299E1', 
        strokeOpacity: 0.8,
        strokeWeight: 5,
      });
      routePolylineRef.current.setMap(googleMapRef.current);

      if (originalRoute?.bounds) {
        googleMapRef.current.fitBounds(originalRoute.bounds);
      } else if (interactivePath.length > 0) {
        // Fix: Cast window to any to access google maps property without full Window type definition.
        const bounds = new (window as any).google.maps.LatLngBounds();
        interactivePath.forEach(point => bounds.extend(point));
        if(!bounds.isEmpty()) googleMapRef.current.fitBounds(bounds);
      }

      if (mapClickListenerRef.current) {
        mapClickListenerRef.current.remove();
      }
      // Fix: Use 'any' for Google Maps types to suppress TypeScript errors when full type definitions are not available.
      mapClickListenerRef.current = googleMapRef.current.addListener('click', (mapsMouseEvent: any) => { // Was google.maps.MapMouseEvent
        // Fix: Cast window to any to access google maps property without full Window type definition.
        if (mapsMouseEvent.latLng && interactivePath.length > 0 && (window as any).google.maps.geometry && (window as any).google.maps.geometry.poly) {
          let closestPointIndex = -1;
          let minDistanceSq = Infinity; 

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
            let onPolyline = false;
            if (routePolylineRef.current) { 
                // Note: google.maps.geometry.poly.isLocationOnEdge is value access
                 onPolyline = google.maps.geometry.poly.isLocationOnEdge(
                    mapsMouseEvent.latLng, 
                    routePolylineRef.current, 
                    1e-3 
                );
            }
            // Note: google.maps.geometry.spherical.computeDistanceBetween is value access
            if(onPolyline || (google.maps.geometry.spherical.computeDistanceBetween(mapsMouseEvent.latLng, interactivePath[closestPointIndex]) < 2000) ){ 
                onRouteJumpRequest(closestPointIndex);
            }
          }
        }
      });

    } else if (googleMapRef.current && interactivePath.length === 0 && routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
        if (mapClickListenerRef.current) {
            mapClickListenerRef.current.remove();
            mapClickListenerRef.current = null;
        }
    }

    return () => { 
        if (mapClickListenerRef.current) {
            mapClickListenerRef.current.remove();
            mapClickListenerRef.current = null;
        }
    }

  }, [interactivePath, originalRoute, isGoogleMapsApiLoaded, onRouteJumpRequest]);

  useEffect(() => {
    if (googleMapRef.current && currentLocation) {
      if (!currentLocationMarkerRef.current) {
        // Fix: Cast window to any to access google maps property without full Window type definition.
        currentLocationMarkerRef.current = new (window as any).google.maps.Marker({
          position: currentLocation,
          map: googleMapRef.current,
          icon: { 
            // Fix: Cast window to any to access google maps property without full Window type definition.
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#F56565', 
            fillOpacity: 1,
            strokeWeight: 1.5,
            strokeColor: '#FFF', 
          }
        });
      } else {
        currentLocationMarkerRef.current.setPosition(currentLocation);
      }
      const mapBounds = googleMapRef.current.getBounds();
      if (mapBounds && !mapBounds.contains(currentLocation)){
          if (googleMapRef.current && typeof googleMapRef.current.panTo === 'function') {
            googleMapRef.current.panTo(currentLocation); 
          }
      }

    } else if (currentLocationMarkerRef.current && !currentLocation) {
        currentLocationMarkerRef.current.setMap(null);
        currentLocationMarkerRef.current = null;
    }
  }, [currentLocation, isGoogleMapsApiLoaded, interactivePath]); // Added interactivePath to dependency array to ensure pan logic re-evaluates if path changes

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full" aria-label={t.mapPaneTitle}></div>
      {!isGoogleMapsApiLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-10">
          <p className="text-lg">{t.loadingGoogleMaps}</p>
        </div>
      )}
    </div>
  );
};