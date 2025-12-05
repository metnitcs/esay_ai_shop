import { ProductInfo, CharacterInfo } from '../types';
import { PRODUCT_TYPES } from '../constants';

/**
 * Get product-specific action for prompts
 */
export const getProductAction = (productType?: string): string => {
    const type = PRODUCT_TYPES.find(t => t.id === productType);
    return type?.action || 'naturally showcasing and holding';
};

/**
 * Build CONCISE image generation prompt (token-optimized)
 */
export const buildImagePrompt = (
    product: ProductInfo,
    character: CharacterInfo
): string => {
    const action = getProductAction(product.productType);

    let prompt = `UGC TikTok product photo: ${character.gender} Thai creator, ${character.ethnicity}, ${character.skinTone} skin, ${character.bodyType} build, age 25-30, genuine smile, eye contact. 

Action: ${action} ${product.name}, product at chest level. 

Setting: Modern Thai home, daylight, minimal decor, plants. Lighting: soft window light, golden hour. Camera: iPhone 15 Pro, 9:16, bokeh. Mood: friendly, trustworthy. Quality: photorealistic, natural colors.`;

    if (character.caption.enabled && character.caption.text) {
        prompt += `\n\nText: "${character.caption.text}" ${character.caption.style} style, ${character.caption.position}.`;
    }

    return prompt;
};

/**
 * Build CONCISE video generation prompt (token-optimized)
 */
export const buildVideoPrompt = (
    product: ProductInfo,
    character: CharacterInfo,
    clipNumber: number,
    totalClips: number,
    script?: string
): string => {
    const action = getProductAction(product.productType);

    // Clip focus
    let focus = '';
    if (clipNumber === 1) {
        focus = '0-2s: excited face reveal, 2-5s: pick up product, 5-8s: smile transition';
    } else if (clipNumber === totalClips) {
        focus = '0-3s: show results, 3-6s: product to camera, 6-8s: thumbs up CTA';
    } else {
        focus = `0-3s: ${action}, 3-6s: feature demo, 6-8s: satisfied expression`;
    }

    let prompt = `UGC TikTok video: ${character.gender} Thai creator, ${character.ethnicity}, ${character.skinTone} skin, age 25-30. Modern Thai home, daylight, 9:16.

Sequence: ${focus}

Performance: natural energy, 70% eye contact, smooth hands. Camera: gentle push-in, handheld stable. Lighting: golden hour warmth. Pacing: TikTok-style quick cuts. Quality: 4K photorealistic.

Thai market: Gen Z style, authentic vibe, relatable to 18-35.`;

    if (script) {
        prompt += `\n\nScript Context (Thai language): "${script.substring(0, 200)}"
The creator should appear to be speaking this Thai script naturally. Lip movements and expressions should match the tone and energy of the script.`;
    }

    return prompt;
};
