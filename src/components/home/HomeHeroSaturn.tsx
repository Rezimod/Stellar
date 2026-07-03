import HeroCosmonaut from './HeroCosmonaut';

// Rendered with SSR so the headline + LCP image ship in the server HTML.
// HeroCosmonaut is a client component — all browser APIs it uses are inside
// effects, so it hydrates cleanly.
export default function HomeHeroSaturn() {
  return <HeroCosmonaut />;
}
