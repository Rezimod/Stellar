import type { Region } from '@/lib/location'

export interface Dealer {
  id: string
  name: string
  tagline?: string
  flag?: string
  region: Region
  country: string
  website: string
  logo?: string
  description: string
  shipsTo: string[]
  currency: string
  currencySymbol: string
}

export interface Product {
  id: string
  dealerId: string
  name: string
  price: number
  currency: string
  currencySymbol: string
  starsPrice: number
  category: 'telescope' | 'accessory'
  description: string
  image: string
  externalUrl: string
  badge?: string
  specs?: Record<string, string>
}

const DEALERS: Dealer[] = [
  {
    id: 'astroman',
    name: 'Astroman',
    tagline: "Georgia's first astronomy store",
    flag: '🇬🇪',
    region: 'caucasus',
    country: 'GE',
    website: 'https://astroman.ge',
    description: "Georgia's first astronomy store — telescopes, gadgets & star maps",
    shipsTo: ['GE', 'AM', 'AZ', 'TR'],
    currency: 'GEL',
    currencySymbol: '₾',
  },
  {
    id: 'celestron-us',
    name: 'Celestron',
    tagline: "World's #1 telescope brand",
    flag: '🇺🇸',
    region: 'north_america',
    country: 'US',
    website: 'https://celestron.com',
    description: "World's #1 telescope brand — trusted by astronomers since 1960",
    shipsTo: ['US', 'CA'],
    currency: 'USD',
    currencySymbol: '$',
  },
  {
    id: 'bresser-eu',
    name: 'Bresser',
    tagline: "Germany's leading optics manufacturer",
    flag: '🇩🇪',
    region: 'europe',
    country: 'DE',
    website: 'https://bresser.de',
    description: "Germany's leading optics manufacturer — precision telescopes since 1957",
    shipsTo: ['DE', 'AT', 'CH', 'FR', 'IT', 'NL', 'BE', 'PL'],
    currency: 'EUR',
    currencySymbol: '€',
  },
]

const PRODUCTS: Product[] = [
  // Astroman products
  {
    id: 'scope-bresser-76-300',
    dealerId: 'astroman',
    name: 'Bresser Junior 76/300 Compact',
    price: 288,
    currency: 'GEL',
    currencySymbol: '₾',
    starsPrice: 2880,
    category: 'telescope',
    description: '76mm reflector, 300mm focal length. Compact and lightweight — ideal for beginners and young astronomers.',
    image: 'https://astroman.ge/wp-content/uploads/2024/11/222.jpg',
    externalUrl: 'https://astroman.ge/teleskopi/',
  },
  {
    id: 'scope-bresser-50-360',
    dealerId: 'astroman',
    name: 'Bresser Junior 50/360 with Tent',
    price: 399,
    currency: 'GEL',
    currencySymbol: '₾',
    starsPrice: 3990,
    category: 'telescope',
    description: '50mm refractor with pop-up observation tent. Perfect gift set for young astronomers.',
    image: 'https://astroman.ge/wp-content/uploads/2022/09/22122.jpg',
    externalUrl: 'https://astroman.ge/teleskopi/',
  },
  {
    id: 'scope-natgeo-60-700',
    dealerId: 'astroman',
    name: 'National Geographic 60/700 AZ',
    price: 779,
    currency: 'GEL',
    currencySymbol: '₾',
    starsPrice: 7790,
    category: 'telescope',
    description: '60mm refractor, 700mm focal length on alt-az mount. Great for Moon, planets, and terrestrial viewing.',
    image: 'https://astroman.ge/wp-content/uploads/2025/11/%E1%83%91%E1%83%94%E1%83%A5%E1%83%98-02.jpg',
    externalUrl: 'https://astroman.ge/teleskopi/',
  },
  {
    id: 'scope-foreseen-80',
    dealerId: 'astroman',
    name: 'Foreseen 80mm Refractor',
    price: 856,
    currency: 'GEL',
    currencySymbol: '₾',
    starsPrice: 8560,
    category: 'telescope',
    description: '80mm aperture refractor with sharp optics. Excellent planetary views and wide star fields.',
    image: 'https://astroman.ge/wp-content/uploads/2024/08/Telescope.jpg',
    externalUrl: 'https://astroman.ge/teleskopi/',
  },
  {
    id: 'scope-natgeo-76-700',
    dealerId: 'astroman',
    name: 'National Geographic 76/700 Reflector',
    price: 788,
    currency: 'GEL',
    currencySymbol: '₾',
    starsPrice: 7880,
    category: 'telescope',
    description: '76mm Newtonian reflector, 700mm focal length. Excellent light-gathering for deep-sky objects.',
    image: 'https://astroman.ge/wp-content/uploads/2024/08/0144181_national-geographic-114900-reflector-telescope-az_550.jpeg',
    externalUrl: 'https://astroman.ge/teleskopi/',
  },
  {
    id: 'scope-bresser-venus-76-700',
    dealerId: 'astroman',
    name: 'Bresser Venus 76/700 AZ',
    price: 998,
    currency: 'GEL',
    currencySymbol: '₾',
    starsPrice: 9980,
    category: 'telescope',
    description: '76mm refractor with 700mm focal length on sturdy alt-az mount. Great all-rounder for visual observing.',
    image: 'https://astroman.ge/wp-content/uploads/2025/12/2221.jpg',
    externalUrl: 'https://astroman.ge/teleskopi/',
  },
  {
    id: 'scope-celestron-70az',
    dealerId: 'astroman',
    name: 'Celestron AstroMaster 70AZ',
    price: 1258,
    currency: 'GEL',
    currencySymbol: '₾',
    starsPrice: 12580,
    category: 'telescope',
    description: "Celestron's popular 70mm refractor on alt-az mount. Crystal-clear views of Moon and planets right out of the box.",
    image: 'https://astroman.ge/wp-content/uploads/2024/11/23312.jpg',
    externalUrl: 'https://astroman.ge/teleskopi/',
  },
  {
    id: 'scope-nexstar-90slt',
    dealerId: 'astroman',
    name: 'Celestron NexStar 90SLT',
    price: 2660,
    currency: 'GEL',
    currencySymbol: '₾',
    starsPrice: 26600,
    category: 'telescope',
    description: '90mm computerized GoTo telescope with 4,000+ object database. Auto-aligns and tracks celestial objects.',
    image: 'https://astroman.ge/wp-content/uploads/2024/11/1222.jpg',
    externalUrl: 'https://astroman.ge/teleskopi/',
  },
  {
    id: 'scope-starsense-dx6',
    dealerId: 'astroman',
    name: 'Celestron StarSense Explorer DX 6',
    price: 3998,
    currency: 'GEL',
    currencySymbol: '₾',
    starsPrice: 39980,
    category: 'telescope',
    description: '150mm Newtonian with smartphone star-finding technology. Point your phone at the sky to locate objects.',
    image: 'https://astroman.ge/wp-content/uploads/2025/09/%E1%83%91%E1%83%94%E1%83%A5%E1%83%98-02.jpg',
    externalUrl: 'https://astroman.ge/teleskopi/',
  },
  // Celestron (US) products — real data from celestron.com/collections/telescopes
  {
    id: 'cel-nexstar8se',
    dealerId: 'celestron-us',
    name: 'Celestron NexStar 8SE',
    price: 1699,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 16990,
    category: 'telescope',
    description: '8-inch Schmidt-Cassegrain with fully automated GoTo mount. 4,000+ object database, auto-align. The most popular telescope in America.',
    image: 'https://www.celestron.com/cdn/shop/files/RS15946_11069_NexStar_8SE_Computerized_Telescope_1-hpr.jpg?v=1728102013',
    externalUrl: 'https://www.celestron.com/collections/telescopes',
    badge: 'Best Seller',
    specs: { aperture: '203mm', focal: '2032mm', mount: 'GoTo Alt-Az' },
  },
  {
    id: 'cel-nexstar6se',
    dealerId: 'celestron-us',
    name: 'Celestron NexStar 6SE',
    price: 1199,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 11990,
    category: 'telescope',
    description: '6-inch Schmidt-Cassegrain with computerized GoTo mount. Exceptional optics at a mid-range price point.',
    image: 'https://www.celestron.com/cdn/shop/products/050234110686_NexStar_6SE_11068_1.jpg?v=1727902053',
    externalUrl: 'https://www.celestron.com/collections/telescopes',
    specs: { aperture: '150mm', focal: '1500mm', mount: 'GoTo Alt-Az' },
  },
  {
    id: 'cel-starsense-dx130',
    dealerId: 'celestron-us',
    name: 'StarSense Explorer DX 130AZ',
    price: 499.95,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 4999,
    category: 'telescope',
    description: '130mm Newtonian reflector with smartphone star-finding technology. Point your phone at the sky and the app tells you exactly where to look.',
    image: 'https://www.celestron.com/cdn/shop/products/22461_StarSense_Explorer_DX_130_01.jpg?v=1727800326',
    externalUrl: 'https://www.celestron.com/collections/telescopes',
    badge: 'Popular',
    specs: { aperture: '130mm', focal: '650mm', mount: 'Manual Alt-Az' },
  },
  {
    id: 'cel-starsense-dx102',
    dealerId: 'celestron-us',
    name: 'StarSense Explorer DX 102AZ',
    price: 489.95,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 4899,
    category: 'telescope',
    description: '102mm refractor with phone-guided star-finding. App shows a live bullseye overlay to point at any object.',
    image: 'https://www.celestron.com/cdn/shop/products/22460_StarSense_Explorer_DX_102_01.jpg?v=1727800279',
    externalUrl: 'https://www.celestron.com/collections/telescopes',
    specs: { aperture: '102mm', focal: '660mm', mount: 'Manual Alt-Az' },
  },
  {
    id: 'cel-starsense-lt114',
    dealerId: 'celestron-us',
    name: 'StarSense Explorer LT 114AZ',
    price: 259.95,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 2599,
    category: 'telescope',
    description: '114mm Newtonian with smartphone app navigation. Ideal first telescope — no alignment needed.',
    image: 'https://www.celestron.com/cdn/shop/products/22452_StarSense_Explorer_LT_114_01.jpg?v=1727800415',
    externalUrl: 'https://www.celestron.com/collections/telescopes',
    specs: { aperture: '114mm', focal: '1000mm', mount: 'Manual Alt-Az' },
  },
  {
    id: 'cel-travelscope80',
    dealerId: 'celestron-us',
    name: 'Celestron Travel Scope 80',
    price: 149.95,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 1499,
    category: 'telescope',
    description: 'Ultra-portable 80mm refractor with smartphone adapter. Fits in a backpack — perfect for travel and camping.',
    image: 'https://www.celestron.com/cdn/shop/products/22030_Travel_Scope_80_01_CallOut.jpg?v=1584998404',
    externalUrl: 'https://www.celestron.com/collections/telescopes',
    specs: { aperture: '80mm', focal: '400mm', mount: 'Manual Alt-Az' },
  },
  // Bresser (Europe) products — real data from bresser.com
  {
    id: 'bre-sirius70',
    dealerId: 'bresser-eu',
    name: 'Bresser Sirius 70/900 AZ',
    price: 146,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 1460,
    category: 'telescope',
    description: '70mm refractor, 900mm focal length with smartphone camera adapter. Great all-round beginner telescope.',
    image: 'https://www.bresser.com/media/91/fd/b7/1772098134/4512001_M_V2019.webp?ts=1772098134',
    externalUrl: 'https://www.bresser.com/astronomy/telescopes/telescopes-for-beginners/',
    specs: { aperture: '70mm', focal: '900mm', mount: 'Manual Alt-Az' },
  },
  {
    id: 'bre-natgeo114',
    dealerId: 'bresser-eu',
    name: 'National Geographic 114/900 Reflector',
    price: 159.90,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 1599,
    category: 'telescope',
    description: '114mm Newtonian reflector on alt-az mount. National Geographic quality optics with included accessories.',
    image: 'https://www.bresser.com/media/bc/8d/1c/1763650950/9011200_M_011_2_v1125.jpg?ts=1763657831',
    externalUrl: 'https://www.bresser.com/astronomy/telescopes/telescopes-for-beginners/',
    badge: 'Popular',
    specs: { aperture: '114mm', focal: '900mm', mount: 'Manual Alt-Az' },
  },
  {
    id: 'bre-solarix114',
    dealerId: 'bresser-eu',
    name: 'Bresser Solarix 114/500',
    price: 168,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 1680,
    category: 'telescope',
    description: '114mm reflector with solar filter included. Observe both the night sky and sunspots safely.',
    image: 'https://www.bresser.com/media/ec/07/b6/1772097914/4614505_M_1_v0617.webp?ts=1772097914',
    externalUrl: 'https://www.bresser.com/astronomy/telescopes/telescopes-for-beginners/',
    specs: { aperture: '114mm', focal: '500mm', mount: 'EQ3' },
  },
  {
    id: 'bre-pluto114',
    dealerId: 'bresser-eu',
    name: 'Bresser Pluto 114/500 EQ3',
    price: 259,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 2590,
    category: 'telescope',
    description: '114mm reflector on EQ3 equatorial mount with smartphone adapter and solar filter. Complete package.',
    image: 'https://www.bresser.com/media/4c/36/5f/1772098041/4614500_M1_2019.webp?ts=1772098041',
    externalUrl: 'https://www.bresser.com/astronomy/telescopes/telescopes-for-beginners/',
    specs: { aperture: '114mm', focal: '500mm', mount: 'EQ3' },
  },
  {
    id: 'bre-pollux150',
    dealerId: 'bresser-eu',
    name: 'Bresser Pollux-II 150/1400 EQ3',
    price: 369,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 3690,
    category: 'telescope',
    description: '150mm Newtonian reflector on EQ3 with smartphone adapter and solar filter. Excellent deep-sky views.',
    image: 'https://www.bresser.com/media/71/3e/61/1772097582/4690900_M_01_v0823.webp?ts=1772097582',
    externalUrl: 'https://www.bresser.com/astronomy/telescopes/telescopes-for-beginners/',
    badge: 'Best Seller',
    specs: { aperture: '150mm', focal: '1400mm', mount: 'EQ3' },
  },
  {
    id: 'bre-messier6dobson',
    dealerId: 'bresser-eu',
    name: 'Bresser Messier 6" Dobson',
    price: 399,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 3990,
    category: 'telescope',
    description: '6-inch planetary Dobsonian reflector. Best bang-for-buck for deep sky — see galaxies and nebulae.',
    image: 'https://www.bresser.com/media/30/8c/4a/1772098361/4716416_M_1.webp?ts=1772098361',
    externalUrl: 'https://www.bresser.com/astronomy/telescopes/telescopes-for-beginners/',
    specs: { aperture: '152mm', focal: '1200mm', mount: 'Dobsonian' },
  },
]

// Global fallback: 3 telescopes from Astroman + 3 from Celestron (no Bresser, no digital)
function buildGlobalFallback(): Product[] {
  const globalDealerIds = ['astroman', 'celestron-us']
  return globalDealerIds.flatMap((id) =>
    PRODUCTS.filter((p) => p.dealerId === id && p.category === 'telescope')
      .sort((a, b) => a.price - b.price)
      .slice(0, 3)
  )
}

const GLOBAL_FALLBACK = buildGlobalFallback()

export function getDealersByRegion(region: Region): Dealer[] {
  if (region === 'global') return DEALERS
  return DEALERS.filter((d) => d.region === region)
}

export function getProductsByRegion(region: Region): Product[] {
  if (region === 'global') return GLOBAL_FALLBACK
  const dealerIds = getDealersByRegion(region).map((d) => d.id)
  return PRODUCTS.filter((p) => dealerIds.includes(p.dealerId))
}

export function getDealerById(id: string): Dealer | undefined {
  return DEALERS.find((d) => d.id === id)
}

export function getProductsByDealer(dealerId: string): Product[] {
  return PRODUCTS.filter((p) => p.dealerId === dealerId)
}

export function getAllDealers(): Dealer[] {
  return DEALERS
}
