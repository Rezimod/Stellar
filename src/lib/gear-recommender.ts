import Anthropic from '@anthropic-ai/sdk';
import { PRODUCTS, type Product } from './products';

export interface GearRecommendationInput {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  budgetGEL: number;
  observingInterests: string[]; // e.g., ['moon', 'planets', 'deep-sky', 'urban']
  portability: 'stationary' | 'portable' | 'ultra-portable';
  currentEquipment?: string[];
  starsBalance?: number; // for suggesting redemptions
  locale?: 'en' | 'ka';
}

export interface GearRecommendation {
  productId: string;
  name: string;
  priceGEL: number;
  why: string;
  redeemableStars?: number; // if user can redeem toward it
  url: string;
}

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

function buildRecommenderPrompt(input: GearRecommendationInput): {
  systemPrompt: string;
  userPrompt: string;
} {
  const catalogJson = JSON.stringify(
    PRODUCTS.filter((p) => p.inStock).map((p) => ({
      id: p.id,
      name: input.locale === 'ka' ? p.name.ka : p.name.en,
      description: input.locale === 'ka' ? p.description.ka : p.description.en,
      category: p.category,
      priceGEL: p.priceGEL,
      aiRecommendFor: p.aiRecommendFor || [],
    })),
    null,
    2,
  );

  const systemPrompt = `You are a knowledgeable astronomy equipment advisor for Stellar. You recommend gear based on the user's experience, budget, and observing goals.

IMPORTANT CONSTRAINTS:
1. Only recommend products from the provided catalog — NEVER invent products
2. Recommend 1-3 products maximum
3. Each recommendation must include a specific, brief reason (why this one)
4. Consider budget strictly — don't recommend products that exceed the budget unless necessary
5. Match the user's experience level (beginners need easy-to-use gear)
6. Prioritize portability if the user wants ultra-portable gear
7. Consider what the user wants to observe and match scopes/accessories

The product catalog (in stock only):
${catalogJson}

Language: ${input.locale === 'ka' ? 'Georgian' : 'English'}. Respond concisely.`;

  const userPrompt = `
User Profile:
- Experience: ${input.experienceLevel}
- Budget: ${input.budgetGEL} GEL
- Interests: ${input.observingInterests.join(', ')}
- Portability: ${input.portability}
${input.starsBalance ? `- Stars balance: ${input.starsBalance} (can redeem toward purchase)` : ''}
${input.currentEquipment?.length ? `- Current equipment: ${input.currentEquipment.join(', ')}` : ''}

Recommend 1-3 products from the catalog. For each, respond with:
[PRODUCT_ID]
Name: [Full Name]
Price: [Price in GEL]
Why: [One sentence explaining why this is a good fit for this user]

Be specific — reference the user's interests and needs.`;

  return { systemPrompt, userPrompt };
}

export async function getGearRecommendations(
  input: GearRecommendationInput,
): Promise<GearRecommendation[]> {
  try {
    const { systemPrompt, userPrompt } = buildRecommenderPrompt(input);

    const response = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';

    // Parse the response to extract product IDs and reasons
    const recommendations: GearRecommendation[] = [];
    const lines = text.split('\n');

    let currentProduct: {
      id?: string;
      name?: string;
      priceGEL?: number;
      why?: string;
    } | null = null;

    for (const line of lines) {
      if (line.startsWith('[') && line.endsWith(']')) {
        // Found a product ID
        if (currentProduct && currentProduct.id && currentProduct.name && currentProduct.why) {
          const product = PRODUCTS.find((p) => p.id === currentProduct!.id);
          if (product) {
            const redeemableStars =
              input.starsBalance && input.starsBalance > 0
                ? Math.floor((product.priceGEL * 4.69) / 10) // Rough stars-to-GEL conversion
                : undefined;

            recommendations.push({
              productId: product.id,
              name: currentProduct.name,
              priceGEL: currentProduct.priceGEL || product.priceGEL,
              why: currentProduct.why,
              redeemableStars,
              url: `/marketplace/${product.id}`,
            });
          }
        }

        const productId = line.slice(1, -1);
        currentProduct = { id: productId };
      } else if (line.startsWith('Name:')) {
        if (currentProduct) currentProduct.name = line.replace('Name:', '').trim();
      } else if (line.startsWith('Price:')) {
        if (currentProduct) {
          const priceStr = line.replace('Price:', '').trim().split(' ')[0];
          currentProduct.priceGEL = parseInt(priceStr);
        }
      } else if (line.startsWith('Why:')) {
        if (currentProduct) currentProduct.why = line.replace('Why:', '').trim();
      }
    }

    // Add the last product if we have data for it
    if (currentProduct && currentProduct.id && currentProduct.name && currentProduct.why) {
      const product = PRODUCTS.find((p) => p.id === currentProduct!.id);
      if (product) {
        const redeemableStars =
          input.starsBalance && input.starsBalance > 0
            ? Math.floor((product.priceGEL * 4.69) / 10)
            : undefined;

        recommendations.push({
          productId: product.id,
          name: currentProduct.name,
          priceGEL: currentProduct.priceGEL || product.priceGEL,
          why: currentProduct.why,
          redeemableStars,
          url: `/marketplace/${product.id}`,
        });
      }
    }

    return recommendations.slice(0, 3); // Return at most 3 recommendations
  } catch (err) {
    console.error('[GearRecommender] Failed to generate recommendations:', err);
    return [];
  }
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getProductsByCategory(category: string): Product[] {
  return PRODUCTS.filter((p) => p.category === category && p.inStock);
}
