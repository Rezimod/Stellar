import HomeHeroSaturn from '@/components/home/HomeHeroSaturn';

/* Home — the single hero screen (Spacefox redesign). Earth-limb backdrop,
   sky-calendar ticker, headline block, and the live "Sky tonight" card. */
export default function HomePage() {
  return (
    <div className="relative -mt-14 overflow-x-hidden bg-[#05070F] text-white">
      <HomeHeroSaturn />
    </div>
  );
}
