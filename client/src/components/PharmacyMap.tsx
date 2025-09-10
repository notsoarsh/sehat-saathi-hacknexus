import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Store, Hospital, Crosshair, RefreshCcw } from "lucide-react";
import { useGeolocation, haversineDistance } from "@/hooks/useGeolocation";

// Leaflet types and imports
declare global {
  interface Window {
    L: any;
  }
}

interface PharmacyMapProps {
  className?: string;
}

export default function PharmacyMap({ className }: PharmacyMapProps) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const hospitalsLayerRef = useRef<any>(null);
  const googleFetchedRef = useRef(false);
  const [googleHospitals, setGoogleHospitals] = useState<any[] | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  const pharmaciesLayerRef = useRef<any>(null);
  const { position, error: geoError } = useGeolocation();
  const [fetchKey, setFetchKey] = useState(0);
  const [radius, setRadius] = useState(3000); // meters
  const [showHospitals, setShowHospitals] = useState(true);
  const [showPharmacies, setShowPharmacies] = useState(true);
  const overpassCacheRef = useRef<Map<string, any[]>>(new Map());
  const [hasCenteredUser, setHasCenteredUser] = useState(false);

  // Overpass fallback hospitals
  const { data: overpassHospitals } = useQuery({
    queryKey: ['overpass-hospitals', position?.lat, position?.lon, radius, fetchKey],
    enabled: !!position && !apiKey, // only when no Google key
    queryFn: async () => {
      if (!position) return [];
      const cacheKey = `${position.lat.toFixed(3)}:${position.lon.toFixed(3)}:${radius}`;
      if (overpassCacheRef.current.has(cacheKey)) {
        return overpassCacheRef.current.get(cacheKey)!;
      }
      const query = `https://overpass-api.de/api/interpreter?data=[out:json];(node["amenity"="hospital"](around:${radius},${position.lat},${position.lon});way["amenity"="hospital"](around:${radius},${position.lat},${position.lon}););out center;`;
      const res = await fetch(query);
      const json = await res.json();
      const parsed = json.elements.map((el: any) => {
        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;
        return { id: 'osm-' + el.id, name: el.tags?.name || 'Hospital', lat, lon, raw: el };
      }).filter((h: any) => h.lat && h.lon);
      overpassCacheRef.current.set(cacheKey, parsed);
      return parsed;
    }
  });

  // Google Places hospital fetch
  useEffect(() => {
    if (!apiKey || !position) return;
    if (googleFetchedRef.current) return; // avoid refetch unless radius changes
    // load script if not present
    const existing = document.querySelector(`script[data-google-maps]`);
    const loadAndSearch = () => {
      try {
        const google = (window as any).google;
        if (!google?.maps?.places) return;
        const mapDiv = document.createElement('div');
        mapDiv.style.height = '0px';
        mapDiv.style.width = '0px';
        document.body.appendChild(mapDiv);
        const gMap = new google.maps.Map(mapDiv, { center: { lat: position.lat, lng: position.lon }, zoom: 14 });
        const service = new google.maps.places.PlacesService(gMap);
        const request = { location: { lat: position.lat, lng: position.lon }, radius, type: 'hospital' } as any;
        service.nearbySearch(request, (results: any[], status: string, pagination: any) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
            setGoogleError('Google Places status: ' + status);
            return;
          }
            const mapped = results.map(r => ({
              id: 'g-' + r.place_id,
              name: r.name || 'Hospital',
              lat: r.geometry?.location?.lat(),
              lon: r.geometry?.location?.lng(),
              vicinity: r.vicinity,
              rating: r.rating,
              user_ratings_total: r.user_ratings_total
            })).filter(r => r.lat && r.lon);
            setGoogleHospitals(mapped);
        });
      } catch (e: any) {
        setGoogleError(e.message || 'Failed to load Google Places');
      } finally {
        googleFetchedRef.current = true;
      }
    };

    if (!existing) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      (script as any).dataset.googleMaps = 'true';
      script.onload = loadAndSearch;
      script.onerror = () => setGoogleError('Failed to load Google Maps script');
      document.head.appendChild(script);
    } else {
      if ((window as any).google?.maps?.places) loadAndSearch();
    }
  }, [apiKey, position, radius, fetchKey]);

  // Fetch pharmacies
  const { data: pharmacies, isLoading } = useQuery<any[]>({
    queryKey: ["/api/pharmacies"],
  });

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return; // init once

    // Load Leaflet dynamically
    const loadLeaflet = async () => {
      if (!window.L) {
        // Load Leaflet CSS
        const leafletCSS = document.createElement('link');
        leafletCSS.rel = 'stylesheet';
        leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(leafletCSS);

        // Load Leaflet JS
        const leafletScript = document.createElement('script');
        leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        
        await new Promise((resolve) => {
          leafletScript.onload = resolve;
          document.head.appendChild(leafletScript);
        });
      }

  // Initialize map (fallback Jaipur center)
  const startLat = position?.lat || 26.9124;
  const startLon = position?.lon || 75.7873;
  const map = window.L.map(mapRef.current).setView([startLat, startLon], 13);
      mapInstanceRef.current = map;

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      pharmaciesLayerRef.current = window.L.layerGroup().addTo(map);
      hospitalsLayerRef.current = window.L.layerGroup().addTo(map);

      if (position) {
        userMarkerRef.current = window.L.marker([position.lat, position.lon], { title: 'You are here' }).addTo(map);
      }
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [position]);

  // Update user marker & recenter optionally
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    if (position) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = window.L.marker([position.lat, position.lon], { title: 'You are here' }).addTo(mapInstanceRef.current);
      } else {
        userMarkerRef.current.setLatLng([position.lat, position.lon]);
      }
      // Auto-center on first reliable fix or if map still at fallback
      if (!hasCenteredUser) {
        const accuracy = position.accuracy ?? 0;
        // center immediately; could add accuracy threshold if desired
        mapInstanceRef.current.setView([position.lat, position.lon], accuracy < 50 ? 15 : 13, { animate: true });
        setHasCenteredUser(true);
      }
    }
  }, [position, hasCenteredUser]);

  // Render pharmacies when data or map ready
  useEffect(() => {
    if (!mapInstanceRef.current || !pharmaciesLayerRef.current || !Array.isArray(pharmacies)) return;
    pharmaciesLayerRef.current.clearLayers();
  if (!showPharmacies) return;
  pharmacies.forEach((pharmacy: any) => {
      const marker = window.L.marker([
        parseFloat(pharmacy.latitude),
        parseFloat(pharmacy.longitude)
      ]).addTo(pharmaciesLayerRef.current);
      const medicinesList = Object.entries(pharmacy.medicines || {})
        .map(([med, qty]) => `${med}: ${qty}`)
        .join('<br>');
      let distanceHtml = '';
      if (position) {
        const dist = haversineDistance(position, { lat: parseFloat(pharmacy.latitude), lon: parseFloat(pharmacy.longitude) });
        distanceHtml = `<br><strong>Distance:</strong> ${(dist/1000).toFixed(2)} km`;
      }
      marker.bindPopup(`
        <strong>${pharmacy.pharmacyName}</strong><br>
        ${pharmacy.address}<br>
        ${pharmacy.phone ? `📞 ${pharmacy.phone}<br>` : ''}
        ${distanceHtml}
        <br><strong>Available medicines:</strong><br>
        ${medicinesList}
      `);
    });
  }, [pharmacies, position]);

  // Render hospitals (Google if available else Overpass)
  useEffect(() => {
    if (!mapInstanceRef.current || !hospitalsLayerRef.current) return;
    hospitalsLayerRef.current.clearLayers();
    if (!showHospitals) return;
    const source = apiKey && googleHospitals ? googleHospitals : overpassHospitals;
    if (!source) return;
    source.forEach((h: any) => {
      const icon = window.L.divIcon({
        className: 'hospital-icon',
        html: '<div style="background:#dc2626;color:#fff;border-radius:4px;padding:2px 4px;font-size:10px;">H</div>'
      });
      const popup = `<strong>${h.name}</strong>${h.vicinity ? '<br/>' + h.vicinity : ''}${h.rating ? `<br/>⭐ ${h.rating} (${h.user_ratings_total||0})` : ''}`;
      window.L.marker([h.lat, h.lon], { icon, title: h.name }).addTo(hospitalsLayerRef.current)
        .bindPopup(popup);
    });
  }, [googleHospitals, overpassHospitals, showHospitals, apiKey]);

  const sortedPharmacies: any[] = useMemo(() => {
    if (!Array.isArray(pharmacies)) return [];
    if (!position) return pharmacies as any[];
    return [...pharmacies].map((p: any) => {
      const dist = haversineDistance(position, { lat: parseFloat(p.latitude), lon: parseFloat(p.longitude) });
      return { ...p, __distance: dist };
    }).sort((a, b) => a.__distance - b.__distance);
  }, [pharmacies, position, showPharmacies]);

  const nearest = sortedPharmacies.slice(0, 3);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="w-5 h-5" />
          <span>{t("nearbyPharmacies")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={mapRef} 
          className="h-80 rounded-lg border border-border mb-6"
          data-testid="pharmacy-map"
        />
        <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
          {position ? (
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 rounded">📍 {position.lat.toFixed(4)}, {position.lon.toFixed(4)}</span>
          ) : geoError ? (
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 rounded">{geoError}</span>
          ) : (
            <span className="px-2 py-1 bg-muted rounded flex items-center"><Crosshair className="w-3 h-3 mr-1"/>Locating...</span>
          )}
          <button
            type="button"
            className="inline-flex items-center px-2 py-1 text-xs border rounded hover:bg-accent"
            onClick={() => setFetchKey(k => k + 1)}
          >
            <RefreshCcw className="w-3 h-3 mr-1"/>Refresh Hospitals
          </button>
          <button
            type="button"
            className="inline-flex items-center px-2 py-1 text-xs border rounded hover:bg-accent"
            onClick={() => { if (position && mapInstanceRef.current) { mapInstanceRef.current.setView([position.lat, position.lon], 15, { animate: true }); } }}
          >
            <Crosshair className="w-3 h-3 mr-1"/>Center
          </button>
          <span className="text-muted-foreground">Hospitals: {showHospitals ? ((apiKey && googleHospitals ? googleHospitals.length : (overpassHospitals?.length || 0))) : 'hidden'}</span>
          {apiKey && <span className="text-xs text-primary">(Google)</span>}
          {googleError && <span className="text-xs text-destructive">{googleError}</span>}
          <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
            <input type="checkbox" className="accent-primary" checked={showPharmacies} onChange={e => setShowPharmacies(e.target.checked)} /> Pharmacies
          </label>
          <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
            <input type="checkbox" className="accent-primary" checked={showHospitals} onChange={e => setShowHospitals(e.target.checked)} /> Hospitals
          </label>
          <div className="flex items-center gap-1 text-xs">
            <span>Radius:</span>
            <input
              type="range"
              min={500}
              max={7000}
              step={500}
              value={radius}
              onChange={e => { setRadius(parseInt(e.target.value, 10)); setFetchKey(k => k + 1); }}
            />
            <span>{(radius/1000).toFixed(1)} km</span>
          </div>
          {position?.accuracy != null && (
            <span className="text-xs text-muted-foreground">Acc ±{Math.round(position.accuracy)}m</span>
          )}
        </div>
        
        {/* Pharmacy List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-4">Loading pharmacies...</div>
          ) : showPharmacies ? (
            sortedPharmacies.map((pharmacy: any) => (
              <div 
                key={pharmacy.id} 
                className="flex items-center justify-between p-4 bg-secondary rounded-lg"
                data-testid={`card-pharmacy-${pharmacy.id}`}
              >
                <div className="flex items-center space-x-4">
                  <Store className="text-primary text-xl" />
                  <div>
                    <h4 className="font-bold">{pharmacy.pharmacyName}</h4>
                    <p className="text-sm text-muted-foreground flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{pharmacy.address}</span>
                    </p>
                    {position && (
                      <p className="text-xs text-muted-foreground">Distance: {(pharmacy.__distance/1000).toFixed(2)} km</p>
                    )}
                    {pharmacy.phone && (
                      <p className="text-sm text-muted-foreground flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{pharmacy.phone}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Button 
                    size="sm" 
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    data-testid={`button-view-stock-${pharmacy.id}`}
                  >
                    {t("viewStock")}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground italic">Pharmacies hidden</div>
          )}
        </div>
        {showPharmacies && nearest.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Nearest Pharmacies</h4>
            <ul className="text-sm space-y-1">
              {nearest.map((p: any) => (
                <li key={p.id}>• {p.pharmacyName} – {(p.__distance/1000).toFixed(2)} km</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
