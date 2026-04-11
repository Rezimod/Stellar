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
  category: 'telescope' | 'accessory' | 'gadget' | 'digital' | 'mount'
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
    externalUrl: 'https://astroman.ge',
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
    externalUrl: 'https://astroman.ge',
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
    externalUrl: 'https://astroman.ge',
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
    externalUrl: 'https://astroman.ge',
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
    externalUrl: 'https://astroman.ge',
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
    externalUrl: 'https://astroman.ge',
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
    externalUrl: 'https://astroman.ge',
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
    externalUrl: 'https://astroman.ge',
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
    externalUrl: 'https://astroman.ge',
  },
  {
    id: 'acc-phone',
    dealerId: 'astroman',
    name: 'Smartphone Telescope Adapter',
    price: 59,
    currency: 'GEL',
    currencySymbol: '₾',
    starsPrice: 590,
    category: 'accessory',
    description: 'Universal phone clip adapter for afocal astrophotography through any eyepiece.',
    image: 'https://astroman.ge/wp-content/uploads/2022/09/%E1%83%90%E1%83%93%E1%83%90%E1%83%9E%E1%83%A2%E1%83%94%E1%83%A0%E1%83%98.jpg',
    externalUrl: 'https://astroman.ge',
  },
  {
    id: 'acc-eyepiece',
    dealerId: 'astroman',
    name: 'Premium 8mm Eyepiece',
    price: 179,
    currency: 'GEL',
    currencySymbol: '₾',
    starsPrice: 1790,
    category: 'accessory',
    description: '8mm wide-field eyepiece (66° AFOV). Excellent for planetary detail and tight clusters.',
    image: 'https://astroman.ge/wp-content/uploads/2022/09/%E1%83%90%E1%83%93%E1%83%90%E1%83%9E%E1%83%A2%E1%83%94%E1%83%A0%E1%83%98.jpg',
    externalUrl: 'https://astroman.ge',
  },
  {
    id: 'dig-starmap',
    dealerId: 'astroman',
    name: 'Custom Star Map',
    price: 29,
    currency: 'GEL',
    currencySymbol: '₾',
    starsPrice: 290,
    category: 'digital',
    description: 'High-resolution star map for any date, time, and location. Print-ready PDF delivered instantly.',
    image: '',
    externalUrl: 'https://astroman.ge',
  },
  {
    id: 'dig-guide',
    dealerId: 'astroman',
    name: 'Georgian Night Sky Guide PDF',
    price: 24,
    currency: 'GEL',
    currencySymbol: '₾',
    starsPrice: 240,
    category: 'digital',
    description: "Complete observer's guide to the Georgian night sky: seasonal charts, object list, observing tips.",
    image: '',
    externalUrl: 'https://astroman.ge',
  },
  {
    id: 'dig-ai',
    dealerId: 'astroman',
    name: 'ASTRA Premium (1 month)',
    price: 49,
    currency: 'GEL',
    currencySymbol: '₾',
    starsPrice: 490,
    category: 'digital',
    description: "Unlock ASTRA's full capabilities: personalized observation plans, equipment advice, sky alerts.",
    image: '',
    externalUrl: 'https://astroman.ge',
  },
  // Celestron (US) products
  {
    id: 'cel-nexstar6se',
    dealerId: 'celestron-us',
    name: 'Celestron NexStar 6SE',
    price: 849,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 8490,
    category: 'telescope',
    description: '6-inch Schmidt-Cassegrain with fully automated GoTo mount. 4,000+ object database, auto-align.',
    image: 'https://www.celestron.com/cdn/shop/files/11068-1.jpg',
    externalUrl: 'https://celestron.com',
    badge: 'Best Seller',
    specs: { aperture: '150mm', focal: '1500mm', mount: 'GoTo Alt-Az' },
  },
  {
    id: 'cel-astromaster70',
    dealerId: 'celestron-us',
    name: 'Celestron AstroMaster 70AZ',
    price: 109,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 1090,
    category: 'telescope',
    description: "Celestron's popular 70mm refractor on alt-az mount. Great views of Moon and planets out of the box.",
    image: 'https://www.celestron.com/cdn/shop/files/21061_1.jpg',
    externalUrl: 'https://celestron.com',
    specs: { aperture: '70mm', focal: '900mm', mount: 'Manual Alt-Az' },
  },
  {
    id: 'cel-starsense',
    dealerId: 'celestron-us',
    name: 'Celestron StarSense Explorer 100AZ',
    price: 229,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 2290,
    category: 'telescope',
    description: 'Phone-guided refractor — app tells you exactly where to point. Perfect first telescope.',
    image: 'https://www.celestron.com/cdn/shop/files/22460_1.jpg',
    externalUrl: 'https://celestron.com',
    badge: 'Popular',
    specs: { aperture: '100mm', focal: '660mm', mount: 'Manual Alt-Az' },
  },
  {
    id: 'cel-powerseeker',
    dealerId: 'celestron-us',
    name: 'Celestron PowerSeeker 60AZ',
    price: 59,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 590,
    category: 'telescope',
    description: '60mm refractor — affordable entry-level telescope. Great for learning the night sky.',
    image: 'https://www.celestron.com/cdn/shop/files/21041-2.jpg',
    externalUrl: 'https://celestron.com',
    specs: { aperture: '60mm', focal: '700mm', mount: 'Manual Alt-Az' },
  },
  {
    id: 'cel-omni102',
    dealerId: 'celestron-us',
    name: 'Celestron Omni XLT 102AZ',
    price: 349,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 3490,
    category: 'telescope',
    description: '102mm refractor with XLT optical coatings. Excellent contrast for planets and lunar detail.',
    image: 'https://www.celestron.com/cdn/shop/files/21086_1.jpg',
    externalUrl: 'https://celestron.com',
    specs: { aperture: '102mm', focal: '660mm', mount: 'Manual Alt-Az' },
  },
  {
    id: 'cel-eyepiece',
    dealerId: 'celestron-us',
    name: 'Celestron Eyepiece & Filter Kit',
    price: 49,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 490,
    category: 'accessory',
    description: '14-piece set — moon filter, color filters, eyepieces. Essential upgrade for any telescope.',
    image: 'https://www.celestron.com/cdn/shop/files/94303_1.jpg',
    externalUrl: 'https://celestron.com',
  },
  // Bresser (Europe) products
  {
    id: 'bre-junior70',
    dealerId: 'bresser-eu',
    name: 'Bresser Junior Telescope 70/700',
    price: 79,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 790,
    category: 'telescope',
    description: '70mm refractor, 700mm focal length. Compact and lightweight — ideal for beginners.',
    image: 'https://images.bresser.de/images/product/main/1700940_1.jpg',
    externalUrl: 'https://bresser.de',
  },
  {
    id: 'bre-messier80',
    dealerId: 'bresser-eu',
    name: 'Bresser Messier AR-80/400',
    price: 199,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 1990,
    category: 'telescope',
    description: '80mm short-tube refractor, 400mm focal length. Wide-field views of nebulae and star clusters.',
    image: 'https://images.bresser.de/images/product/main/4827604_1.jpg',
    externalUrl: 'https://bresser.de',
    badge: 'Popular',
    specs: { aperture: '80mm', focal: '400mm', mount: 'Manual Alt-Az' },
  },
  {
    id: 'bre-pollux90',
    dealerId: 'bresser-eu',
    name: 'Bresser Pollux 90/1260 EQ3',
    price: 349,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 3490,
    category: 'telescope',
    description: '90mm refractor on equatorial mount. Excellent for tracking planets and lunar observing.',
    image: 'https://images.bresser.de/images/product/main/4662900_1.jpg',
    externalUrl: 'https://bresser.de',
    specs: { aperture: '90mm', focal: '1260mm', mount: 'EQ3' },
  },
  {
    id: 'bre-exos2',
    dealerId: 'bresser-eu',
    name: 'Bresser Exos-2 Mount',
    price: 599,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 5990,
    category: 'mount',
    description: 'Sturdy equatorial mount with motorized dual-axis tracking. Compatible with most OTAs up to 10kg.',
    image: 'https://images.bresser.de/images/product/main/4851040_1.jpg',
    externalUrl: 'https://bresser.de',
    badge: 'Best Seller',
  },
  {
    id: 'bre-binoculars',
    dealerId: 'bresser-eu',
    name: 'Bresser Corvette 8×42 Binoculars',
    price: 149,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 1490,
    category: 'accessory',
    description: 'Waterproof 8×42 binoculars with phase-corrected prisms. Great for stargazing and daytime use.',
    image: 'https://images.bresser.de/images/product/main/1830842_1.jpg',
    externalUrl: 'https://bresser.de',
  },
  {
    id: 'bre-eyepiece',
    dealerId: 'bresser-eu',
    name: 'Bresser Eyepiece Zoom 8-24mm',
    price: 59,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 590,
    category: 'accessory',
    description: 'Variable zoom eyepiece from 8mm to 24mm. One eyepiece replaces four — ideal starter upgrade.',
    image: 'https://images.bresser.de/images/product/main/4920112_1.jpg',
    externalUrl: 'https://bresser.de',
  },
]

// Global fallback: 3 from Astroman + 3 from Celestron (no Bresser for global)
function buildGlobalFallback(): Product[] {
  const globalDealerIds = ['astroman', 'celestron-us']
  return globalDealerIds.flatMap((id) =>
    PRODUCTS.filter((p) => p.dealerId === id)
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
