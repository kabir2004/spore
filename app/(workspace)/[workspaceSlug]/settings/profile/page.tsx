import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { getUserSettings, upsertUserSettings, updateUserProfile } from '@/lib/actions/settings';
import type { UpdateUserSettingsInput } from '@/lib/types/settings';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const settings = await getUserSettings();

  async function handleSave(input: UpdateUserSettingsInput) {
    'use server';
    const [settingsResult, profileResult] = await Promise.all([
      upsertUserSettings(input),
      updateUserProfile({
        full_name:  input.full_name,
        avatar_url: input.avatar_url,
      }),
    ]);
    return { error: settingsResult.error ?? profileResult.error };
  }

  return (
    <ProfileSettings
      settings={settings}
      email={user.email ?? ''}
      onSave={handleSave}
    />
  );
}
