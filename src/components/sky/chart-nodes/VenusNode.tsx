export default function VenusNode({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="vn-halo" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0.45" stopColor="#FFF3D6" stopOpacity="0" />
          <stop offset="0.7" stopColor="#FFEAB5" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FFD88A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vn-body" cx="0.35" cy="0.32" r="0.78">
          <stop offset="0" stopColor="#FFFBEA" />
          <stop offset="0.6" stopColor="#F0CF7E" />
          <stop offset="1" stopColor="#B58438" />
        </radialGradient>
      </defs>
      <circle cx="14" cy="14" r="13" fill="url(#vn-halo)" />
      <circle cx="14" cy="14" r="10" fill="url(#vn-body)" />
      <ellipse cx="11.5" cy="11" rx="3.5" ry="1.6" fill="#FFFAE0" opacity="0.55" />
      <circle cx="14" cy="14" r="10" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="0.4" />
    </svg>
  );
}
