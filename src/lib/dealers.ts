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
  category: 'telescope' | 'eyepiece' | 'binocular' | 'accessory'
  description: string
  image: string
  externalUrl: string
  badge?: string
  specs?: Record<string, string>
  beginner?: boolean
  skillLevel?: 'beginner' | 'intermediate' | 'advanced'
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
    id: 'levenhuk-eu',
    name: 'Levenhuk',
    tagline: "Telescopes for curious minds",
    flag: '🇪🇺',
    region: 'europe',
    country: 'EU',
    website: 'https://levenhukb2b.com/catalogue/telescopes/',
    description: "European optics brand — telescopes, microscopes and accessories",
    shipsTo: ['DE','AT','CH','FR','IT','NL','BE','PL','ES','PT','SE','NO','DK','FI','CZ','HU','RO','GR','BG','HR','GB','IE','UA','LT','LV','EE'],
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
    beginner: true,
    skillLevel: 'beginner' as const,
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
    beginner: true,
    skillLevel: 'beginner' as const,
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
    skillLevel: 'beginner' as const,
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
    skillLevel: 'beginner' as const,
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
    skillLevel: 'beginner' as const,
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
    skillLevel: 'beginner' as const,
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
    skillLevel: 'intermediate' as const,
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
    skillLevel: 'advanced' as const,
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
    skillLevel: 'advanced' as const,
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
    skillLevel: 'advanced' as const,
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
    skillLevel: 'advanced' as const,
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
    skillLevel: 'intermediate' as const,
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
    skillLevel: 'intermediate' as const,
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
    beginner: true,
    skillLevel: 'beginner' as const,
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
    beginner: true,
    skillLevel: 'beginner' as const,
  },
  // Levenhuk (Europe) products
  {
    id: 'lev-blitz50',
    dealerId: 'levenhuk-eu',
    name: 'Levenhuk Blitz 50 BASE',
    price: 59,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 590,
    category: 'telescope',
    description: '50mm refractor on alt-az mount. Perfect first telescope — simple, lightweight, easy to set up.',
    image: 'https://levenhuk.com/img/large/Levenhuk-Blitz-50-BASE-Telescope_01.jpg',
    externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
    badge: 'Beginner',
    specs: { aperture: '50mm', focal: '600mm', mount: 'Manual Alt-Az' },
    beginner: true,
    skillLevel: 'beginner' as const,
  },
  {
    id: 'lev-labzz-t2',
    dealerId: 'levenhuk-eu',
    name: 'Levenhuk LabZZ T2 Telescope',
    price: 49,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 490,
    category: 'telescope',
    description: '50mm kids telescope with compass, backpack, and book. Best astronomy gift for young astronomers.',
    image: 'https://levenhuk.com/img/large/Levenhuk-LabZZ-T2-Telescope_01.jpg',
    externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
    badge: 'Beginner',
    specs: { aperture: '50mm', focal: '360mm', mount: 'Manual Alt-Az' },
    beginner: true,
    skillLevel: 'beginner' as const,
  },
  {
    id: 'lev-skyline-base70',
    dealerId: 'levenhuk-eu',
    name: 'Levenhuk Skyline BASE 70T',
    price: 89,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 890,
    category: 'telescope',
    description: '70mm tabletop refractor. Compact and sturdy — great for balconies and travel.',
    image: 'https://levenhuk.com/img/large/Levenhuk-Skyline-BASE-70T-Telescope_01.jpg',
    externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
    specs: { aperture: '70mm', focal: '700mm', mount: 'Tabletop Alt-Az' },
    beginner: true,
    skillLevel: 'beginner' as const,
  },
  {
    id: 'lev-travel70',
    dealerId: 'levenhuk-eu',
    name: 'Levenhuk Skyline Travel 70',
    price: 99,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 990,
    category: 'telescope',
    description: '70mm portable refractor with tripod. Folds into a compact bag — ideal for dark-sky trips.',
    image: 'https://levenhuk.com/img/large/Levenhuk-Skyline-Travel-70-Telescope_01.jpg',
    externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
    specs: { aperture: '70mm', focal: '700mm', mount: 'Travel Alt-Az' },
    beginner: true,
    skillLevel: 'beginner' as const,
  },
  {
    id: 'lev-travel80',
    dealerId: 'levenhuk-eu',
    name: 'Levenhuk Skyline Travel 80',
    price: 119,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 1190,
    category: 'telescope',
    description: '80mm portable refractor. Wider aperture than the Travel 70 — better for star clusters.',
    image: 'https://levenhuk.com/img/large/Levenhuk-Skyline-Travel-80-Telescope_01.jpg',
    externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
    specs: { aperture: '80mm', focal: '400mm', mount: 'Travel Alt-Az' },
    skillLevel: 'intermediate' as const,
  },
  {
    id: 'lev-base110',
    dealerId: 'levenhuk-eu',
    name: 'Levenhuk Skyline BASE 110S',
    price: 149,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 1490,
    category: 'telescope',
    description: '110mm reflector on simple mount. Step up from beginner scope — great light gathering.',
    image: 'https://levenhuk.com/img/large/Levenhuk-Skyline-BASE-110S-Telescope_01.jpg',
    externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
    specs: { aperture: '110mm', focal: '500mm', mount: 'Manual Alt-Az' },
    skillLevel: 'intermediate' as const,
  },
  {
    id: 'lev-blitz114',
    dealerId: 'levenhuk-eu',
    name: 'Levenhuk Blitz 114 PLUS',
    price: 179,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 1790,
    category: 'telescope',
    description: '114mm Newtonian reflector. Excellent for planets, Moon, and bright nebulae. Good upgrade scope.',
    image: 'https://levenhuk.com/img/large/Levenhuk-Blitz-114-PLUS-Telescope_01.jpg',
    externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
    badge: 'Popular',
    specs: { aperture: '114mm', focal: '900mm', mount: 'Manual Alt-Az' },
    skillLevel: 'intermediate' as const,
  },
  {
    id: 'lev-spark114',
    dealerId: 'levenhuk-eu',
    name: 'Levenhuk Discovery Spark 114 EQ',
    price: 199,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 1990,
    category: 'telescope',
    description: '114mm reflector on equatorial mount with Discovery book. EQ mount enables serious tracking.',
    image: 'https://levenhuk.com/img/large/Levenhuk-Discovery-Spark-114-EQ-Telescope_01.jpg',
    externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
    badge: 'Best Seller',
    specs: { aperture: '114mm', focal: '900mm', mount: 'EQ' },
    skillLevel: 'advanced' as const,
  },
  {
    id: 'lev-plus120',
    dealerId: 'levenhuk-eu',
    name: 'Levenhuk Skyline PLUS 120S',
    price: 249,
    currency: 'EUR',
    currencySymbol: '€',
    starsPrice: 2490,
    category: 'telescope',
    description: '120mm short-tube reflector. Excellent aperture for deep-sky objects — galaxies and nebulae.',
    image: 'https://levenhuk.com/img/large/Levenhuk-Skyline-PLUS-120S-Telescope_01.jpg',
    externalUrl: 'https://levenhukb2b.com/catalogue/telescopes/',
    specs: { aperture: '120mm', focal: '600mm', mount: 'Manual Alt-Az' },
    skillLevel: 'advanced' as const,
  },

  // Astroman eyepieces & binoculars
  {
    id: 'astr-eyepiece-set',
    dealerId: 'astroman',
    name: 'Eyepiece Set (6mm + 20mm)',
    price: 119,
    currency: 'GEL',
    currencySymbol: '₾',
    starsPrice: 1190,
    category: 'eyepiece',
    description: '1.25" eyepiece pair — 6mm for high magnification planets, 20mm for wide-field star clusters.',
    image: 'https://astroman.ge/wp-content/uploads/2022/09/%E1%83%90%E1%83%93%E1%83%90%E1%83%9E%E1%83%A2%E1%83%94%E1%83%A0%E1%83%98.jpg',
    externalUrl: 'https://astroman.ge/aksesuar/',
    specs: { barrel: '1.25"', qty: '2 eyepieces' },
  },
  {
    id: 'astr-bino-8x42',
    dealerId: 'astroman',
    name: 'Celestron UpClose G2 10x50',
    price: 349,
    currency: 'GEL',
    currencySymbol: '₾',
    starsPrice: 3490,
    category: 'binocular',
    description: '10x50 binoculars — excellent for Milky Way sweeps, open clusters, comets, and birdwatching.',
    image: 'https://astroman.ge/wp-content/uploads/2024/11/23312.jpg',
    externalUrl: 'https://astroman.ge/aksesuar/',
    specs: { magnification: '10x', aperture: '50mm' },
  },
  // Celestron US eyepieces & binoculars
  {
    id: 'cel-xcel-7mm',
    dealerId: 'celestron-us',
    name: 'X-Cel LX 7mm Eyepiece',
    price: 59.95,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 599,
    category: 'eyepiece',
    description: '7mm X-Cel LX — 60° AFOV, fully multi-coated, parfocal. Ideal for planetary detail on Jupiter and Saturn.',
    image: '',
    externalUrl: 'https://www.celestron.com/collections/eyepieces-and-filters',
    specs: { focal: '7mm', afov: '60°', barrel: '1.25"' },
  },
  {
    id: 'cel-xcel-18mm',
    dealerId: 'celestron-us',
    name: 'X-Cel LX 18mm Eyepiece',
    price: 59.95,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 599,
    category: 'eyepiece',
    description: '18mm X-Cel LX — wide-field views of star clusters and nebulae. Perfect companion to the 7mm.',
    image: '',
    externalUrl: 'https://www.celestron.com/collections/eyepieces-and-filters',
    specs: { focal: '18mm', afov: '60°', barrel: '1.25"' },
  },
  {
    id: 'cel-upclose-10x50',
    dealerId: 'celestron-us',
    name: 'Celestron UpClose G2 10x50',
    price: 59.95,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 599,
    category: 'binocular',
    description: '10x50 binoculars with BK-7 prisms and multi-coated optics. Great for Milky Way, comets, and open clusters.',
    image: 'https://www.celestron.com/cdn/shop/products/050234252038_UpCloseG2_10x50_71256_01.jpg?v=1584999282',
    externalUrl: 'https://www.celestron.com/collections/binoculars',
    specs: { magnification: '10x', aperture: '50mm', prism: 'BK-7 Porro' },
  },
  {
    id: 'cel-skymaster-25x70',
    dealerId: 'celestron-us',
    name: 'Celestron SkyMaster 25x70',
    price: 109.95,
    currency: 'USD',
    currencySymbol: '$',
    starsPrice: 1099,
    category: 'binocular',
    description: '25x70 giant binoculars — best for deep sky. Resolve star clusters, see Andromeda, and sweep the Milky Way.',
    image: '',
    externalUrl: 'https://www.celestron.com/collections/binoculars',
    badge: 'Best Seller',
    specs: { magnification: '25x', aperture: '70mm', prism: 'BaK-4 Porro' },
  },
]

// Global fallback: 2 telescopes each from Astroman, Celestron, and Levenhuk
function buildGlobalFallback(): Product[] {
  const ids = ['astroman', 'celestron-us', 'levenhuk-eu']
  return ids.flatMap((id) =>
    PRODUCTS.filter((p) => p.dealerId === id && p.category === 'telescope')
      .sort((a, b) => a.price - b.price)
      .slice(0, 2)
  )
}

export const GLOBAL_FALLBACK = buildGlobalFallback()

export function getDealersByRegion(region: Region): Dealer[] {
  if (region === 'global') return DEALERS
  if (region === 'asia') return DEALERS.filter((d) => d.id === 'astroman')
  if (region === 'south_america') return DEALERS.filter((d) => d.id === 'celestron-us')
  return DEALERS.filter((d) => d.region === region)
}

export function getProductsByRegion(region: Region): Product[] {
  if (region === 'global') return GLOBAL_FALLBACK
  if (region === 'asia') return PRODUCTS.filter((p) => p.dealerId === 'astroman')
  if (region === 'south_america') return PRODUCTS.filter((p) => p.dealerId === 'celestron-us')
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
