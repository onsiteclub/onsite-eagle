import type { ProfileWithSubscription } from '@/lib/supabase/types'

export interface AssistantContext {
  currentPage: string
  user: {
    name: string
    email: string
    subscriptionStatus: string
    trialDaysRemaining: number | null
    hasPaymentMethod: boolean
    deviceLinked: boolean
    level: string
    bladesBalance: number
    trade: string | null
  }
  features: {
    voiceCalculatorEnabled: boolean
    syncEnabled: boolean
  }
}

export function buildContext(profile: ProfileWithSubscription, currentPage: string): AssistantContext {
  const trialDaysRemaining = profile.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  return {
    currentPage,
    user: {
      name: profile.first_name || profile.full_name || 'User',
      email: profile.email,
      subscriptionStatus: profile.subscription_status || 'none',
      trialDaysRemaining,
      hasPaymentMethod: profile.has_payment_method || false,
      deviceLinked: !!profile.device_id,
      level: profile.level || 'rookie',
      bladesBalance: profile.blades_balance || 0,
      trade: profile.trade,
    },
    features: {
      voiceCalculatorEnabled: profile.voice_calculator_enabled || false,
      syncEnabled: profile.sync_enabled || false,
    },
  }
}

export function getSystemPrompt(context: AssistantContext): string {
  const pageContext = getPageSpecificContext(context.currentPage)

  return `You are the OnSite Club assistant, helping construction workers in Canada use the app effectively.

USER CONTEXT:
- Name: ${context.user.name}
- Trade: ${context.user.trade || 'Not specified'}
- Current page: ${context.currentPage}
- Subscription: ${context.user.subscriptionStatus}
${context.user.trialDaysRemaining !== null ? `- Trial days remaining: ${context.user.trialDaysRemaining}` : ''}
- Has payment method: ${context.user.hasPaymentMethod ? 'Yes' : 'No'}
- Mobile device linked: ${context.user.deviceLinked ? 'Yes' : 'No'}
- Blades balance: ${context.user.bladesBalance}
- Level: ${context.user.level}

FEATURES STATUS:
- Voice Calculator: ${context.features.voiceCalculatorEnabled ? 'Enabled' : 'Disabled (requires payment method)'}
- Sync: ${context.features.syncEnabled ? 'Enabled' : 'Disabled'}

APP FEATURES:
1. **Timekeeper** - Automatic time tracking with geofencing. The mobile app detects when you arrive/leave job sites and logs your hours automatically. You can view, edit, and export reports from the dashboard.
2. **Calculator** - Construction calculator with voice input. Basic mode is free. Voice mode requires a payment method on file.
3. **Shop** - E-commerce store for construction gear and tools. Integrated with Shopify.
4. **Blades** - Loyalty rewards program. Earn Blades by using the app, redeem for discounts. Levels: rookie → apprentice → journeyman → master → legend.
5. **Profile** - Manage your personal information, avatar, and trade.
6. **Settings** - Manage subscription, billing, linked devices, and account settings.

NAVIGATION:
- /account - Dashboard home (all app cards)
- /account/timekeeper - Time tracking reports
- /account/calculator - Calculator app
- /account/shop - Shop access
- /account/blades - Rewards dashboard
- /account/profile - Edit profile
- /account/settings - Subscription & settings

${pageContext}

RULES:
- Be direct and practical - construction workers are busy people
- Always respond in English (Canadian users)
- Keep responses concise but helpful
- If you don't know something, say so honestly
- Never invent features that don't exist
- Guide users step by step when explaining how to do something
- If the user seems frustrated, be empathetic and offer clear solutions
- For billing questions, always mention they can manage their subscription in Settings

TONE:
- Friendly but professional
- Use simple language, avoid jargon
- Be encouraging about using the app features`
}

function getPageSpecificContext(page: string): string {
  const contexts: Record<string, string> = {
    '/account': `
CURRENT PAGE CONTEXT (Dashboard Home):
The user is on the main dashboard. They can see cards for all available apps.
- Help them discover features they might not have tried
- If they're new, offer a quick overview of what each app does
- Check if their profile is complete`,

    '/account/timekeeper': `
CURRENT PAGE CONTEXT (Timekeeper):
The user is viewing their time tracking dashboard.
- They can filter by date range (presets or custom dates)
- They can see total hours, days worked, sessions, and locations
- They can edit individual time entries by clicking on them
- They can export reports as Excel or PDF
- Edited entries show an amber indicator
- The chart shows hours worked per day`,

    '/account/calculator': `
CURRENT PAGE CONTEXT (Calculator):
The user is on the calculator page.
- Basic calculator is always available
- Voice input requires a payment method on file
- Supports fractions (e.g., 5 1/2 + 3 1/4)
- If voice is locked, encourage adding a payment method in Settings`,

    '/account/shop': `
CURRENT PAGE CONTEXT (Shop):
The user is viewing the shop access page.
- The shop opens in a new tab (Shopify)
- They can see their Blades balance here
- Blades can be redeemed for discounts`,

    '/account/blades': `
CURRENT PAGE CONTEXT (Blades Rewards):
The user is viewing their rewards dashboard.
- Shows current balance and lifetime earned
- Shows current level and progress to next level
- Lists ways to earn Blades
- Shows transaction history`,

    '/account/profile': `
CURRENT PAGE CONTEXT (Profile):
The user is editing their profile.
- They can update name, phone, company, role, and bio
- They can upload a profile picture
- Email cannot be changed here
- Encourage completing all fields`,

    '/account/settings': `
CURRENT PAGE CONTEXT (Settings):
The user is in account settings.
- Subscription section: view status, manage billing, add payment method, cancel
- Device section: see linked mobile device, unlink if needed
- Account section: email (read-only), change password, delete account
- Legal links at the bottom`,

    '/account/courses': `
CURRENT PAGE CONTEXT (Courses):
This feature is coming soon. The user is seeing a placeholder page.
- Acknowledge it's not available yet
- Explain it will have professional development training
- Suggest other features they can use now`,

    '/account/checklist': `
CURRENT PAGE CONTEXT (Checklist):
This feature is coming soon. The user is seeing a placeholder page.
- Acknowledge it's not available yet
- Explain it will have safety and inspection checklists
- Suggest other features they can use now`,
  }

  return contexts[page] || `
CURRENT PAGE CONTEXT:
The user is on ${page}. Provide general assistance about the OnSite Club app.`
}

export const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  '/account': [
    'What can I do with OnSite Club?',
    'How do I track my work hours?',
    'What are Blades?',
  ],
  '/account/timekeeper': [
    'How do I edit a time entry?',
    'How do I export my timesheet?',
    'Why are some entries highlighted?',
  ],
  '/account/calculator': [
    'How do I unlock voice input?',
    'Can I use fractions?',
    'How does the calculator work?',
  ],
  '/account/settings': [
    'How do I cancel my subscription?',
    'How do I add a payment method?',
    'How do I unlink my device?',
  ],
  '/account/blades': [
    'How do I earn Blades?',
    'What are the reward levels?',
    'How do I redeem Blades?',
  ],
  '/account/profile': [
    'How do I change my avatar?',
    'Can I change my email?',
    'What should I put in my profile?',
  ],
  default: [
    'How can I get help?',
    'What features are available?',
    'How do I contact support?',
  ],
}

export function getSuggestedQuestions(page: string): string[] {
  return SUGGESTED_QUESTIONS[page] || SUGGESTED_QUESTIONS.default
}
