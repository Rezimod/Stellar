export type DarkSkyLocation = {
  name: string;
  nameKa: string;
  region: string;
  lat: number;
  lon: number;
  bortle: number;
  sqm: number;
  altitude: number;
  notes: string;
};

export const LOCATIONS: DarkSkyLocation[] = [
  { name: 'Kazbegi National Park', nameKa: 'ყაზბეგი', region: 'Georgia', lat: 42.6632, lon: 44.6562, bortle: 2, sqm: 21.8, altitude: 1750, notes: 'Best dark sky in Georgia. Bortle 2 — exceptional.' },
  { name: 'Mestia / Svaneti', nameKa: 'მესტია', region: 'Georgia', lat: 43.0500, lon: 42.7300, bortle: 2, sqm: 21.5, altitude: 1500, notes: 'High altitude mountain range. Outstanding transparency.' },
  { name: 'Borjomi Gorge', nameKa: 'ბორჯომი', region: 'Georgia', lat: 41.8369, lon: 43.3964, bortle: 3, sqm: 21.2, altitude: 800, notes: 'Bortle 3 — rural sky. Good for wide-field observing.' },
  { name: 'Kutaisi Outskirts', nameKa: 'ქუთაისი', region: 'Georgia', lat: 42.1500, lon: 42.6000, bortle: 4, sqm: 20.5, altitude: 300, notes: 'Bortle 4 — suburban. Suitable for planets and Moon.' },
  { name: 'Batumi Foothills', nameKa: 'ბათუმი', region: 'Georgia', lat: 41.7000, lon: 41.8500, bortle: 5, sqm: 19.8, altitude: 400, notes: 'Bortle 5 — rural/suburban transition.' },
  { name: 'Tbilisi', nameKa: 'თბილისი', region: 'Georgia', lat: 41.6938, lon: 44.8015, bortle: 8, sqm: 17.5, altitude: 490, notes: 'Bortle 8 — city sky. Moon and planets only.' },
  { name: 'Cherry Springs, Pennsylvania', nameKa: 'Cherry Springs', region: 'USA', lat: 41.6640, lon: -77.8249, bortle: 2, sqm: 22.0, altitude: 670, notes: 'Gold-tier dark sky park, USA.' },
  { name: 'La Palma, Canary Islands', nameKa: 'La Palma', region: 'Spain', lat: 28.6585, lon: -17.8646, bortle: 1, sqm: 22.3, altitude: 2400, notes: 'UNESCO Starlight Reserve. Among the darkest in Europe.' },
  { name: 'Atacama Desert, Chile', nameKa: 'Atacama', region: 'Chile', lat: -24.6282, lon: -70.4040, bortle: 1, sqm: 22.5, altitude: 2400, notes: 'Driest place on Earth. World-class observatories here.' },
];
