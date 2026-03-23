import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia' as any,
});

// Credit packages
export const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: '体验包',
    credits: 50,
    price: 2900, // in cents (¥29)
    currency: 'cny',
    description: '适合初次体验',
    popular: false,
  },
  {
    id: 'standard',
    name: '标准包',
    credits: 200,
    price: 9900,
    currency: 'cny',
    description: '最受欢迎',
    popular: true,
  },
  {
    id: 'pro',
    name: '专业包',
    credits: 800,
    price: 29900,
    currency: 'cny',
    description: '专业用户首选',
    popular: false,
  },
] as const;

// Credit costs per operation
export const CREDIT_COSTS = {
  ANALYZE: 5,       // Product analysis + script generation
  IMAGE_GEN: 2,     // Generate one image (start/end frame)
  AUDIO_GEN: 1,     // Generate TTS audio
} as const;
