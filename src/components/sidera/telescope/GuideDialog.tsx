'use client';

import DeskModal from './DeskModal';

const STEPS = [
  ['Open the console', 'You are here. No account is needed: every frame is drawn by the sky model and labelled as simulated.'],
  ['Connect to a telescope', 'Open the telescope list and choose a station with a lit dot: it is under a dark sky right now. The controls appear on the right.'],
  ['Park and calibrate', 'Park at zenith, then calibrate. The camera starts during calibration and live stars appear in the view.'],
  ['Choose a target', 'Open the target list, keep “Up in this sky” on, and pick something high. Its coordinates fill in.'],
  ['Point and observe', 'Point to target and watch the field stream past as the mount slews. Once it is tracking, start the observation: the stack builds and the image sharpens.'],
  ['Capture frames', 'Capture whenever the view looks right. Full view (F) fills the screen and keeps hand control and capture along the bottom.'],
  ['Keep your frames', 'Each frame is fingerprinted and listed under the controls. Download it as a PNG; nothing is filed or kept once you leave.'],
] as const;

/** Seven steps from an empty console to a frame of your own. */
export default function GuideDialog({ onClose }: { onClose: () => void }) {
  return (
    <DeskModal
      title="A frame in ten minutes"
      onClose={onClose}
      footer={
        <>
          <span />
          <button type="button" className="sd-btn sd-btn--primary" onClick={onClose}>Back to the console</button>
        </>
      }
    >
      <p className="sd-label">Guide</p>
      <h2 className="sdt-modal__title">A frame in ten minutes</h2>
      <p className="sdt-modal__lead">Seven steps from an empty console to a frame of your own.</p>
      <ol className="sdt-guide">
        {STEPS.map(([title, text], i) => (
          <li key={title} className="sdt-guide__step">
            <span className="sdt-guide__n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3 className="sdt-guide__title">{title}</h3>
              <p className="sdt-guide__text">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </DeskModal>
  );
}
