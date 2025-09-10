import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Store } from "lucide-react";

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

  // Fetch pharmacies
  const { data: pharmacies, isLoading } = useQuery({
    queryKey: ["/api/pharmacies"],
  });

  useEffect(() => {
    if (!mapRef.current || !pharmacies || mapInstanceRef.current) return;

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

      // Initialize map
      const map = window.L.map(mapRef.current).setView([26.9124, 75.7873], 13);
      mapInstanceRef.current = map;

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Add pharmacy markers
      pharmacies.forEach((pharmacy: any) => {
        const marker = window.L.marker([
          parseFloat(pharmacy.latitude), 
          parseFloat(pharmacy.longitude)
        ]).addTo(map);

        const medicinesList = Object.entries(pharmacy.medicines || {})
          .map(([med, qty]) => `${med}: ${qty}`)
          .join('<br>');

        marker.bindPopup(`
          <strong>${pharmacy.pharmacyName}</strong><br>
          ${pharmacy.address}<br>
          ${pharmacy.phone ? `📞 ${pharmacy.phone}<br>` : ''}
          <br><strong>Available medicines:</strong><br>
          ${medicinesList}
        `);
      });
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pharmacies]);

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
        
        {/* Pharmacy List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-4">Loading pharmacies...</div>
          ) : (
            pharmacies?.map((pharmacy: any) => (
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
          )}
        </div>
      </CardContent>
    </Card>
  );
}
