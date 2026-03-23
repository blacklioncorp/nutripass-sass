import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const { data: profiles } = await supabase.from('profiles').select('id, role, school_id');
  
  for (const user of usersData.users) {
    const profile = profiles.find(p => p.id === user.id);
    console.log(`Email: ${user.email} | Role: ${profile?.role} | School: ${profile?.school_id}`);
  }
}

checkUsers();
