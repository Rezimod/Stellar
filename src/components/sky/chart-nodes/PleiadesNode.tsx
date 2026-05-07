export default function PleiadesNode({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="pn-haze" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0" stopColor="#5EEAD4" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#6D7FC4" stopOpacity="0.22" />
          <stop offset="1" stopColor="#5EEAD4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pn-star" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#5EEAD4" />
          <stop offset="1" stopColor="#A8BEF0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="18" cy="18" r="17" fill="url(#pn-haze)" />
      <g opacity="0.55" stroke="#5EEAD4" strokeWidth="0.35" fill="none">
        <path d="M 14 13 L 19 11 L 23 15 L 20.5 20 L 15 22 L 12 18 Z" />
      </g>
      <g>
        <circle cx="19" cy="11" r="2.4" fill="url(#pn-star)" />
        <circle cx="19" cy="11" r="0.9" fill="#FFFFFF" />
        <circle cx="14" cy="13" r="2" fill="url(#pn-star)" />
        <circle cx="14" cy="13" r="0.75" fill="#FFFFFF" />
        <circle cx="23" cy="15" r="1.9" fill="url(#pn-star)" />
        <circle cx="23" cy="15" r="0.7" fill="#FFFFFF" />
        <circle cx="12" cy="18" r="1.6" fill="url(#pn-star)" />
        <circle cx="12" cy="18" r="0.55" fill="#FFFFFF" />
        <circle cx="20.5" cy="20" r="1.5" fill="url(#pn-star)" />
        <circle cx="20.5" cy="20" r="0.5" fill="#FFFFFF" />
        <circle cx="15" cy="22" r="1.4" fill="url(#pn-star)" />
        <circle cx="15" cy="22" r="0.45" fill="#FFFFFF" />
        <circle cx="25" cy="22" r="1.2" fill="url(#pn-star)" />
        <circle cx="25" cy="22" r="0.4" fill="#FFFFFF" />
      </g>
    </svg>
  );
}
