'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LiveView from './LiveView';
import TelemetryPanel from './TelemetryPanel';
import ControlPanel from './ControlPanel';
import MissionLog, { type LogEntry } from './MissionLog';
import TimeControl from './TimeControl';
import { acquisitionStateAt, planAcquisition, pointingAt, type Acquisition } from '@/lib/observatory/mission';
import { evaluateSafety, type AltAz, type SafetyVerdict } from '@/lib/observatory/safety';
import {
  ROIS,
  ROI_BY_ID,
  TRAINS,
  TRAIN_BY_ID,
  fieldOfView,
  effectiveFocalLength,
  fieldRotationDegPerHour,
  resolvingPowerArcsec,
} from '@/lib/observatory/optics';
import {
  SIM_TARGETS,
  SIM_TARGET_BY_ID,
  targetAltAz,
  targetPhoto,
  targetSizeArcmin,
  targetFrameSpan,
  type SimTarget,
} from '@/lib/observatory/sim-targets';
import { effectiveBlurArcsec } from '@/lib/observatory/render';
import { getTonightDarkWindow } from '@/lib/dark-window';
import type { ObservatoryNode } from '@/lib/observatory/types';

/**
 * What an observer would actually put in the train for each target.
 *
 * Planets get a Barlow and a cropped read-out, because 2.9 um pixels
 * undersample this scope at f/10 and a small ROI is what lifts the frame rate
 * into lucky-imaging territory. The Moon gets the reducer so the disc fits.
 * Deep sky stays native and full-frame.
 */
const RECOMMENDED_SETUP: Record<string, { train: string; roi: string; exposureSec: number }> = {
  moon: { train: 'reducer', roi: 'full', exposureSec: 0.01 },
  jupiter: { train: 'barlow2', roi: '640', exposureSec: 0.02 },
  saturn: { train: 'barlow3', roi: '640', exposureSec: 0.05 },
  mars: { train: 'barlow3', roi: '400', exposureSec: 0.02 },
  venus: { train: 'barlow2', roi: '640', exposureSec: 0.005 },
  m42: { train: 'native', roi: 'full', exposureSec: 8 },
  m31: { train: 'reducer', roi: 'full', exposureSec: 30 },
  m57: { train: 'native', roi: 'full', exposureSec: 8 },
};

/** Where the mount sits when it is not working. */
const PARKED: AltAz = { altitude: 0, azimuth: 0 };
/** Typical Tbilisi seeing. Good nights reach 2", poor ones 4". */
const SEEING_ARCSEC = 2.6;
const TICK_MS = 250;

export default function SessionConsole({
  node,
  cloudCover,
}: {
  node: ObservatoryNode;
  cloudCover: number | null;
}) {
  const [clock, setClock] = useState(() => Date.now());
  // Simulated time runs forward from the real clock plus an offset, so the
  // console keeps ticking wherever the visitor moved it to.
  const [offsetMs, setOffsetMs] = useState(0);
  const now = clock + offsetMs;
  const [acquisition, setAcquisition] = useState<Acquisition | null>(null);
  const [exposureSec, setExposureSec] = useState(2);
  const [trainId, setTrainId] = useState('native');
  const [roiId, setRoiId] = useState('full');
  const [gain, setGain] = useState(40);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [captures, setCaptures] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const date = useMemo(() => new Date(now), [now]);
  // Commands must be evaluated on the same clock the buttons were graded on.
  // Reading Date.now() inside a handler instead let a target be offered at the
  // simulated hour and then refused at the real one.
  const nowRef = useRef(now);
  nowRef.current = now;
  const train = TRAIN_BY_ID.get(trainId) ?? TRAINS[1];
  const roi = ROI_BY_ID.get(roiId) ?? ROIS[0];
  const fov = useMemo(
    () => fieldOfView(node.instrument, train, roi),
    [node.instrument, train, roi],
  );
  const diffractionArcsec = useMemo(
    () => resolvingPowerArcsec(node.instrument),
    [node.instrument],
  );

  // Recomputed each tick: a target that is safe now can set below the limit
  // twenty minutes later, and the buttons must say so before they are pressed.
  const verdicts = useMemo(() => {
    const out: Record<string, SafetyVerdict> = {};
    for (const target of SIM_TARGETS) {
      out[target.id] = evaluateSafety(node, targetAltAz(target, node, date), date);
    }
    return out;
  }, [node, date]);

  const status = acquisition ? acquisitionStateAt(acquisition, now) : null;
  const pointing = acquisition ? pointingAt(acquisition, now) : PARKED;
  const target = acquisition ? SIM_TARGET_BY_ID.get(acquisition.targetId) ?? null : null;

  const settledMs = acquisition && status?.state === 'OBSERVING' ? now - acquisition.settledAtMs : 0;
  const subs = Math.floor(settledMs / (exposureSec * 1000));
  const rotationRate = fieldRotationDegPerHour(node.lat, pointing.altitude, pointing.azimuth);

  const append = useCallback((text: string, refused = false) => {
    setLog((prev) => [...prev, { at: nowRef.current, text, refused }].slice(-60));
  }, []);

  const goTo = useCallback(
    (next: SimTarget) => {
      const atMs = nowRef.current;
      const at = new Date(atMs);
      const to = targetAltAz(next, node, at);
      const verdict = evaluateSafety(node, to, at);

      if (!verdict.ok) {
        append(`GoTo ${next.name} refused — ${verdict.reason}`, true);
        return;
      }

      const from = acquisition ? pointingAt(acquisition, atMs) : PARKED;
      setAcquisition(
        planAcquisition({
          targetId: next.id,
          targetName: next.name,
          from,
          to,
          startedAtMs: atMs,
          warm: acquisition !== null,
        }),
      );
      const setup = RECOMMENDED_SETUP[next.id] ?? { train: 'native', roi: 'full', exposureSec: 2 };
      setTrainId(setup.train);
      setRoiId(setup.roi);
      setExposureSec(setup.exposureSec);
      setCaptures(0);
      append(`GoTo ${next.name} — ${to.altitude.toFixed(1)}° altitude, ${to.azimuth.toFixed(1)}° azimuth`);
    },
    [acquisition, append, node],
  );

  const capture = useCallback(() => {
    if (!target) return;
    setCaptures((c) => c + 1);
    append(`Captured ${target.name} — ${subs} subs, ${(subs * exposureSec).toFixed(0)}s integration`);
  }, [append, exposureSec, subs, target]);

  const jumpToNight = useCallback(() => {
    const real = Date.now();
    const window = getTonightDarkWindow(node.lat, node.lon, new Date(real));
    const midpoint = window.midpoint ?? window.duskStart;
    if (!midpoint) return;

    const nextOffset = Math.max(0, midpoint.getTime() - real);
    setOffsetMs(nextOffset);
    nowRef.current = real + nextOffset;
    setAcquisition(null);
    append('Clock moved to tonight\u2019s dark window.');
  }, [append, node.lat, node.lon]);

  const returnToNow = useCallback(() => {
    setOffsetMs(0);
    nowRef.current = Date.now();
    setAcquisition(null);
    append('Clock returned to now.');
  }, [append]);

  const park = useCallback(() => {
    setAcquisition(null);
    append('Parked. Mount at home, camera idle.');
  }, [append]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
      <div className="flex flex-col gap-4">
        <TimeControl
          now={now}
          timezone={node.timezone}
          offsetMs={offsetMs}
          onJumpToNight={jumpToNight}
          onReturnToNow={returnToNow}
        />

        <div className="relative">
          <LiveView
            state={status?.state ?? 'SCHEDULED'}
            progress={status?.progress ?? 0}
            photoSrc={target ? targetPhoto(target)?.src ?? null : null}
            fovArcmin={fov.widthArcmin}
            targetArcmin={target ? targetSizeArcmin(target, date) : 0}
            seeingArcsec={SEEING_ARCSEC}
            diffractionArcsec={diffractionArcsec}
            plateScaleArcsecPx={fov.plateScaleArcsecPx}
            bortle={node.bortle}
            subs={Math.max(1, subs)}
            gain={gain}
            rotationDeg={(rotationRate * settledMs) / 3_600_000}
            seed={Math.round(pointing.altitude * 10) * 1000 + Math.round(pointing.azimuth * 10)}
            frameSpan={target ? targetFrameSpan(target) : 1}
            showFieldStars={target?.brightness !== 'bright'}
          />

          <span
            className="absolute left-3 top-3 rounded border px-2 py-1 font-mono text-[11px] uppercase tracking-wide"
            style={{ borderColor: 'var(--no-border)', background: 'var(--no-dim)', color: 'var(--no)' }}
          >
            Simulated · no instrument connected
          </span>

          <span
            className="absolute bottom-3 left-3 font-mono text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            {status ? status.detail : 'Mount parked'}
            {status && status.state !== 'OBSERVING' && ` · ${Math.round(status.progress * 100)}%`}
          </span>
        </div>

        <TelemetryPanel
          t={{
            state: status?.state ?? 'SCHEDULED',
            altitude: pointing.altitude,
            azimuth: pointing.azimuth,
            fovArcmin: fov.widthArcmin,
            targetArcmin: target ? targetSizeArcmin(target, date) : null,
            subs,
            exposureSec,
            gain,
            seeingArcsec: SEEING_ARCSEC,
            resolvedArcsec: effectiveBlurArcsec({
              seeingArcsec: SEEING_ARCSEC,
              diffractionArcsec,
              subs: Math.max(1, subs),
            }),
            focalLengthMm: effectiveFocalLength(node.instrument, train),
            plateScaleArcsecPx: fov.plateScaleArcsecPx,
            rotationDegPerHour: acquisition ? rotationRate : null,
            cloudCover,
          }}
        />
      </div>

      <div className="flex flex-col gap-4">
        <ControlPanel
          targetId={target?.id ?? null}
          verdicts={verdicts}
          onGoTo={goTo}
          exposureSec={exposureSec}
          brightness={target?.brightness ?? 'faint'}
          onExposure={setExposureSec}
          trainId={trainId}
          onTrain={setTrainId}
          roiId={roiId}
          onRoi={setRoiId}
          gain={gain}
          onGain={setGain}
          onCapture={capture}
          canCapture={status?.state === 'OBSERVING'}
          onPark={park}
          parked={acquisition === null}
        />
        <MissionLog entries={log} timezone={node.timezone} />
        {captures > 0 && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-mono">{captures}</span> simulated capture
            {captures === 1 ? '' : 's'} this session. Simulated frames are never saved to a
            Collection and never mint.
          </p>
        )}
      </div>
    </div>
  );
}
