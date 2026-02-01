import Stripe from 'stripe'

// Lazy initialization to avoid build-time errors
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  }
  return stripeInstance
}

// Legacy export for backward compatibility
export const stripe = {
  get webhooks() {
    return getStripe().webhooks
  },
  get subscriptions() {
    return getStripe().subscriptions
  },
  get checkout() {
    return getStripe().checkout
  },
  get billingPortal() {
    return getStripe().billingPortal
  },
  get customers() {
    return getStripe().customers
  },
}

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!
export const TRIAL_PERIOD_DAYS = parseInt(process.env.TRIAL_PERIOD_DAYS || '180', 10)
