'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LOCATIONS } from '@/lib/darksky-locations';

function bortleColor(b: number): string {
  if (b <= 2) return 'var(--success)';
  if (b <= 4) return '#86EFAC';
  if (b <= 6) return '#FCD34D';
  if (b <= 8) return '#F97316';
  return '#EF4444';
}

export default function DarkSkyMap() {
  return (
    <>
      <style>{`
        .leaflet-popup-content-wrapper {
          background: #0D1321 !important;
          color: #fff !important;
          border-radius: 12px !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          box-shadow: 0 4px 24px rgba(0,0,0,0.6) !important;
        }
        .leaflet-popup-tip {
          background: #0D1321 !important;
        }
        .leaflet-popup-close-button {
          color: rgba(255,255,255,0.5) !important;
        }
        .leaflet-container {
          background: #070B14 !important;
        }
      `}</style>
      <MapContainer
        center={[42.0, 43.5]}
        zoom={6}
        minZoom={2}
        maxZoom={12}
        style={{ height: '400px', width: '100%' }}
        className="sm:!h-[500px]"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        {LOCATIONS.map(loc => {
          const color = bortleColor(loc.bortle);
          const radius = loc.bortle <= 2 ? 12 : loc.bortle <= 4 ? 10 : loc.bortle <= 6 ? 8 : 7;
          return (
            <CircleMarker
              key={loc.name}
              center={[loc.lat, loc.lon]}
              radius={radius}
              fillColor={color}
              fillOpacity={0.85}
              color={color}
              opacity={0.4}
              weight={2}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#fff' }}>{loc.name}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>
                    Bortle: {loc.bortle} / SQM: {loc.sqm}
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                    Altitude: {loc.altitude}m
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{loc.notes}</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </>
  );
}
