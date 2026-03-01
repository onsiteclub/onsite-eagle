import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@onsite/supabase/server';
import { logger } from '@onsite/logger';

/**
 * POST /api/delete-account
 * Deletes a user account from Supabase Auth
 * Requires the user to be logged in
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify the user is authenticated and matches the userId
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Use admin client to delete the user
    const adminClient = createAdminClient();

    // 1. Cancel any active subscriptions in Stripe (optional - they'll fail anyway without user)
    // For now, we just mark them as canceled in our database
    const { error: subError } = await adminClient
      .from('bil_subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (subError) {
      console.error('[DeleteAccount] Error canceling subscriptions:', subError);
      // Continue anyway - user deletion is more important
    }

    // 2. Delete the user from Supabase Auth
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('[DeleteAccount] Error deleting user:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete account. Please try again or contact support.' },
        { status: 500 }
      );
    }

    logger.info('AUTH', 'User account deleted successfully', { userId, email: user.email });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DeleteAccount] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
