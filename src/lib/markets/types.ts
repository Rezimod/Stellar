export type Category =
  | 'sky'
  | 'solar'
  | 'meteor'
  | 'comet'
  | 'mission'
  | 'discovery'
  | 'crypto'
  | 'sports'
  | 'tech'
  | 'weather'
  | 'nature';

export interface Market {
  id: string;
  category: Category;
  title: string;
  blurb: string;
  resolvesAt: string;
  yes: number;
  /** 7-day change in YES probability, ±0..1. */
  trend: number;
  volume: number;
  image: string;
  oracle: string;
}

export interface NewsItem {
  id: string;
  source: string;
  headline: string;
  marketId?: string;
  hoursAgo: number;
}

export interface Bet {
  marketId: string;
  side: 'yes' | 'no';
  stake: number;
  ts: number;
}

export interface LiveBet {
  id: string;
  user: string;
  market: Market;
  side: 'yes' | 'no';
  stake: number;
}
