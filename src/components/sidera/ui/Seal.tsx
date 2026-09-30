/**
 * A round seal, the kind pressed on a certificate: text running the rim, the
 * comet mark at the centre. It turns slowly where motion is allowed.
 */
export default function Seal({
  text = 'SIDERA · FIRST LIGHT · SEALED BEFORE SALE · ',
  size = 132,
  className = '',
}: {
  text?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`sd-seal ${className}`.trim()} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
        <defs>
          <path id="sd-seal-rim" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" />
        </defs>
        <circle cx="60" cy="60" r="58" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".9" />
        <circle cx="60" cy="60" r="54.5" fill="none" stroke="currentColor" strokeWidth=".5" opacity=".7" />
        <circle cx="60" cy="60" r="33" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".7" />
        <circle cx="60" cy="60" r="30" fill="none" stroke="currentColor" strokeWidth="1.1" opacity=".9" />
        <text fill="currentColor" fontSize="7.8" letterSpacing="1.7" fontFamily="var(--font-garamond), Georgia, serif" fontWeight="500">
          <textPath href="#sd-seal-rim">{text}</textPath>
        </text>
        <g transform="translate(49 49)">
          <path
            d="M13.0922 3.36946V1.73961C13.0922 1.27436 12.5543 1.01542 12.1906 1.30569L2.8604 8.75177C-0.321404 11.5593 -0.474794 16.4692 2.52582 19.4698C5.5263 22.4704 10.4363 22.3171 13.2437 19.1351L20.6898 9.80489C20.9801 9.44124 20.7211 8.90346 20.256 8.90346H18.6262C18.211 8.90346 17.9428 8.4646 18.132 8.09517L21.7925 0.950365C22.0383 0.470724 21.5251 -0.0425023 21.0451 0.203175L13.9005 3.86349C13.531 4.05286 13.0922 3.78447 13.0922 3.36946ZM7.99167 18.4452C5.53886 18.4452 3.55044 16.4567 3.55044 14.004C3.55044 11.5512 5.53872 9.56274 7.99167 9.5626C10.4445 9.5626 12.4329 11.5512 12.4329 14.004C12.4329 16.4568 10.4445 18.4452 7.99167 18.4452Z"
            fill="currentColor"
          />
        </g>
        {[0, 90, 180, 270].map((a) => (
          <path key={a} d="M60 3.5l1.6 4-1.6 4-1.6-4z" fill="currentColor" transform={`rotate(${a} 60 60)`} />
        ))}
      </svg>
    </span>
  );
}
