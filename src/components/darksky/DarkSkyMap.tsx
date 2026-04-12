'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type DarkSkyLocation = {
  name: string;
  nameKa: string;
  lat: number;
  lon: number;
  bortle: number;
  sqm: number;
  altitude: number;
  notes: string;
};

const LOCATIONS: DarkSkyLocation[] = [
  { name: 'Kazbegi National Park', nameKa: 'ყაზბეგი', lat: 42.6632, lon: 44.6562, bortle: 2, sqm: 21.8, altitude: 1750, notes: 'Best dark sky in Georgia. Bortle 2 — exceptional.' },
  { name: 'Mestia / Svaneti', nameKa: 'მესტია', lat: 43.0500, lon: 42.7300, bortle: 2, sqm: 21.5, altitude: 1500, notes: 'High altitude mountain range. Outstanding transparency.' },
  { name: 'Borjomi Gorge', nameKa: 'ბორჯომი', lat: 41.8369, lon: 43.3964, bortle: 3, sqm: 21.2, altitude: 800, notes: 'Bortle 3 — rural sky. Good for wide-field observing.' },
  { name: 'Kutaisi Outskirts', nameKa: 'ქუთაისი', lat: 42.1500, lon: 42.6000, bortle: 4, sqm: 20.5, altitude: 300, notes: 'Bortle 4 — suburban. Suitable for planets and Moon.' },
  { name: 'Batumi Foothills', nameKa: 'ბათუმი', lat: 41.7000, lon: 41.8500, bortle: 5, sqm: 19.8, altitude: 400, notes: 'Bortle 5 — rural/suburban transition.' },
  { name: 'Tbilisi', nameKa: 'თბილისი', lat: 41.6938, lon: 44.8015, bortle: 8, sqm: 17.5, altitude: 490, notes: 'Bortle 8 — city sky. Moon and planets only.' },
  { name: 'Cherry Springs, Pennsylvania', nameKa: 'Cherry Springs', lat: 41.6640, lon: -77.8249, bortle: 2, sqm: 22.0, altitude: 670, notes: 'Gold-tier dark sky park, USA.' },
  { name: 'La Palma, Canary Islands', nameKa: 'La Palma', lat: 28.6585, lon: -17.8646, bortle: 1, sqm: 22.3, altitude: 2400, notes: 'UNESCO Starlight Reserve. Among the darkest in Europe.' },
  { name: 'Atacama Desert, Chile', nameKa: 'Atacama', lat: -24.6282, lon: -70.4040, bortle: 1, sqm: 22.5, altitude: 2400, notes: 'Driest place on Earth. World-class observatories here.' },
];

function bortleColor(b: number): string {
  if (b <= 2) return '#34D399';
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
