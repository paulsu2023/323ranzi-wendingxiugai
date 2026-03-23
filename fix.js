const fs = require('fs');

const added = 
// Credit packages
export const CREDIT_PACKAGES = [
  { id: 'starter', name: '体验包', credits: 50, price: 2900, currency: 'cny', description: '适合初次体验', popular: false },
  { id: 'standard', name: '标准包', credits: 200, price: 9900, currency: 'cny', description: '最受欢迎', popular: true },
  { id: 'pro', name: '专业包', credits: 800, price: 29900, currency: 'cny', description: '专业用户首选', popular: false }
] as const;

export const CREDIT_COSTS = { ANALYZE: 5, IMAGE_GEN: 2, AUDIO_GEN: 1 } as const;
;

fs.appendFileSync('src/constants.ts', added, 'utf8');

function replaceInFile(file, oldStr, newStr) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(file, content, 'utf8');
}

replaceInFile('src/app/billing/BillingClient.tsx', "import { CREDIT_PACKAGES } from '@/lib/stripe';", "import { CREDIT_PACKAGES } from '@/constants';");
replaceInFile('src/app/api/stripe/webhook/route.ts', "import { stripe, CREDIT_PACKAGES } from '@/lib/stripe';", "import { stripe } from '@/lib/stripe';\nimport { CREDIT_PACKAGES } from '@/constants';");
replaceInFile('src/app/api/stripe/checkout/route.ts', "import { stripe, CREDIT_PACKAGES } from '@/lib/stripe';", "import { stripe } from '@/lib/stripe';\nimport { CREDIT_PACKAGES } from '@/constants';");
replaceInFile('src/app/api/generate/route.ts', "import { CREDIT_COSTS } from '@/lib/stripe';", "import { CREDIT_COSTS } from '@/constants';");
replaceInFile('src/app/api/analyze/route.ts', "import { CREDIT_COSTS } from '@/lib/stripe';", "import { CREDIT_COSTS } from '@/constants';");

const stripeFinal = import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_123', {
  apiVersion: '2025-02-24.acacia' as any,
});
;
fs.writeFileSync('src/lib/stripe.ts', stripeFinal, 'utf8');
