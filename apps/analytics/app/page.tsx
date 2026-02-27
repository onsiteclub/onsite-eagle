import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@onsite/supabase/server';

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard/overview');
  } else {
    redirect('/auth/login');
  }
}
