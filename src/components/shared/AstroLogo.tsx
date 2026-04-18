import Image from 'next/image';

const LOGO_ASPECT = 3480 / 1976;

interface AstroLogoProps {
  heightClass?: string;
  className?: string;
  /** Rendered height in px. Width is derived from the logo's native aspect ratio. */
  size?: number;
  /** 'white' for dark surfaces (default), 'black' for light surfaces. */
  variant?: 'white' | 'black';
  /** Show the STELLAR wordmark next to the icon. */
  showWordmark?: boolean;
}

export default function AstroLogo({
  className = '',
  size = 28,
  variant = 'white',
  showWordmark = true,
}: AstroLogoProps) {
  const src = variant === 'black' ? '/logo-black.png' : '/logo.png';
  const width = Math.round(size * LOGO_ASPECT);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src={src}
        alt="Stellar logo"
        width={width}
        height={size}
        style={{ width, height: size, objectFit: 'contain' }}
        priority
      />
      {showWordmark && (
        <span
          style={{
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '0.14em',
            color: variant === 'black' ? '#0a0a0a' : 'rgba(255,255,255,0.95)',
            fontFamily: 'Georgia, serif',
            textShadow: variant === 'black' ? 'none' : '0 0 20px rgba(99,102,241,0.5), 0 0 40px rgba(99,102,241,0.2)',
          }}
        >
          STELLAR
        </span>
      )}
    </div>
  );
}
