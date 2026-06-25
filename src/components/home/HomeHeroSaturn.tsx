import HeroSaturn from './HeroSaturn';

// Rendered with SSR so the headline + LCP image ship in the server HTML
// (the old dynamic(ssr:false) wrapper delayed first paint until the chunk
// downloaded and hydrated). HeroSaturn is a client component — all browser
// APIs it uses are inside effects, so it hydrates cleanly.
export default function HomeHeroSaturn() {
  return <HeroSaturn />;
}
