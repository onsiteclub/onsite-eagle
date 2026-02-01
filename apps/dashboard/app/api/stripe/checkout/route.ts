import { createClient } from '@onsite/supabase/server'
import { stripe, STRIPE_PRICE_ID, TRIAL_PERIOD_DAYS } from '@/lib/stripe/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, first_name, last_name')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      })

      customerId = customer.id

      // Save to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: TRIAL_PERIOD_DAYS,
        metadata: {
          supabase_user_id: user.id,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/settings?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/settings?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
      },
    })

    return NextResponse.json({ url: session.url })

  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
