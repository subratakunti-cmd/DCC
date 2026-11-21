import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  MapMouseEvent
} from '@vis.gl/react-google-maps';
import { ShopConfig } from '../types';
import {
  MapPin,
  Navigation,
  Bike,
  Check,
  Store,
  ExternalLink,
  Route as RouteIcon,
  Layers,
  Compass,
  Clock,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';

interface BakeryMapProps {
  config: ShopConfig;
  onApplyDelivery?: (address: string, distanceKm: number, deliveryFee: number) => void;
}

// Google Maps verified store location: Delicious Cake Corner, Mansuka, Ghatal
const DEFAULT_SHOP_LOCATION = { lat: 22.7157, lng: 87.7329 };
const GOOGLE_MAPS_STORE_URL =
  'https://www.google.com/maps/place/Delicious+Cake+Corner/@22.7157,87.7303251,17z/data=!3m1!4b1!4m6!3m5!1s0x39f80f0038f3225f:0xd49fd1f59dea21ff!8m2!3d22.7157!4d87.7329!16s%2Fg%2F11z52vjl02?entry=ttu';

// Common Ghatal & Mansuka delivery landmarks
const LOCAL_LANDMARKS = [
  { name: 'DELICIOUS CAKE CORNER (Bakery Store)', lat: 22.7157, lng: 87.7329, note: 'Shop Origin' },
  { name: 'Mansuka Bazar Market', lat: 22.7120, lng: 87.7350, note: '1.2 km • Free' },
  { name: 'Ghatal Central Bus Stand', lat: 22.6710, lng: 87.7205, note: '5.2 km' },
  { name: 'Kushpata Ghatal Market', lat: 22.6612, lng: 87.7289, note: '6.4 km' },
  { name: 'Gharoighat Bridge Crossing', lat: 22.6580, lng: 87.7170, note: '7.1 km' },
  { name: 'Ghatal Sub-Divisional Hospital', lat: 22.6685, lng: 87.7270, note: '5.8 km' },
  { name: 'Boro Bazar Ghatal', lat: 22.6650, lng: 87.7220, note: '6.0 km' },
  { name: 'Kharar Municipal Area', lat: 22.7050, lng: 87.6850, note: '5.4 km' },
  { name: 'Chandrakona Town Road', lat: 22.7300, lng: 87.5180, note: '23 km' }
];

// Straight line haversine formula as fallback
function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

// Compute delivery fee based on road distance
function getDeliveryFee(km: number): number {
  if (km <= 2.5) return 0; // Free local delivery
  if (km <= 6) return 30;
  if (km <= 12) return 60;
  return 100;
}

export const BakeryMap: React.FC<BakeryMapProps> = ({ config, onApplyDelivery }) => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const isGoogleKeyConfigured = Boolean(
    apiKey &&
      apiKey.trim().length > 15 &&
      apiKey !== '123456' &&
      !apiKey.includes('MY_GOOGLE_MAPS_API_KEY')
  );

  // Map engine mode: 'road' (OSM Live Road Route Map) or 'google'
  const [mapEngine, setMapEngine] = useState<'road' | 'google'>('road');

  const shopLat = typeof config.latitude === 'number' ? config.latitude : DEFAULT_SHOP_LOCATION.lat;
  const shopLng = typeof config.longitude === 'number' ? config.longitude : DEFAULT_SHOP_LOCATION.lng;
  const shopLocation = { lat: shopLat, lng: shopLng };
  const mapsUrl = config.googleMapsUrl || GOOGLE_MAPS_STORE_URL;

  // Selected delivery point
  const [deliveryPoint, setDeliveryPoint] = useState<{ lat: number; lng: number } | null>({
    lat: 22.6710,
    lng: 87.7205
  });
  const [deliveryAddress, setDeliveryAddress] = useState<string>('Ghatal Central Bus Stand');
  const [roadDistanceKm, setRoadDistanceKm] = useState<number>(5.2);
  const [estimatedDurationMins, setEstimatedDurationMins] = useState<number>(14);
  const [routePolylineCoords, setRoutePolylineCoords] = useState<[number, number][]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [applied, setApplied] = useState<boolean>(false);
  const [showShopInfo, setShowShopInfo] = useState<boolean>(true);

  const deliveryFee = getDeliveryFee(roadDistanceKm);

  // Leaflet map refs
  const leafletContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapInstanceRef = useRef<L.Map | null>(null);
  const shopMarkerRef = useRef<L.Marker | null>(null);
  const deliveryMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Fetch real road route from OSRM driving service
  useEffect(() => {
    if (!deliveryPoint) {
      setRoutePolylineCoords([]);
      return;
    }

    let isCancelled = false;
    setIsLoadingRoute(true);

    const originLat = shopLocation.lat;
    const originLng = shopLocation.lng;
    const destLat = deliveryPoint.lat;
    const destLng = deliveryPoint.lng;

    // Use OSRM driving API to get exact road geometry and distance
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;

    fetch(osrmUrl)
      .then((res) => {
        if (!res.ok) throw new Error('OSM Routing request failed');
        return res.json();
      })
      .then((data) => {
        if (isCancelled) return;
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distKm = parseFloat((route.distance / 1000).toFixed(1));
          const durationMins = Math.max(2, Math.round(route.duration / 60));
          const coordinates: [number, number][] = route.geometry.coordinates.map(
            (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
          );

          setRoadDistanceKm(distKm);
          setEstimatedDurationMins(durationMins);
          setRoutePolylineCoords(coordinates);
        } else {
          // Fallback to haversine + 15% road curvature
          const straight = calculateHaversineKm(originLat, originLng, destLat, destLng);
          const estRoad = parseFloat((straight * 1.25).toFixed(1));
          setRoadDistanceKm(estRoad);
          setEstimatedDurationMins(Math.max(3, Math.round(estRoad * 2.5)));
          setRoutePolylineCoords([
            [originLat, originLng],
            [destLat, destLng]
          ]);
        }
      })
      .catch((_err) => {
        if (isCancelled) return;
        // Offline / Fallback
        const straight = calculateHaversineKm(originLat, originLng, destLat, destLng);
        const estRoad = parseFloat((straight * 1.25).toFixed(1));
        setRoadDistanceKm(estRoad);
        setEstimatedDurationMins(Math.max(3, Math.round(estRoad * 2.5)));
        setRoutePolylineCoords([
          [originLat, originLng],
          [destLat, destLng]
        ]);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingRoute(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [deliveryPoint, shopLocation.lat, shopLocation.lng]);

  // Initialize and manage Leaflet map
  useEffect(() => {
    if (mapEngine !== 'road' || !leafletContainerRef.current) return;

    if (!leafletMapInstanceRef.current) {
      const map = L.map(leafletContainerRef.current, {
        center: [shopLocation.lat, shopLocation.lng],
        zoom: 13,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Custom Bakery Pin (Emblem + Beacon)
      const shopIcon = L.divIcon({
        className: 'custom-bakery-shop-icon',
        html: `
          <div style="position: relative; width: 42px; height: 42px;">
            <div style="position: absolute; inset: -4px; border-radius: 9999px; background-color: #f59e0b; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 42px; height: 42px; border-radius: 9999px; background: #4b1d3f; border: 3px solid #fef08a; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); color: #fbbf24; font-weight: 900; font-size: 18px;">
              🎂
            </div>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      });

      const sMarker = L.marker([shopLocation.lat, shopLocation.lng], {
        icon: shopIcon,
        title: config.shopName || 'DELICIOUS CAKE CORNER'
      }).addTo(map);

      sMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; min-width: 180px;">
          <b style="color: #4b1d3f; font-size: 14px; display: block;">${config.shopName || 'DELICIOUS CAKE CORNER'}</b>
          <span style="color: #059669; font-weight: bold; font-size: 11px;">📍 100% Eggless Pure Veg Bakery</span><br/>
          <span style="color: #475569;">Mansuka, Ghatal, West Bengal</span><br/>
          <b style="color: #1e293b;">📞 ${config.phone || '7866971421'}</b>
        </div>
      `);

      shopMarkerRef.current = sMarker;

      // Handle map clicks to set delivery destination
      map.on('click', (e: L.LeafletMouseEvent) => {
        const lat = parseFloat(e.latlng.lat.toFixed(4));
        const lng = parseFloat(e.latlng.lng.toFixed(4));
        setDeliveryPoint({ lat, lng });
        setDeliveryAddress(`Ghatal Coordinates (${lat}, ${lng})`);
        setApplied(false);
      });

      leafletMapInstanceRef.current = map;
    }

    const map = leafletMapInstanceRef.current;
    setTimeout(() => {
      map?.invalidateSize();
    }, 200);

    return () => {
      if (leafletMapInstanceRef.current) {
        leafletMapInstanceRef.current.remove();
        leafletMapInstanceRef.current = null;
      }
    };
  }, [mapEngine, shopLocation.lat, shopLocation.lng, config.shopName, config.phone]);

  // Update delivery marker & route line on Leaflet map
  useEffect(() => {
    const map = leafletMapInstanceRef.current;
    if (!map || mapEngine !== 'road') return;

    // Delivery destination marker
    if (deliveryPoint) {
      const destIcon = L.divIcon({
        className: 'custom-delivery-destination-icon',
        html: `
          <div style="position: relative; width: 38px; height: 38px;">
            <div style="position: absolute; inset: -4px; border-radius: 9999px; background-color: #10b981; opacity: 0.5; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 38px; height: 38px; border-radius: 9999px; background: #16a34a; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); color: #ffffff; font-weight: 900; font-size: 16px;">
              🛵
            </div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      if (!deliveryMarkerRef.current) {
        const marker = L.marker([deliveryPoint.lat, deliveryPoint.lng], {
          icon: destIcon,
          title: deliveryAddress
        }).addTo(map);
        marker.bindPopup(`<b>Delivery Destination</b><br/>${deliveryAddress}`);
        deliveryMarkerRef.current = marker;
      } else {
        deliveryMarkerRef.current.setLatLng([deliveryPoint.lat, deliveryPoint.lng]);
        deliveryMarkerRef.current.setPopupContent(`<b>Delivery Destination</b><br/>${deliveryAddress}`);
      }
    } else if (deliveryMarkerRef.current) {
      deliveryMarkerRef.current.remove();
      deliveryMarkerRef.current = null;
    }

    // Polyline route drawing
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    if (routePolylineCoords.length > 0) {
      // Draw road route line
      const polyline = L.polyline(routePolylineCoords, {
        color: '#4b1d3f',
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Add a subtle dashed inner core for navigation aesthetic
      const innerLine = L.polyline(routePolylineCoords, {
        color: '#fbbf24',
        weight: 2,
        opacity: 0.95,
        dashArray: '6, 8'
      }).addTo(map);

      routePolylineRef.current = polyline;

      // Fit map viewport to encompass the entire route
      map.fitBounds(polyline.getBounds(), {
        padding: [50, 50],
        maxZoom: 16
      });

      return () => {
        innerLine.remove();
      };
    }
  }, [deliveryPoint, routePolylineCoords, deliveryAddress, mapEngine]);

  // Handlers
  const handleSelectLandmark = (item: typeof LOCAL_LANDMARKS[0]) => {
    setDeliveryPoint({ lat: item.lat, lng: item.lng });
    setDeliveryAddress(item.name);
    setApplied(false);
  };

  const handleApply = () => {
    if (onApplyDelivery && deliveryPoint) {
      onApplyDelivery(deliveryAddress, roadDistanceKm, deliveryFee);
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    }
  };

  // Google Maps turn-by-turn navigation link
  const googleNavUrl = deliveryPoint
    ? `https://www.google.com/maps/dir/?api=1&origin=${shopLocation.lat},${shopLocation.lng}&destination=${deliveryPoint.lat},${deliveryPoint.lng}&travelmode=two_wheeler`
    : mapsUrl;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-amber-50/40 via-white to-white">
        <div className="flex items-center gap-3">
          {config.logoUrl ? (
            <img
              src={config.logoUrl}
              alt={config.shopName || 'DELICIOUS CAKE CORNER'}
              className="w-12 h-12 rounded-xl object-cover border-2 border-amber-300 shadow-xs shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-[#4b1d3f] border-2 border-amber-300 flex items-center justify-center text-amber-300 font-bold shrink-0">
              <Store className="w-6 h-6" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 text-lg sm:text-xl tracking-tight uppercase">
                {config.shopName || 'DELICIOUS CAKE CORNER'}
              </h3>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                Delivery Route Hub
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-emerald-700">100% Pure Veg Bakery</span>
              <span>•</span>
              <span className="font-mono text-slate-700 font-semibold">22.7157° N, 87.7329° E</span>
              <span>•</span>
              <span>{config.addressLine1 || 'Mansuka, Ghatal'}</span>
            </p>
          </div>
        </div>

        {/* Right Controls: Map Mode Switcher & Navigation Links */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Map Style Switcher */}
          <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex items-center text-xs font-bold">
            <button
              type="button"
              onClick={() => setMapEngine('road')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                mapEngine === 'road'
                  ? 'bg-white text-[#4b1d3f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RouteIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>Live Road Route Map</span>
            </button>
            <button
              type="button"
              onClick={() => setMapEngine('google')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                mapEngine === 'google'
                  ? 'bg-white text-[#4b1d3f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Google Maps View</span>
            </button>
          </div>

          {/* Launch Google Maps Turn-by-Turn GPS Navigation */}
          <a
            href={googleNavUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            title="Open turn-by-turn directions in Google Maps app"
          >
            <Navigation className="w-3.5 h-3.5 text-amber-300" />
            <span>Open in Google Maps</span>
            <ExternalLink className="w-3 h-3 text-amber-200/70 ml-0.5" />
          </a>
        </div>
      </div>

      {/* Popular Ghatal Landmark Selector Pills */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-[#4b1d3f]" />
          <span>Quick Drop Points:</span>
        </span>
        {LOCAL_LANDMARKS.map((lm) => {
          const isSelected = deliveryAddress === lm.name;
          return (
            <button
              key={lm.name}
              onClick={() => handleSelectLandmark(lm)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#4b1d3f] text-white border-[#4b1d3f] shadow-2xs'
                  : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-200 hover:border-amber-400'
              }`}
            >
              <span>{lm.name}</span>
              <span
                className={`text-[10px] px-1 py-0.2 rounded font-mono font-bold ${
                  isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {lm.note}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Map Container (460px high) */}
      <div className="h-[460px] w-full relative overflow-hidden bg-slate-100">
        {mapEngine === 'road' ? (
          /* Real Leaflet OpenStreetMap Road Route Map */
          <div ref={leafletContainerRef} className="w-full h-full z-0" />
        ) : isGoogleKeyConfigured ? (
          /* Google Maps View */
          <APIProvider apiKey={apiKey}>
            <GoogleMap
              defaultCenter={shopLocation}
              defaultZoom={14}
              mapId="DEMO_MAP_ID"
              className="w-full h-full"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            >
              <AdvancedMarker position={shopLocation} onClick={() => setShowShopInfo(true)}>
                <Pin background="#4b1d3f" borderColor="#ffffff" glyphColor="#fbbf24" scale={1.25} />
              </AdvancedMarker>

              {showShopInfo && (
                <InfoWindow position={shopLocation} onCloseClick={() => setShowShopInfo(false)}>
                  <div className="p-1 max-w-[220px] text-xs font-sans">
                    <span className="font-extrabold text-[#4b1d3f] block text-sm">{config.shopName}</span>
                    <span className="text-[11px] text-amber-900 font-bold block">📍 Verified Store Location</span>
                    <span className="text-slate-600 block text-[11px] mt-1">{config.addressLine1}</span>
                    <span className="text-slate-800 font-mono font-bold block mt-0.5">📞 {config.phone}</span>
                  </div>
                </InfoWindow>
              )}

              {deliveryPoint && (
                <AdvancedMarker position={deliveryPoint}>
                  <Pin background="#16a34a" borderColor="#ffffff" glyphColor="#ffffff" scale={1.1} />
                </AdvancedMarker>
              )}
            </GoogleMap>
          </APIProvider>
        ) : (
          /* Fallback when Google Key is missing */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50">
            <Info className="w-10 h-10 text-amber-600 mb-2" />
            <p className="font-bold text-slate-800 text-sm">Google Maps API Key not active</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Please switch to "Live Road Route Map" above for instant, real-time road directions across Ghatal!
            </p>
            <button
              onClick={() => setMapEngine('road')}
              className="mt-3 px-4 py-2 bg-[#4b1d3f] text-white rounded-xl text-xs font-bold"
            >
              Switch to Live Road Route Map
            </button>
          </div>
        )}

        {/* Floating Route Status HUD Bar */}
        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200/90 shadow-md text-xs flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Compass className="w-4 h-4 text-[#4b1d3f]" />
            <span>{isLoadingRoute ? 'Calculating road route...' : 'Route Active'}</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1 text-slate-600 font-mono">
            <span className="font-extrabold text-[#4b1d3f]">{roadDistanceKm} km</span> road distance
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1 text-emerald-700 font-medium font-mono">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>~{estimatedDurationMins} min by bike</span>
          </div>
        </div>

        {/* Bottom map hint */}
        <div className="absolute bottom-3 left-3 z-10 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-[11px] font-medium pointer-events-none">
          💡 Click anywhere on the map or roads to immediately plot a new delivery route from the bakery!
        </div>
      </div>

      {/* Distance & Rate Calculator Output Bar */}
      <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm block">
                {deliveryAddress ? deliveryAddress : 'No drop point selected'}
              </span>
              <span className="text-[11px] text-slate-500 block">
                From: {config.shopName || 'DELICIOUS CAKE CORNER'} (Mansuka Bakery)
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-600 flex items-center gap-3 pt-1">
            <span>
              Road Route Distance: <b className="font-mono text-slate-900">{roadDistanceKm} km</b>
            </span>
            <span>·</span>
            <span>
              Est. Travel Time: <b className="font-mono text-slate-900">{estimatedDurationMins} mins</b>
            </span>
            <span>·</span>
            <span>
              Delivery Charge:{' '}
              <b
                className={`font-mono font-extrabold ${
                  deliveryFee === 0 ? 'text-emerald-700' : 'text-[#4b1d3f]'
                }`}
              >
                {deliveryFee === 0 ? 'FREE (Within 2.5 km)' : `₹${deliveryFee.toFixed(2)}`}
              </b>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {deliveryPoint && (
            <a
              href={googleNavUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5"
              title="Open GPS navigation for delivery driver"
            >
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              <span>Rider GPS Route</span>
            </a>
          )}

          {deliveryPoint && onApplyDelivery && (
            <button
              onClick={handleApply}
              className="py-2.5 px-4 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              {applied ? <Check className="w-4 h-4 text-emerald-400" /> : <Navigation className="w-4 h-4" />}
              <span>{applied ? '✓ Delivery Applied to Bill!' : 'Apply Delivery to Bill'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
