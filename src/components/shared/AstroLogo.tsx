import Image from 'next/image';

interface AstroLogoProps {
  heightClass?: string;
  className?: string;
  size?: number;
}

export default function AstroLogo({ heightClass = 'h-8', className = '', size = 28 }: AstroLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/logo.png"
        alt="Stellar logo"
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: 'contain' }}
        priority
      />
      <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.95)', fontFamily: 'Georgia, serif', textShadow: '0 0 20px rgba(56,240,255,0.5), 0 0 40px rgba(56,240,255,0.2)' }}>
        STELLAR
      </span>
    </div>
  );
}
