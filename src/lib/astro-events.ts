export interface AstroEvent {
  name: string;
  date: string; // YYYY-MM-DD
  description: string;
  viewingTip: string;
}

const EVENTS_2026: AstroEvent[] = [
  {
    name: 'Lyrids Meteor Shower',
    date: '2026-04-22',
    description: 'Annual meteor shower producing up to 20 meteors per hour.',
    viewingTip: 'Look northeast after midnight. Best away from city lights.',
  },
  {
    name: 'Eta Aquariids Meteor Shower',
    date: '2026-05-06',
    description: 'Debris from Halley\'s Comet — up to 50 meteors/hour at peak.',
    viewingTip: 'Best before dawn. Look toward Aquarius in the east.',
  },
  {
    name: 'Mars at Opposition',
    date: '2026-05-17',
    description: 'Mars is closest to Earth and fully illuminated — brightest of the year.',
    viewingTip: 'Visible all night. Even small telescopes show surface detail.',
  },
  {
    name: 'Saturn at Opposition',
    date: '2026-09-15',
    description: 'Saturn at its biggest and brightest. Rings tilted 22° toward Earth.',
    viewingTip: 'Any telescope shows the rings. Look south after sunset.',
  },
  {
    name: 'Perseid Meteor Shower',
    date: '2026-08-12',
    description: 'One of the best annual showers — up to 100 meteors per hour.',
    viewingTip: 'Look northeast after 10 PM. No equipment needed.',
  },
  {
    name: 'Jupiter at Opposition',
    date: '2026-10-19',
    description: 'Jupiter at its closest — largest and brightest in the sky.',
    viewingTip: 'Binoculars show the four Galilean moons. Telescopes reveal cloud bands.',
  },
  {
    name: 'Leonids Meteor Shower',
    date: '2026-11-17',
    description: 'Fast meteors from Comet Tempel-Tuttle — up to 15/hour.',
    viewingTip: 'Best after midnight facing Leo in the east.',
  },
  {
    name: 'Geminids Meteor Shower',
    date: '2026-12-13',
    description: 'The most reliable shower of the year — up to 120 meteors/hour.',
    viewingTip: 'Start watching at 9 PM. Radiant is near Castor in Gemini.',
  },
];

export function getUpcomingEvents(fromDate: Date): AstroEvent[] {
  const from = fromDate.getTime();
  const cutoff = from + 30 * 24 * 60 * 60 * 1000;

  return EVENTS_2026.filter(e => {
    const t = new Date(e.date + 'T12:00:00').getTime();
    return t >= from && t <= cutoff;
  }).sort((a, b) => a.date.localeCompare(b.date));
}
