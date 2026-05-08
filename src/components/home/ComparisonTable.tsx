import { Check, Minus } from 'lucide-react';

interface FeatureLabels {
  skyMap: string;
  forecast: string;
  astra: string;
  rewards: string;
  marketplace: string;
}

interface Props {
  features: FeatureLabels;
  otherAppsLabel: string;
  stellarLabel: string;
  footnote: string;
}

type FeatureKey = keyof FeatureLabels;

const ROW_ORDER: FeatureKey[] = ['skyMap', 'forecast', 'astra', 'rewards', 'marketplace'];
const OTHER_APPS_HAS: Record<FeatureKey, boolean> = {
  skyMap: true,
  forecast: false,
  astra: false,
  rewards: false,
  marketplace: false,
};

function Row({
  label,
  has,
  highlight,
}: {
  label: string;
  has: boolean;
  highlight: boolean;
}) {
  return (
    <li className="flex items-center gap-3 py-3.5 border-b border-white/[0.06] last:border-b-0">
      <span className="inline-flex items-center justify-center w-6 h-6 shrink-0">
        {has ? (
          <Check
            size={18}
            strokeWidth={2.5}
            className={highlight ? 'text-[#FFB347]' : 'text-white/55'}
          />
        ) : (
          <Minus size={18} strokeWidth={2.5} className="text-white/25" />
        )}
      </span>
      <span
        className={`text-[14px] md:text-[15px] ${
          has ? 'text-white/90' : 'text-white/45'
        }`}
      >
        {label}
      </span>
    </li>
  );
}

export default function ComparisonTable({
  features,
  otherAppsLabel,
  stellarLabel,
  footnote,
}: Props) {
  return (
    <div className="w-full max-w-[880px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {/* Other apps */}
        <div className="rounded-[18px] border border-white/[0.07] bg-[#0F1422] p-6 md:p-8">
          <div className="text-[12px] font-semibold tracking-[0.18em] uppercase text-white/45 mb-4 md:mb-5">
            {otherAppsLabel}
          </div>
          <ul className="font-body">
            {ROW_ORDER.map((key) => (
              <Row
                key={key}
                label={features[key]}
                has={OTHER_APPS_HAS[key]}
                highlight={false}
              />
            ))}
          </ul>
        </div>

        {/* Stellar */}
        <div
          className="rounded-[18px] border border-[#FFB347]/25 p-6 md:p-8"
          style={{
            background:
              'linear-gradient(155deg, rgba(255,179,71,0.06) 0%, #0F1422 60%)',
          }}
        >
          <div className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[#FFB347] mb-4 md:mb-5">
            {stellarLabel}
          </div>
          <ul className="font-body">
            {ROW_ORDER.map((key) => (
              <Row key={key} label={features[key]} has highlight />
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 md:mt-8 text-center text-[12px] md:text-[12.5px] text-white/35 font-body">
        {footnote}
      </p>
    </div>
  );
}
