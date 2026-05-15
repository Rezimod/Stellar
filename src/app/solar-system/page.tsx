import dynamic from 'next/dynamic';
import './solar-system.css';

const SolarSystemExplorer = dynamic(
  () => import('@/components/solar-system/SolarSystemExplorer'),
  {
    ssr: false,
    loading: () => (
      <div
        className="solar-system solar-system--immersive solar-system--loading"
        aria-busy="true"
        aria-label="Loading solar system"
      />
    ),
  },
);

export default function SolarSystemPage() {
  return <SolarSystemExplorer />;
}
