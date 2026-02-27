import { createClient } from '@onsite/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { buildContext, getSystemPrompt } from '@/lib/assistant/prompts'
import type { ProfileWithSubscription } from '@/lib/supabase/types'

// Lazy initialization to avoid build-time errors
let openai: OpenAI | null = null
function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openai
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch core profile
    const { data: coreProfile, error: profileError } = await supabase
      .from('core_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !coreProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Fetch subscription
    const { data: subscription } = await supabase
      .from('bil_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('app_name', 'timekeeper')
      .single()

    // Fetch device
    const { data: device } = await supabase
      .from('core_devices')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single()

    // Fetch blades balance
    const { data: bladesTransactions } = await supabase
      .from('blades_transactions')
      .select('amount')
      .eq('user_id', user.id)

    const bladesBalance = bladesTransactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0

    // Compose profile
    const profile: ProfileWithSubscription = {
      ...coreProfile,
      subscription_status: subscription?.status ?? 'none',
      trial_ends_at: subscription?.trial_end ?? null,
      has_payment_method: subscription?.has_payment_method ?? false,
      stripe_customer_id: subscription?.stripe_customer_id ?? null,
      voice_calculator_enabled: false,
      sync_enabled: false,
      device_id: device?.device_id ?? null,
      device_model: device?.model ?? null,
      device_platform: device?.platform ?? null,
      device_registered_at: device?.first_seen_at ?? null,
      blades_balance: bladesBalance,
    }

    // Check subscription status - only trialing and active can use
    if (!['trialing', 'active'].includes(profile.subscription_status || '')) {
      return NextResponse.json(
        { error: 'Active subscription required to use the assistant' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { message, currentPage, conversationHistory = [] } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Build context and system prompt
    const context = buildContext(profile, currentPage || '/account')
    const systemPrompt = getSystemPrompt(context)

    // Build messages array for OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10).map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ]

    // Call OpenAI API
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for cost efficiency, can upgrade to gpt-4o
      messages,
      max_tokens: 500,
      temperature: 0.7,
    })

    const assistantMessage = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    return NextResponse.json({
      message: assistantMessage,
      usage: {
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
      },
    })
  } catch (error: any) {
    console.error('Assistant API error:', error)

    // Handle specific OpenAI errors
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429 }
      )
    }

    if (error?.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'Service temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process your request. Please try again.' },
      { status: 500 }
    )
  }
}
