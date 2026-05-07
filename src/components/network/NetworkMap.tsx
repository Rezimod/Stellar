'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { NetworkObservation, NodeType } from '@/app/api/network/observations/route';

function bortleColor(b: number): string {
  if (b <= 2) return 'var(--success)';
  if (b <= 4) return '#5EEAD4';
  if (b <= 6) return 'var(--terracotta)';
  if (b <= 8) return 'var(--terracotta)';
  return 'var(--negative)';
}

const NODE_COLOR: Record<NodeType, string> = {
  passive: 'var(--text-muted)',
  observer: 'var(--stl-teal)',
  advanced: 'var(--stars)',
};

function formatWallet(w: string | null): string {
  if (!w) return '—';
  return `${w.slice(0, 4)}…${w.slice(-4)}`;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then || Number.isNaN(then) || then < 1_000_000_000_000) return '';
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function NetworkMap({ observations }: { observations: NetworkObservation[] }) {
  const bortleMarkers = observations.filter(o => o.source === 'bortle' && o.lat != null && o.lon != null);
  const missionMarkers = observations.filter(o => o.source === 'mission' && o.lat != null && o.lon != null);

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
        .leaflet-popup-tip { background: #0D1321 !important; }
        .leaflet-popup-close-button { color: rgba(255,255,255,0.5) !important; }
        .leaflet-container { background: var(--canvas) !important; }
      `}</style>
      <MapContainer
        center={[42.0, 43.5]}
        zoom={4}
        minZoom={2}
        maxZoom={12}
        style={{ height: '420px', width: '100%' }}
        className="sm:!h-[520px]"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {/* Bortle readings */}
        {bortleMarkers.map(o => {
          const bortle = o.extra?.bortle ?? 5;
          const color = bortleColor(bortle);
          const radius = bortle <= 2 ? 11 : bortle <= 4 ? 9 : bortle <= 6 ? 7 : 6;
          return (
            <CircleMarker
              key={o.id}
              center={[o.lat as number, o.lon as number]}
              radius={radius}
              fillColor={color}
              fillOpacity={0.8}
              color={color}
              opacity={0.4}
              weight={2}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#fff' }}>
                    {o.target.replace(/^Bortle \d+ · /, '')}
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>
                    Bortle: {bortle}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255, 179, 71,0.9)', marginTop: 4 }}>
                    Advanced node · site reading
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Observation pins */}
        {missionMarkers.map(o => {
          const color = NODE_COLOR[o.nodeType];
          return (
            <CircleMarker
              key={o.id}
              center={[o.lat as number, o.lon as number]}
              radius={5}
              fillColor={color}
              fillOpacity={0.9}
              color={color}
              opacity={0.5}
              weight={1.5}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#fff' }}>
                    {o.target}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2, textTransform: 'capitalize' }}>
                    {o.nodeType} node
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>
                    {timeAgo(o.timestamp)}
                  </p>
                  <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.45)' }}>
                    {formatWallet(o.wallet)}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </>
  );
}
