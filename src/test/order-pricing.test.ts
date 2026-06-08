import { describe, it, expect } from 'vitest';
import { validateOrderPricing } from '@/lib/order-pricing';

describe('validateOrderPricing', () => {
  const rates = { solPerGEL: 0.00135, solPriceUsd: 137 };

  it('accepts a valid Stars order', () => {
    const result = validateOrderPricing({
      productId: 'scope-bresser-76-300',
      dealerId: 'astroman',
      paymentMethod: 'stars',
      amountFiat: 288,
      currency: 'GEL',
      amountStars: 1350,
      ...rates,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects a tampered fiat price', () => {
    const result = validateOrderPricing({
      productId: 'scope-bresser-76-300',
      dealerId: 'astroman',
      paymentMethod: 'stars',
      amountFiat: 1,
      currency: 'GEL',
      amountStars: 1350,
      ...rates,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('catalog');
  });

  it('rejects unknown products', () => {
    const result = validateOrderPricing({
      productId: 'not-real',
      dealerId: 'astroman',
      paymentMethod: 'stars',
      amountFiat: 100,
      currency: 'GEL',
      amountStars: 100,
      ...rates,
    });
    expect(result.ok).toBe(false);
  });
});
