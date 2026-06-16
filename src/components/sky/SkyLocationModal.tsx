'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, MapPin, Navigation, Search, Check, Lock, X } from 'lucide-react';
import { useLocation, type UserLocation } from '@/lib/location';
import { CITY_PRESETS, type PresetCity } from '@/components/LocationPicker';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Entry-point location chooser for the Sky page. Replaces the inline
 * location chooser pill: when the observatory dashboard opens we ask the
 * user, once, where they're observing from — GPS or a preset city.
 */
export default function SkyLocationModal({ open, onClose }: Props) {
  const { location, setLocation, requestLocation, loading: gpsRefreshing } = useLocation();
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const id = window.setTimeout(() => searchRef.current?.focus(), 80);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(id);
    };
  }, [open, onClose]);

  const q = search.trim().toLowerCase();
  const flatCities = useMemo(
    () => CITY_PRESETS.flatMap((g) => g.cities),
    [],
  );
  const isActive = (p: UserLocation) =>
    p.city === location.city && p.country === location.country;
  const selectedValue = useMemo(() => {
    const active = flatCities.find(isActive);
    return active ? `${active.city}|${active.country}` : '';
  }, [flatCities, location.city, location.country]);
  const groups = useMemo(
    () =>
      CITY_PRESETS
        .map((g) => ({
          ...g,
          cities: q
            ? g.cities.filter(
                (c) =>
                  c.nameEn.toLowerCase().includes(q) ||
                  c.country.toLowerCase().includes(q),
              )
            : g.cities,
        }))
        .filter((g) => g.cities.length > 0),
    [q],
  );

  if (!open || typeof document === 'undefined') return null;

  const handleGPS = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    requestLocation({ fresh: true });
    onClose();
  };

  const handlePreset = (p: UserLocation) => {
    setLocation(p);
    onClose();
  };

  const handleSelect = (value: string) => {
    const [city, country] = value.split('|');
    const preset = flatCities.find((c) => c.city === city && c.country === country);
    if (preset) handlePreset(preset);
  };

  // Current spot, shown as the "Recent" row on the mobile sheet.
  const recent: PresetCity | null =
    flatCities.find(isActive) ??
    (location.city
      ? { ...location, flag: '\u{1F4CD}', nameEn: location.city }
      : null);

  return createPortal(
    <div className="skyloc" role="dialog" aria-modal="true" aria-label="Choose your observing location">
      <div className="skyloc__backdrop" onClick={onClose} />
      <div className="skyloc__panel" role="document">
        <button type="button" className="skyloc__close" onClick={onClose} aria-label="Close">
          <X size={16} aria-hidden="true" />
        </button>

        {/* Mobile-only starry hero — glowing location pin */}
        <div className="skyloc__hero" aria-hidden="true">
          <span className="skyloc__hero-pin">
            <MapPin size={22} aria-hidden="true" />
          </span>
        </div>

        <header className="skyloc__head">
          <span className="skyloc__eyebrow">
            <MapPin size={12} aria-hidden="true" /> Observing from
          </span>
          <h2 className="skyloc__title">Where are you tonight?</h2>
          <p className="skyloc__sub">
            We use your location to show accurate rise/set times, the sky map,
            and a personalized forecast.
          </p>
        </header>

        <button type="button" className="skyloc__gps" onClick={handleGPS} disabled={gpsRefreshing}>
          <Navigation size={14} className={gpsRefreshing ? 'skyloc__spin' : ''} aria-hidden="true" />
          {gpsRefreshing ? 'Detecting your location…' : 'Use my GPS location'}
        </button>

        <div className="skyloc__or" aria-hidden="true"><span>OR</span></div>

        <div className="skyloc__search">
          <Search size={14} aria-hidden="true" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search if your city is not shown…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {!q && (
          <label className="skyloc__select">
            <span className="skyloc__select-label">City</span>
            <select value={selectedValue} onChange={(e) => handleSelect(e.target.value)}>
              {CITY_PRESETS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.cities.map((c) => (
                    <option key={`${c.city}-${c.country}`} value={`${c.city}|${c.country}`}>
                      {c.flag} {c.city}, {c.country}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </label>
        )}

        {!q && recent && (
          <div className="skyloc__recent">
            <p className="skyloc__recent-label">Recent</p>
            <button
              type="button"
              className="skyloc__recent-row"
              onClick={() => handlePreset(recent)}
            >
              <span className="skyloc__flag" aria-hidden="true">{recent.flag}</span>
              <span className="skyloc__recent-name">{recent.city}, {recent.country}</span>
              <ChevronRight size={16} aria-hidden="true" className="skyloc__recent-chev" />
            </button>
          </div>
        )}

        <div className={`skyloc__list${q ? ' is-searching' : ''}`}>
          {groups.length === 0 ? (
            <p className="skyloc__empty">No cities found</p>
          ) : (
            groups.map((g) => (
              <div key={g.label} className="skyloc__group">
                <p className="skyloc__group-label">
                  <span>{g.label}</span>
                  <span className="skyloc__group-count">{g.cities.length}</span>
                </p>
                {g.cities.map((c) => {
                  const active = isActive(c);
                  return (
                    <button
                      key={`${c.city}-${c.country}`}
                      type="button"
                      className={`skyloc__city${active ? ' is-active' : ''}`}
                      onClick={() => handlePreset(c)}
                    >
                      <span className="skyloc__flag" aria-hidden="true">{c.flag}</span>
                      <span className="skyloc__city-name">{c.city}</span>
                      <span className="skyloc__city-country">{c.country}</span>
                      {active && <Check size={14} aria-hidden="true" className="skyloc__check" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <p className="skyloc__privacy">
          <Lock size={12} aria-hidden="true" /> Your location is private and never shared.
        </p>
      </div>
    </div>,
    document.body,
  );
}
