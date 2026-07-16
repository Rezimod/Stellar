'use client';

// §6: shared "Why is this hard?" drawer.
//
// Triggered by a small "i" icon next to the difficulty badge on hard/expert
// mission tiles or on event rows. Mobile = bottom sheet with swipe-down
// dismiss. Desktop = popover. Closes on backdrop tap, Escape, swipe-down.
// Not a blocking modal.

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { X } from 'lucide-react';
import { getTonightDarkWindow } from '@/lib/dark-window';
import AnchoredPanel from './AnchoredPanel';

interface TargetRequirement {
  apertureMm: number;
  apertureInches: string;
  magnification: string;
  bortleMax: number;
  copy: string;
  copyKa?: string;
}

const TARGET_REQUIREMENTS: Record<string, TargetRequirement> = {
  crab: {
    apertureMm: 200,
    apertureInches: '8"',
    magnification: '100×–150×',
    bortleMax: 4,
    copy: 'The Crab Nebula is faint and small. You\'ll need a telescope with at least 8 inches of aperture, dark skies (Bortle 4 or better), and about 25 minutes for your eyes to fully dark-adapt.',
    copyKa: 'კიბორჩხალას ნისლეული მკრთალი და პატარაა. დაგჭირდება ტელესკოპი მინიმუმ 8 დუიმის (20 სმ) აპერტურით, ბნელი ცა (ბორტლე 4 ან უკეთესი) და ~25 წუთი, რომ თვალები სიბნელეს სრულად შეეჩვიოს.',
  },
  andromeda: {
    apertureMm: 50,
    apertureInches: '2"',
    magnification: '20×–40×',
    bortleMax: 5,
    copy: 'Andromeda is huge but diffuse — wide-field is better than high power. Binoculars or a small refractor under Bortle 5 sky show the bright core; the spiral arms only emerge in Bortle 4 or darker.',
    copyKa: 'ანდრომედა უზარმაზარია, მაგრამ გაფანტული — ფართო ხედი ჯობია დიდ გადიდებას. ბინოკლი ან პატარა რეფრაქტორი ბორტლე 5 ცის ქვეშ კაშკაშა ბირთვს აჩვენებს; სპირალური მკლავები მხოლოდ ბორტლე 4-ზე და უფრო ბნელ ცაზე ჩნდება.',
  },
  orion: {
    apertureMm: 80,
    apertureInches: '3"',
    magnification: '40×–80×',
    bortleMax: 6,
    copy: 'M42 is bright enough to glimpse with the naked eye, but it takes ~3 inches of aperture to see structure in the core. Surprisingly tolerant of light pollution — even Bortle 6 still shows it well.',
    copyKa: 'M42 შიშველი თვალითაც შესამჩნევია, მაგრამ ბირთვის სტრუქტურის დასანახად ~3 დუიმი აპერტურა გჭირდება. სინათლის დაბინძურებას საკმაოდ კარგად იტანს — ბორტლე 6-ზეც კარგად ჩანს.',
  },
  saturn: {
    apertureMm: 60,
    apertureInches: '2.4"',
    magnification: '80×–120×',
    bortleMax: 9,
    copy: 'Any small telescope shows Saturn\'s rings — light pollution doesn\'t matter for planets. Steady seeing matters more than sky darkness; wait until Saturn is high in the sky.',
    copyKa: 'ნებისმიერი პატარა ტელესკოპი აჩვენებს სატურნის რგოლებს — პლანეტებისთვის სინათლის დაბინძურებას მნიშვნელობა არ აქვს. ატმოსფეროს სიმშვიდე სიბნელეზე მნიშვნელოვანია; დაელოდე, სანამ სატურნი მაღლა აიწევს.',
  },
  jupiter: {
    apertureMm: 60,
    apertureInches: '2.4"',
    magnification: '80×–150×',
    bortleMax: 9,
    copy: 'Jupiter is the easiest detailed target. Binoculars show the four Galilean moons; any telescope reveals the cloud bands. Like Saturn, atmospheric steadiness beats sky darkness.',
    copyKa: 'იუპიტერი ყველაზე მარტივი დეტალური სამიზნეა. ბინოკლი ოთხ გალილეურ მთვარეს აჩვენებს; ნებისმიერი ტელესკოპი — ღრუბლის ზოლებს. სატურნის მსგავსად, ატმოსფეროს სიმშვიდე სიბნელეზე მეტს ნიშნავს.',
  },
  pleiades: {
    apertureMm: 0,
    apertureInches: 'naked eye',
    magnification: '5×–15×',
    bortleMax: 6,
    copy: 'The Seven Sisters are visible to the naked eye even in city skies. Binoculars show dozens of stars; a wide-field telescope shows hundreds.',
    copyKa: 'შვიდი და შიშველი თვალით ჩანს ქალაქის ცაზეც კი. ბინოკლი ათობით ვარსკვლავს აჩვენებს; ფართოხედიანი ტელესკოპი — ასობით.',
  },
  moon: {
    apertureMm: 0,
    apertureInches: 'naked eye',
    magnification: '50×–200×',
    bortleMax: 9,
    copy: 'The Moon is the most forgiving target — visible from anywhere. First and last quarter give the best crater shadows; full moon washes out detail.',
    copyKa: 'მთვარე ყველაზე მარტივი სამიზნეა — ჩანს ყველგან. პირველი და ბოლო მეოთხედი კრატერების საუკეთესო ჩრდილებს იძლევა; სავსე მთვარე დეტალებს აქრობს.',
  },
};

interface EclipseRequirement {
  copy: string;
  copyKa?: string;
  apertureInches?: string;
  magnification?: string;
  bortleMax?: number;
}

const EVENT_REQUIREMENTS: Record<string, EclipseRequirement> = {
  'eclipse-solar': {
    copy: 'Eclipse glasses or a certified solar filter are required. Without one you risk permanent eye damage in seconds. A pinhole projector works for the partial phase if you don\'t have glasses.',
    copyKa: 'აუცილებელია დაბნელების სათვალე ან სერტიფიცირებული მზის ფილტრი. მის გარეშე თვალის სამუდამო დაზიანების რისკია წამებში. ნაწილობრივი ფაზისთვის პინჰოლ-პროექტორიც გამოდგება.',
    apertureInches: 'eclipse glasses',
    magnification: 'unaided',
    bortleMax: 9,
  },
  'eclipse-lunar': {
    copy: 'A lunar eclipse is a naked-eye event — no equipment needed. Binoculars show the colour change beautifully. The whole eclipse runs 3–6 hours; totality is the centre slice.',
    copyKa: 'მთვარის დაბნელება შიშველი თვალის მოვლენაა — აღჭურვილობა არ გჭირდება. ბინოკლი ფერის ცვლილებას ლამაზად აჩვენებს. მთელი დაბნელება 3–6 საათი გრძელდება; სრული ფაზა შუაშია.',
    apertureInches: 'naked eye',
    magnification: '7×–15×',
    bortleMax: 9,
  },
  'opposition': {
    copy: 'At opposition the planet rises at sunset and is up all night. Wait until it climbs above ~30° altitude — the higher it is, the less atmosphere your view passes through and the sharper it looks.',
    copyKa: 'ოპოზიციისას პლანეტა მზის ჩასვლისას ამოდის და მთელი ღამე ცაზეა. დაელოდე, სანამ ~30°-ზე მაღლა აიწევს — რაც მაღლაა, მით ნაკლებ ატმოსფეროში გადის ხედი და მით მკვეთრია.',
    apertureInches: '2.4"+',
    magnification: '80×–150×',
    bortleMax: 9,
  },
  'meteor-shower': {
    copy: 'Meteor showers are naked-eye events. The wider your view, the more meteors you catch — never use a telescope. Lie flat on a recliner under the darkest sky you can find.',
    copyKa: 'მეტეორული ნაკადები შიშველი თვალის მოვლენაა. რაც უფრო ფართოა ხედი, მით მეტ მეტეორს დაიჭერ — ტელესკოპი არასდროს გამოიყენო. დაწექი შეზლონგზე რაც შეიძლება ბნელი ცის ქვეშ.',
    apertureInches: 'naked eye',
    magnification: '—',
    bortleMax: 5,
  },
  'conjunction': {
    copy: 'A planetary conjunction is a naked-eye event most of the time. Binoculars frame both objects nicely; telescopes break the field too tight unless they\'re very wide.',
    copyKa: 'პლანეტების კონიუნქცია უმეტესად შიშველი თვალის მოვლენაა. ბინოკლი ორივე ობიექტს ლამაზად აჩვენებს; ტელესკოპის ხედი ზედმეტად ვიწროა, თუ ძალიან ფართოხედიანი არაა.',
    apertureInches: 'naked eye',
    magnification: '7×–10×',
    bortleMax: 9,
  },
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** Mission target id (e.g. 'crab') OR event type (e.g. 'eclipse-solar'). */
  target?: string;
  eventType?: string;
  title: string;
  /** Optional user location for tonight's dark-window calculation. */
  location?: { lat: number; lon: number } | null;
  /** Optional Bortle class for the user's location — show a warning if > 6. */
  bortle?: number | null;
  /** When provided, render as a popover anchored to this rect. */
  anchorRect?: DOMRect | null;
}

export default function DifficultyExplainer({
  open, onClose, target, eventType, title, location, bortle, anchorRect,
}: Props) {
  const isKa = useLocale() === 'ka';
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    if (!anchorRect) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      if (!anchorRect) document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, anchorRect]);

  if (!open) return null;

  const targetReq = target ? TARGET_REQUIREMENTS[target.toLowerCase()] : undefined;
  const eventReq = eventType ? EVENT_REQUIREMENTS[eventType] : undefined;
  const copy = isKa
    ? (targetReq?.copyKa ?? eventReq?.copyKa ?? targetReq?.copy ?? eventReq?.copy ?? 'ცოტა მოთმინება და ბნელი ცა ამ სამიზნეს ბევრად აადვილებს.')
    : (targetReq?.copy ?? eventReq?.copy ?? 'A bit of patience and dark skies make this one much easier.');
  const rawAperture = targetReq?.apertureInches ?? eventReq?.apertureInches;
  const aperture = isKa && rawAperture
    ? ({ 'naked eye': 'შიშველი თვალი', 'eclipse glasses': 'დაბნელების სათვალე' }[rawAperture] ?? rawAperture)
    : rawAperture;
  const magnification = targetReq?.magnification ?? eventReq?.magnification;
  const bortleMax = targetReq?.bortleMax ?? eventReq?.bortleMax;

  const darkWindow = location
    ? (() => {
        try {
          return getTonightDarkWindow(location.lat, location.lon, new Date());
        } catch {
          return null;
        }
      })()
    : null;

  const window = darkWindow?.duskStart && darkWindow?.dawnEnd
    ? `${darkWindow.duskStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${darkWindow.dawnEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : null;

  function onTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) setDragY(delta);
  }
  function onTouchEnd() {
    if (dragY > 80) {
      onClose();
    }
    setDragY(0);
    dragStartY.current = null;
  }

  const L = isKa
    ? { why: 'რატომ არის რთული', aperture: 'აპერტურა', mag: 'გადიდება', window: 'ამაღამის ფანჯარა', bestBortle: 'საუკეთესო ბორტლე', yourSky: 'შენი ცა', bortle: 'ბორტლე', warn: 'შენი ცა ამ სამიზნისთვის ზედმეტად ნათელია. გაიარე ქალაქიდან 30–60 კმ, ან ამაღამ უფრო კაშკაშა სამიზნე აირჩიე.' }
    : { why: 'Why this is hard', aperture: 'Aperture', mag: 'Magnification', window: "Tonight's window", bestBortle: 'Best at Bortle', yourSky: 'Your sky', bortle: 'Bortle', warn: 'Your sky is too bright for this target. Drive 30–60 km out of town, or pick a brighter target tonight.' };

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-mono">
            {L.why}
          </p>
          <h3 className="text-text-primary text-base font-semibold mt-0.5" style={{ fontFamily: 'var(--font-display)' }}>
            {title}
          </h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <X size={13} />
        </button>
      </div>

      <p className="text-text-primary text-sm leading-relaxed mt-2">{copy}</p>

      <div className="grid grid-cols-2 gap-2 pt-2 mt-2 border-t border-[var(--border)]">
        {aperture && (
          <Stat label={L.aperture} value={aperture} />
        )}
        {magnification && (
          <Stat label={L.mag} value={magnification} />
        )}
        {window && (
          <Stat label={L.window} value={window} fullWidth />
        )}
        {bortleMax !== undefined && (
          <Stat label={L.bestBortle} value={`≤ ${bortleMax}`} />
        )}
        {bortle !== undefined && bortle !== null && (
          <Stat
            label={L.yourSky}
            value={`${L.bortle} ${bortle}`}
            tone={bortle > 6 ? 'warn' : bortle > (bortleMax ?? 9) ? 'warn' : 'ok'}
          />
        )}
      </div>

      {bortle !== undefined && bortle !== null && bortle > 6 && (
        <p
          className="text-xs leading-relaxed mt-2 px-3 py-2 rounded-md"
          style={{
            background: 'rgba(251, 113, 133, 0.06)',
            border: '0.5px solid rgba(251, 113, 133, 0.3)',
            color: 'var(--negative)',
          }}
        >
          {L.warn}
        </p>
      )}
    </>
  );

  if (anchorRect) {
    return (
      <AnchoredPanel open={open} anchorRect={anchorRect} onClose={onClose} ariaLabel={`Why ${title} is hard`}>
        {body}
      </AnchoredPanel>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(7,11,20,0.55)', pointerEvents: 'auto' }}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="w-full max-w-md rounded-2xl p-5 flex flex-col gap-3 max-h-[80vh] overflow-y-auto"
        style={{
          background: 'var(--canvas)',
          border: '1px solid rgba(255,255,255,0.08)',
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: dragStartY.current === null ? 'transform 200ms ease' : undefined,
        }}
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden mx-auto mb-1 w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
        {body}
      </div>
    </div>
  );
}

interface StatProps {
  label: string;
  value: string;
  fullWidth?: boolean;
  tone?: 'ok' | 'warn';
}

function Stat({ label, value, fullWidth, tone }: StatProps) {
  return (
    <div className={`flex flex-col gap-0.5 ${fullWidth ? 'col-span-2' : ''}`}>
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-mono">
        {label}
      </p>
      <p
        className="text-xs font-mono"
        style={{
          color: tone === 'warn' ? 'var(--negative)' : 'var(--text-primary)',
          fontWeight: 500,
        }}
      >
        {value}
      </p>
    </div>
  );
}
