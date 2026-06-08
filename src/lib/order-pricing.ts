import { getProductById, priceToSol, type Product } from '@/lib/dealers';
import { validateBurn } from '@/lib/stars-economy';

const SOL_TOLERANCE = 0.05;

export type OrderPricingInput = {
  productId: string;
  dealerId: string;
  paymentMethod: 'sol' | 'stars';
  amountFiat: number;
  currency: string;
  amountSol?: number;
  amountStars?: number;
  burnStars?: number;
  starsBalance?: number;
  solPerGEL: number;
  solPriceUsd: number;
};

export type OrderPricingResult =
  | {
      ok: true;
      product: Product;
      listFiat: number;
      chargedFiat: number;
      chargedSol: number;
      gelDiscount: number;
      burnStars: number;
    }
  | { ok: false; error: string };

export function validateOrderPricing(input: OrderPricingInput): OrderPricingResult {
  const product = getProductById(input.productId);
  if (!product) {
    return { ok: false, error: 'Unknown product' };
  }
  if (product.dealerId !== input.dealerId) {
    return { ok: false, error: 'Product dealer mismatch' };
  }
  if (product.price !== input.amountFiat) {
    return { ok: false, error: 'Price does not match catalog' };
  }
  if (product.currency !== input.currency) {
    return { ok: false, error: 'Currency does not match catalog' };
  }

  const method = input.paymentMethod;
  if (product.kind === 'stars-only' && method !== 'stars') {
    return { ok: false, error: 'This product is only available for Stars payment' };
  }

  let burnStars = 0;
  let gelDiscount = 0;
  let chargedFiat = product.price;
  let chargedSol = 0;

  if (typeof input.burnStars === 'number' && input.burnStars > 0) {
    if (method !== 'sol') {
      return { ok: false, error: 'Stars burn discount is only available for SOL-paid orders' };
    }
    if (product.currency !== 'GEL') {
      return { ok: false, error: 'Stars burn discount is only available for GEL-priced products' };
    }
    const balance = typeof input.starsBalance === 'number' ? input.starsBalance : 0;
    const v = validateBurn({ priceGEL: product.price, stars: input.burnStars, balance });
    if (!v.ok) {
      return { ok: false, error: v.reason };
    }
    burnStars = input.burnStars;
    gelDiscount = v.gelDiscount;
    chargedFiat = Math.max(0, product.price - gelDiscount);
  }

  if (method === 'stars') {
    if (input.amountStars !== product.starsPrice) {
      return { ok: false, error: 'Stars price does not match catalog' };
    }
    return {
      ok: true,
      product,
      listFiat: product.price,
      chargedFiat: product.price,
      chargedSol: 0,
      gelDiscount: 0,
      burnStars: 0,
    };
  }

  if (typeof input.amountSol !== 'number' || input.amountSol <= 0) {
    return { ok: false, error: 'amountSol must be a positive number' };
  }

  chargedSol = priceToSol(chargedFiat, product.currency, input.solPerGEL, input.solPriceUsd);
  if (chargedSol <= 0) {
    return { ok: false, error: 'Could not compute SOL price' };
  }

  const delta = Math.abs(input.amountSol - chargedSol) / chargedSol;
  if (delta > SOL_TOLERANCE) {
    return { ok: false, error: 'SOL amount is out of date — refresh and try again' };
  }

  return {
    ok: true,
    product,
    listFiat: product.price,
    chargedFiat,
    chargedSol: input.amountSol,
    gelDiscount,
    burnStars,
  };
}
