import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ProfileClient from './ProfileClient';

export const metadata = {
  title: 'Perfil - Centro de Configuración',
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the user's profile to get the full name
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', user.id)
    .single();

  // If there's no profile or the full_name is missing, try fetching from 'parents' table (as a fallback)
  let userProfile = profile;
  if (!userProfile?.full_name) {
    const { data: parentRecord } = await supabase
      .from('parents')
      .select('id, full_name, email')
      .eq('id', user.id)
      .single();
    
    if (parentRecord) {
      userProfile = {
        id: user.id,
        full_name: parentRecord.full_name || '',
        email: parentRecord.email || user.email || ''
      };
    } else {
      userProfile = {
        id: user.id,
        full_name: '',
        email: user.email || ''
      };
    }
  } else if (!userProfile.email) {
    userProfile.email = user.email || '';
  }

  return <ProfileClient userProfile={userProfile} userEmail={user.email ?? ''} />;
}
