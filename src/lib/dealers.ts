import type { Region } from '@/lib/location'

export interface Dealer {
  id: string
  name: string
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
  category: 'telescope' | 'accessory' | 'gadget' | 'digital'
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
    region: 'caucasus',
    country: 'GE',
    website: 'https://astroman.ge',
    description: "Georgia's first astronomy store — telescopes, gadgets & star maps",
    shipsTo: ['GE', 'AM', 'AZ', 'TR'],
    currency: 'GEL',
    currencySymbol: '₾',
  },
  {
    id: 'highpoint-us',
    name: 'High Point Scientific',
    region: 'north_america',
    country: 'US',
    website: 'https://www.highpointscientific.com',
    description: 'Trusted US telescope retailer — expert advice + fast shipping',
    shipsTo: ['US', 'CA'],
    currency: 'USD',
    currencySymbol: '$',
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
  // High Point Scientific products
  {
    id: 'hp-celestron-nexstar-8se',
    dealerId: 'highpoint-us',
    name: 'Celestron NexStar 8SE',
    price: 1399,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 14000,
    category: 'telescope',
    description: '8-inch Schmidt-Cassegrain with fully automated GoTo mount. The most popular telescope in America.',
    image: '/products/celestron-8se.jpg',
    externalUrl: 'https://www.highpointscientific.com/celestron-nexstar-8se-computerized-telescope-11069',
    badge: 'Best Seller',
    specs: { aperture: '203mm', focal: '2032mm', mount: 'GoTo Alt-Az' },
  },
  {
    id: 'hp-celestron-starsense-dx102',
    dealerId: 'highpoint-us',
    name: 'Celestron StarSense Explorer DX 102AZ',
    price: 399,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 4000,
    category: 'telescope',
    description: 'Phone-guided refractor — app tells you exactly where to point. Perfect first telescope.',
    image: '/products/celestron-starsense.jpg',
    externalUrl: 'https://www.highpointscientific.com/celestron-starsense-explorer-dx-102az',
    badge: 'Popular',
    specs: { aperture: '102mm', focal: '660mm', mount: 'Manual Alt-Az' },
  },
  {
    id: 'hp-skywatcher-classic-200p',
    dealerId: 'highpoint-us',
    name: 'Sky-Watcher Classic 200P',
    price: 499,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 5000,
    category: 'telescope',
    description: '8-inch Dobsonian — best bang for buck in deep sky. See galaxies and nebulae from your backyard.',
    image: '/products/skywatcher-200p.jpg',
    externalUrl: 'https://www.highpointscientific.com/sky-watcher-classic-200p-8-dobsonian',
    specs: { aperture: '200mm', focal: '1200mm', mount: 'Dobsonian' },
  },
  {
    id: 'hp-zwo-asi533mc',
    dealerId: 'highpoint-us',
    name: 'ZWO ASI533MC Pro Camera',
    price: 599,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 6000,
    category: 'accessory',
    description: 'Cooled astrophotography camera — zero amp glow, square sensor. Plug into any telescope.',
    image: '/products/zwo-asi533.jpg',
    externalUrl: 'https://www.highpointscientific.com/zwo-asi533mc-pro',
    specs: { sensor: 'IMX533', resolution: '3008x3008', cooling: '-35°C' },
  },
  {
    id: 'hp-moon-filter-set',
    dealerId: 'highpoint-us',
    name: 'Celestron Eyepiece & Filter Kit',
    price: 99,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 1000,
    category: 'accessory',
    description: '14-piece set — moon filter, color filters, eyepieces. Essential upgrade for any telescope.',
    image: '/products/celestron-filter-kit.jpg',
    externalUrl: 'https://www.highpointscientific.com/celestron-eyepiece-filter-kit',
    badge: 'New',
  },
]

// Global fallback: 3 cheapest from each dealer
function buildGlobalFallback(): Product[] {
  const byDealer = DEALERS.map((d) =>
    PRODUCTS.filter((p) => p.dealerId === d.id)
      .sort((a, b) => a.price - b.price)
      .slice(0, 3)
  )
  return byDealer.flat()
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
