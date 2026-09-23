'use client';

import Image from 'next/image';
import Link from 'next/link';
import DeskModal from './DeskModal';

const WAYS = [
  {
    tag: 'Live console',
    title: 'Drive a telescope',
    text: 'Point, track, stack and capture on a station under a dark sky, in real time.',
    points: ['Guided or by hand', 'Live view, full screen', 'Frames you can download'],
    href: null,
    photo: '/sky/targets/jupiter.jpg',
  },
  {
    tag: 'The instrument',
    title: 'Node 01',
    text: 'The Tbilisi telescope that photographs one card a night, with its optics laid out.',
    points: ['Tonight at the eyepiece', 'The light path', 'The night band'],
    href: '/node',
    photo: '/sky/targets/moon.jpg',
  },
  {
    tag: 'The collection decides',
    title: 'Tonight',
    text: 'Holders vote on the card Node 01 points at, and every holder of it receives the photograph.',
    points: ['One vote per holder', 'Locked at 17:00 Tbilisi', 'Cloud carries a card over'],
    href: '/tonight',
    photo: '/sky/targets/m42.jpg',
  },
  {
    tag: 'Hands on',
    title: 'Simulator',
    text: 'Node 01 alone, at nine motor rates, on its own site clock, any hour of tonight.',
    points: ['Real slew times', 'Reducer, native, Barlow', 'The safety envelope'],
    href: '/node/simulator',
    photo: '/sky/targets/m31.jpg',
  },
] as const;

/** The first thing a visitor sees: what this is, and the four doors into it. */
export default function WelcomeDialog({ onClose }: { onClose: () => void }) {
  return (
    <DeskModal title="The telescope console" onClose={onClose} wide>
      <div className="sdt-welcome__head">
        <p className="sd-label">Node 01 · commissioning</p>
        <h2 className="sdt-modal__title">The telescope console</h2>
        <p className="sdt-modal__lead">
          Every frame here is computed from the real sky at the station you connect to, and labelled as simulated. Node 01&rsquo;s
          own photographs go to the holders of the night&rsquo;s card.
        </p>
      </div>
      <ul className="sdt-ways">
        {WAYS.map((w) => (
          <li key={w.title} className="sdt-way">
            <span className="sdt-way__art">
              <Image src={w.photo} alt="" fill sizes="(min-width: 1024px) 260px, 90vw" />
              <span className="sdt-way__tag">{w.tag}</span>
            </span>
            <h3 className="sdt-way__title">{w.title}</h3>
            <p className="sdt-way__text">{w.text}</p>
            <ul className="sdt-way__points">
              {w.points.map((line) => <li key={line}>{line}</li>)}
            </ul>
            {w.href ? (
              <Link href={w.href} className="sdt-way__link">Open</Link>
            ) : (
              <button type="button" className="sdt-way__link sdt-way__link--go" onClick={onClose}>Start here</button>
            )}
          </li>
        ))}
      </ul>
    </DeskModal>
  );
}
