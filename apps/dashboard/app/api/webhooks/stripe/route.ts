import { stripe } from '@/lib/stripe/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Lazy initialization to avoid build-time errors
// Using any for admin client since we don't have generated database types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseAdmin: SupabaseClient<any, 'public', any> | null = null
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabaseAdmin
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id

        if (userId && session.subscription) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )

          // Update or insert billing_subscriptions
          await supabase
            .from('billing_subscriptions')
            .upsert({
              user_id: userId,
              app_name: 'timekeeper',
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              status: subscription.status === 'trialing' ? 'trialing' : 'active',
              started_at: new Date(subscription.created * 1000).toISOString(),
              trial_end: subscription.trial_end
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
              has_payment_method: true,
            }, {
              onConflict: 'user_id,app_name'
            })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id

        if (userId) {
          const status = subscription.cancel_at_period_end
            ? 'canceled'
            : subscription.status === 'trialing'
            ? 'trialing'
            : subscription.status === 'active'
            ? 'active'
            : subscription.status === 'past_due'
            ? 'past_due'
            : 'none'

          await supabase
            .from('billing_subscriptions')
            .update({
              status,
              trial_end: subscription.trial_end
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
            })
            .eq('user_id', userId)
            .eq('app_name', 'timekeeper')
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id

        if (userId) {
          await supabase
            .from('billing_subscriptions')
            .update({
              status: 'canceled',
              canceled_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('app_name', 'timekeeper')
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const userId = subscription.metadata?.supabase_user_id

          if (userId) {
            await supabase
              .from('billing_subscriptions')
              .update({
                status: 'active',
                has_payment_method: true,
              })
              .eq('user_id', userId)
              .eq('app_name', 'timekeeper')
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const userId = subscription.metadata?.supabase_user_id

          if (userId) {
            await supabase
              .from('billing_subscriptions')
              .update({
                status: 'past_due',
              })
              .eq('user_id', userId)
              .eq('app_name', 'timekeeper')
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
