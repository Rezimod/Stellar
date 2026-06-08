import { NextResponse } from 'next/server';
import { fetchSolPriceRates } from '@/lib/sol-price';

export const revalidate = 60;

export async function GET() {
  const rates = await fetchSolPriceRates();
  return NextResponse.json(rates);
}
