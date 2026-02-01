import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase admin client with service role key
 * USE WITH CAUTION - bypasses Row Level Security
 * Only use in server-side code for admin operations like webhooks
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Updates a user's subscription status in the profiles table
 * Called from Stripe webhooks
 */
export async function updateSubscriptionStatus(
  userId: string,
  status: 'trialing' | 'active' | 'canceled' | 'past_due',
  stripeCustomerId?: string
) {
  const supabase = createAdminClient();
  
  const updateData: Record<string, unknown> = {
    subscription_status: status,
    updated_at: new Date().toISOString(),
  };
  
  if (stripeCustomerId) {
    updateData.stripe_customer_id = stripeCustomerId;
  }
  
  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);
    
  if (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }
  
  return { success: true };
}

/**
 * Gets a user profile by Stripe customer ID
 */
export async function getProfileByStripeCustomerId(stripeCustomerId: string) {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();
    
  if (error) {
    console.error('Error fetching profile by Stripe ID:', error);
    return null;
  }
  
  return data;
}

/**
 * Gets a user profile by user ID
 */
export async function getProfileById(userId: string) {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  
  return data;
}
