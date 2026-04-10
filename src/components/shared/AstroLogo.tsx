'use client';
import { useState } from 'react';

interface AstroLogoProps {
  heightClass?: string; // e.g. 'h-8', 'h-7', 'h-4'
  className?: string;
}

export default function AstroLogo({ heightClass = 'h-8', className = '' }: AstroLogoProps) {
  const [err, setErr] = useState(false);
  if (err) return <span className="text-2xl leading-none">🔭</span>;
  return (
    <img
      src="https://astroman.ge/logo.png"
      alt="Astroman"
      className={`${heightClass} w-auto object-contain ${className}`}
      onError={() => setErr(true)}
    />
  );
}
