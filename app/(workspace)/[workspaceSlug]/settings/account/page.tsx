import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { changeEmail, changePassword } from '@/lib/actions/settings';

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Detect if user has a password provider (vs OAuth-only)
  const identities  = user.identities ?? [];
  const hasPassword = identities.some((id) => id.provider === 'email');

  async function handleChangeEmail(newEmail: string) {
    'use server';
    return changeEmail(newEmail);
  }

  async function handleChangePassword(current: string, next: string) {
    'use server';
    return changePassword(current, next);
  }

  async function handleDeleteAccount() {
    'use server';
    // In production: delete user data then call supabase.auth.admin.deleteUser
    // For now: sign out and redirect
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <AccountSettings
      email={user.email ?? ''}
      hasPassword={hasPassword}
      onChangeEmail={handleChangeEmail}
      onChangePassword={handleChangePassword}
      onDeleteAccount={handleDeleteAccount}
    />
  );
}
