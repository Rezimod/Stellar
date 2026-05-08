import { Check, Minus } from 'lucide-react';

type Mark = 'yes' | 'no' | 'partial';

interface FeatureLabels {
  skyMap: string;
  forecast: string;
  astra: string;
  rewards: string;
  marketplace: string;
}

interface Props {
  features: FeatureLabels;
  footnote: string;
}

// Apps don't get translated — they're proper nouns. The factual marks below
// reflect publicly documented feature sets as of the date in `footnote`.
const APPS = ['Stellar', 'SkySafari', 'Sky Tonight', 'Stellarium'] as const;
type App = typeof APPS[number];

type Row = {
  key: keyof FeatureLabels;
  marks: Record<App, Mark>;
};

const ROWS: Row[] = [
  {
    key: 'skyMap',
    marks: { Stellar: 'yes', SkySafari: 'yes', 'Sky Tonight': 'yes', Stellarium: 'yes' },
  },
  {
    key: 'forecast',
    marks: { Stellar: 'yes', SkySafari: 'no', 'Sky Tonight': 'partial', Stellarium: 'no' },
  },
  {
    key: 'astra',
    marks: { Stellar: 'yes', SkySafari: 'no', 'Sky Tonight': 'no', Stellarium: 'no' },
  },
  {
    key: 'rewards',
    marks: { Stellar: 'yes', SkySafari: 'no', 'Sky Tonight': 'no', Stellarium: 'no' },
  },
  {
    key: 'marketplace',
    marks: { Stellar: 'yes', SkySafari: 'no', 'Sky Tonight': 'no', Stellarium: 'no' },
  },
];

function MarkCell({ mark, isStellar }: { mark: Mark; isStellar: boolean }) {
  if (mark === 'yes') {
    return (
      <Check
        size={18}
        strokeWidth={2.5}
        aria-label="yes"
        className={isStellar ? 'text-[#FFB347]' : 'text-white/55'}
      />
    );
  }
  if (mark === 'partial') {
    // A small filled half-circle conveys "partial" without using extra icon
    // weight. Honest for Sky Tonight's limited weather hooks.
    return (
      <span
        aria-label="partial"
        className="inline-block w-[10px] h-[10px] rounded-full border border-white/40 bg-white/15"
      />
    );
  }
  return <Minus size={18} strokeWidth={2.5} aria-label="no" className="text-white/25" />;
}

export default function ComparisonTable({ features, footnote }: Props) {
  return (
    <div className="w-full max-w-[880px] mx-auto">
      {/* Desktop / tablet: full table */}
      <div className="hidden sm:block overflow-hidden rounded-[14px] border border-white/8 bg-[#0F1422]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/8">
              <th className="py-4 px-5 md:px-6 text-[12px] font-semibold tracking-[0.18em] uppercase text-white/45">
                Feature
              </th>
              {APPS.map((app) => {
                const isStellar = app === 'Stellar';
                return (
                  <th
                    key={app}
                    scope="col"
                    className={`py-4 px-3 md:px-4 text-center text-[13px] md:text-[14px] font-semibold ${
                      isStellar ? 'text-[#FFB347]' : 'text-white/65'
                    }`}
                  >
                    {app}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="font-body">
            {ROWS.map((row, i) => (
              <tr
                key={row.key}
                className={i < ROWS.length - 1 ? 'border-b border-white/[0.06]' : ''}
              >
                <td className="py-4 px-5 md:px-6 text-[14px] md:text-[15px] text-white/85">
                  {features[row.key]}
                </td>
                {APPS.map((app) => (
                  <td key={app} className="py-4 px-3 md:px-4 text-center align-middle">
                    <span className="inline-flex items-center justify-center w-6 h-6">
                      <MarkCell mark={row.marks[app]} isStellar={app === 'Stellar'} />
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked rows. Each feature shows the four app marks as a
          compact 4-up grid. Easier to scan than horizontal scroll. */}
      <div className="sm:hidden space-y-2.5">
        {ROWS.map((row) => (
          <div
            key={row.key}
            className="rounded-[12px] border border-white/8 bg-[#0F1422] px-4 py-3.5"
          >
            <div className="text-[14px] font-medium text-white/90 mb-3">
              {features[row.key]}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {APPS.map((app) => {
                const isStellar = app === 'Stellar';
                return (
                  <div key={app} className="flex flex-col items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-6 h-6">
                      <MarkCell mark={row.marks[app]} isStellar={isStellar} />
                    </span>
                    <span
                      className={`text-[10.5px] tracking-[0.04em] ${
                        isStellar ? 'text-[#FFB347] font-semibold' : 'text-white/45'
                      }`}
                    >
                      {app}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 md:mt-8 text-center text-[12px] md:text-[12.5px] text-white/35 font-body">
        {footnote}
      </p>
    </div>
  );
}
