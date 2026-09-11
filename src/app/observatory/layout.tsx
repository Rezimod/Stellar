import ObservatoryNav from '@/components/observatory/ObservatoryNav';
import Starfield from '@/components/observatory/Starfield';
import PageContainer from '@/components/layout/PageContainer';
import './observatory.css';

/**
 * The observatory runs on a darker ground than the rest of the app: a fixed
 * field of stars under everything, and each page a scene over it — the object
 * large, the controls floating on it. Scoped to this route by the layout.
 */
export default function ObservatoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="obs obs-ground">
      <Starfield />
      <div className="obs-ground__content">
        <PageContainer variant="fullscreen" className="obs-ground__nav">
          <ObservatoryNav />
        </PageContainer>
        {children}
      </div>
    </div>
  );
}
