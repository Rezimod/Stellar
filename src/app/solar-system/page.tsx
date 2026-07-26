import SolarSystemPageClient from '@/components/solar-system/SolarSystemPageClient';
import './solar-system.css';

export default function SolarSystemPage() {
  return (
    <>
      <h1 className="sr-only">Solar System Guide — Explore the Planets, Moons and Sun</h1>
      <SolarSystemPageClient />
    </>
  );
}
