export type ProductCategory = 'telescope' | 'moonlamp' | 'projector' | 'accessory' | 'digital';

export interface Product {
  id: string;
  name: { en: string; ka: string };
  description: { en: string; ka: string };
  category: ProductCategory;
  priceGEL: number;
  image: string;
  inStock: boolean;
  featured: boolean;
  aiRecommendFor?: string[];
}

export const PRODUCTS: Product[] = [
  // Telescopes — real Astroman.ge products
  {
    id: 'scope-bresser-76-300',
    name: { en: 'Bresser Junior 76/300 Compact', ka: 'Bresser Junior 76/300 Compact' },
    description: {
      en: '76mm reflector, 300mm focal length. Compact and lightweight — ideal for beginners and young astronomers.',
      ka: '76 მმ რეფლექტორი, 300 მმ ფოკუსური სიგრძე. კომპაქტური და მსუბუქი — შესანიშნავია დამწყებებისთვის.',
    },
    category: 'telescope',
    priceGEL: 288,
    image: 'https://astroman.ge/wp-content/uploads/2024/11/222.jpg',
    inStock: true,
    featured: false,
    aiRecommendFor: ['moon', 'beginner'],
  },
  {
    id: 'scope-bresser-50-360',
    name: { en: 'Bresser Junior 50/360 with Tent', ka: 'Bresser Junior 50/360 კარავით' },
    description: {
      en: '50mm refractor with pop-up observation tent. Perfect gift set for young astronomers.',
      ka: '50 მმ რეფრაქტორი საბავშვო კარვით. შესანიშნავი საჩუქარი ახალგაზრდა ასტრონომებისთვის.',
    },
    category: 'telescope',
    priceGEL: 399,
    image: 'https://astroman.ge/wp-content/uploads/2022/09/22122.jpg',
    inStock: true,
    featured: false,
    aiRecommendFor: ['moon', 'beginner'],
  },
  {
    id: 'scope-natgeo-60-700',
    name: { en: 'National Geographic 60/700 AZ', ka: 'National Geographic 60/700 AZ' },
    description: {
      en: '60mm refractor, 700mm focal length on alt-az mount. Great for Moon, planets, and terrestrial viewing.',
      ka: '60 მმ რეფრაქტორი, 700 მმ ფოკუსური სიგრძე alt-az სამაგრზე. შესანიშნავია მთვარისა და პლანეტებისთვის.',
    },
    category: 'telescope',
    priceGEL: 779,
    image: 'https://astroman.ge/wp-content/uploads/2025/11/%E1%83%91%E1%83%94%E1%83%A5%E1%83%98-02.jpg',
    inStock: true,
    featured: false,
    aiRecommendFor: ['moon', 'jupiter', 'saturn'],
  },
  {
    id: 'scope-foreseen-80',
    name: { en: 'Foreseen 80mm Refractor', ka: 'Foreseen 80 მმ რეფრაქტორი' },
    description: {
      en: '80mm aperture refractor with sharp optics. Excellent planetary views and wide star fields.',
      ka: '80 მმ ობიექტივის რეფრაქტორი. შესანიშნავი პლანეტური ხედები და ფართო ველები.',
    },
    category: 'telescope',
    priceGEL: 856,
    image: 'https://astroman.ge/wp-content/uploads/2024/08/Telescope.jpg',
    inStock: true,
    featured: true,
    aiRecommendFor: ['moon', 'jupiter', 'saturn', 'mars'],
  },
  {
    id: 'scope-natgeo-76-700',
    name: { en: 'National Geographic 76/700 Reflector', ka: 'National Geographic 76/700 რეფლექტორი' },
    description: {
      en: '76mm Newtonian reflector, 700mm focal length. Excellent light-gathering for deep-sky objects.',
      ka: '76 მმ ნიუტონის რეფლექტორი, 700 მმ ფოკუსური სიგრძე. შესანიშნავია ღრმა ცის ობიექტებისთვის.',
    },
    category: 'telescope',
    priceGEL: 788,
    image: 'https://astroman.ge/wp-content/uploads/2024/08/0144181_national-geographic-114900-reflector-telescope-az_550.jpeg',
    inStock: true,
    featured: false,
    aiRecommendFor: ['nebula', 'moon', 'jupiter'],
  },
  {
    id: 'scope-bresser-venus-76-700',
    name: { en: 'Bresser Venus 76/700 AZ', ka: 'Bresser Venus 76/700 AZ' },
    description: {
      en: '76mm refractor with 700mm focal length on sturdy alt-az mount. Great all-rounder for visual observing.',
      ka: '76 მმ რეფრაქტორი 700 მმ ფოკუსური სიგრძით მყარ alt-az სამაგრზე.',
    },
    category: 'telescope',
    priceGEL: 998,
    image: 'https://astroman.ge/wp-content/uploads/2025/12/2221.jpg',
    inStock: true,
    featured: false,
    aiRecommendFor: ['moon', 'saturn', 'jupiter', 'mars'],
  },
  {
    id: 'scope-celestron-70az',
    name: { en: 'Celestron AstroMaster 70AZ', ka: 'Celestron AstroMaster 70AZ' },
    description: {
      en: "Celestron's popular 70mm refractor on alt-az mount. Crystal-clear views of Moon and planets right out of the box.",
      ka: 'Celestron-ის პოპულარული 70 მმ რეფრაქტორი alt-az სამაგრზე. მკაფიო ხედები ყუთიდანვე.',
    },
    category: 'telescope',
    priceGEL: 1258,
    image: 'https://astroman.ge/wp-content/uploads/2024/11/23312.jpg',
    inStock: true,
    featured: true,
    aiRecommendFor: ['moon', 'jupiter', 'saturn', 'mars', 'beginner'],
  },
  {
    id: 'scope-nexstar-90slt',
    name: { en: 'Celestron NexStar 90SLT', ka: 'Celestron NexStar 90SLT' },
    description: {
      en: '90mm computerized GoTo telescope with 4,000+ object database. Auto-aligns and tracks celestial objects.',
      ka: '90 მმ კომპიუტერიზებული GoTo ტელესკოპი 4,000+ ობიექტის ბაზით. ავტომატური დაჯგუფება და თვალყურის დევნება.',
    },
    category: 'telescope',
    priceGEL: 2660,
    image: 'https://astroman.ge/wp-content/uploads/2024/11/1222.jpg',
    inStock: true,
    featured: false,
    aiRecommendFor: ['jupiter', 'saturn', 'mars', 'nebula', 'advanced'],
  },
  {
    id: 'scope-starsense-dx6',
    name: { en: 'Celestron StarSense Explorer DX 6', ka: 'Celestron StarSense Explorer DX 6' },
    description: {
      en: '150mm Newtonian with smartphone star-finding technology. Point your phone at the sky to locate objects.',
      ka: '150 მმ ნიუტონი სმარტფონის ვარსკვლავ-პოვნის ტექნოლოგიით. მიმართე ტელეფონი ცაზე ობიექტების საპოვნელად.',
    },
    category: 'telescope',
    priceGEL: 3998,
    image: 'https://astroman.ge/wp-content/uploads/2025/09/%E1%83%91%E1%83%94%E1%83%A5%E1%83%98-02.jpg',
    inStock: true,
    featured: false,
    aiRecommendFor: ['nebula', 'galaxies', 'jupiter', 'saturn', 'advanced'],
  },
  // Moon Lamps
  {
    id: 'lamp-16cm',
    name: { en: 'Moon Lamp 16cm', ka: 'მთვარის ლამპა 16 სმ' },
    description: {
      en: '16cm 3D-printed lunar surface lamp with warm/cool LED modes. Perfect astronomy gift.',
      ka: '16 სმ 3D-ნაბეჭდი მთვარის ზედაპირის ლამპა თბილი/ცივი LED რეჟიმებით.',
    },
    category: 'moonlamp',
    priceGEL: 79,
    image: 'https://astroman.ge/wp-content/uploads/2022/09/-%E1%83%A1%E1%83%90%E1%83%9C%E1%83%90%E1%83%97%E1%83%98-3D--jpg.webp',
    inStock: true,
    featured: false,
  },
  {
    id: 'lamp-24cm',
    name: { en: 'Moon Lamp 24cm', ka: 'მთვარის ლამპა 24 სმ' },
    description: {
      en: '24cm large lunar lamp with remote control, 16 color modes, and wooden stand.',
      ka: '24 სმ დიდი მთვარის ლამპა პულტით, 16 ფერის რეჟიმითა და ხის სადგამით.',
    },
    category: 'moonlamp',
    priceGEL: 149,
    image: 'https://astroman.ge/wp-content/uploads/2022/09/%E1%83%91%E1%83%94%E1%83%A5%E1%83%98-01-copy-800x800.jpg',
    inStock: true,
    featured: false,
  },
  // Accessories
  {
    id: 'acc-phone',
    name: { en: 'Smartphone Telescope Adapter', ka: 'სმარტფონის ტელესკოპის ადაპტერი' },
    description: {
      en: 'Universal phone clip adapter for afocal astrophotography through any eyepiece.',
      ka: 'უნივერსალური ტელეფონის სამჭიდი ადაპტერი ნებისმიერ ოკულარზე ასტროფოტოგრაფიისთვის.',
    },
    category: 'accessory',
    priceGEL: 59,
    image: 'https://astroman.ge/wp-content/uploads/2022/09/%E1%83%90%E1%83%93%E1%83%90%E1%83%9E%E1%83%A2%E1%83%94%E1%83%A0%E1%83%98.jpg',
    inStock: true,
    featured: false,
    aiRecommendFor: ['astrophotography', 'moon'],
  },
  {
    id: 'acc-eyepiece',
    name: { en: 'Premium 8mm Eyepiece', ka: 'პრემიუმ 8 მმ ოკულარი' },
    description: {
      en: '8mm wide-field eyepiece (66° AFOV). Excellent for planetary detail and tight clusters.',
      ka: '8 მმ ფართო ველის ოკულარი (66° AFOV). შესანიშნავია პლანეტების დეტალებისა და ვარსკვლავთა გროვებისთვის.',
    },
    category: 'accessory',
    priceGEL: 179,
    image: 'https://astroman.ge/wp-content/uploads/2022/09/%E1%83%90%E1%83%93%E1%83%90%E1%83%9E%E1%83%A2%E1%83%94%E1%83%A0%E1%83%98.jpg',
    inStock: true,
    featured: false,
    aiRecommendFor: ['jupiter', 'saturn', 'moon', 'mars'],
  },
  // Digital
  {
    id: 'dig-starmap',
    name: { en: 'Custom Star Map', ka: 'პერსონალური ვარსკვლავთა რუკა' },
    description: {
      en: 'High-resolution star map for any date, time, and location. Print-ready PDF delivered instantly.',
      ka: 'მაღალი გარჩევადობის ვარსკვლავთა რუკა ნებისმიერი თარიღისა და ადგილისთვის. PDF დაუყოვნებლივ.',
    },
    category: 'digital',
    priceGEL: 29,
    image: '',
    inStock: true,
    featured: true,
    aiRecommendFor: ['gift', 'birthday', 'anniversary'],
  },
  {
    id: 'dig-guide',
    name: { en: 'Georgian Night Sky Guide PDF', ka: 'ქართული ღამის ცის სახელმძღვანელო PDF' },
    description: {
      en: "Complete observer's guide to the Georgian night sky: seasonal charts, object list, observing tips.",
      ka: 'სრული დამკვირვებლის სახელმძღვანელო: სეზონური რუკები, ობიექტების სია, დაკვირვების რჩევები.',
    },
    category: 'digital',
    priceGEL: 24,
    image: '',
    inStock: true,
    featured: false,
  },
  {
    id: 'dig-ai',
    name: { en: 'ASTRA Premium (1 month)', ka: 'ASTRA Premium (1 თვე)' },
    description: {
      en: "Unlock ASTRA's full capabilities: personalized observation plans, equipment advice, sky alerts.",
      ka: 'განბლოკე ASTRA-ს სრული შესაძლებლობები: პერსონალური გეგმები, ცის განგაში.',
    },
    category: 'digital',
    priceGEL: 49,
    image: '',
    inStock: true,
    featured: false,
  },
];

export function getProducts(category?: ProductCategory): Product[] {
  if (!category) return PRODUCTS;
  return PRODUCTS.filter(p => p.category === category);
}

// Dealer-based exports (G2) — import types directly from '@/lib/dealers'
export {
  getDealersByRegion,
  getProductsByRegion,
  getDealerById,
  getProductsByDealer,
  getAllDealers,
} from './dealers'
export type { Dealer } from './dealers'
