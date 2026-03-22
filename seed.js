const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const parts = line.split('=');
    if (parts.length >= 2) env[parts[0]] = parts.slice(1).join('=');
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
  const email = 'admin@nutripass.com';
  const password = 'NutriPass2026!';

  console.log("Creando usuario en Auth...");
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError && !authError.message.includes('already been registered')) {
    console.error('AuthError:', authError.message);
    return;
  }

  let userId = authData?.user?.id;
  if (!userId) {
     const { data: users } = await supabase.auth.admin.listUsers();
     const existing = users.users.find(u => u.email === email);
     if (existing) userId = existing.id;
  }

  if (userId) {
    console.log("Otorgando rol de superadmin en tabla profiles...");
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      role: 'superadmin',
      full_name: 'NutriPass Admin'
    });

    if (profileError) {
      console.error('ProfileError:', profileError.message);
    } else {
      console.log('SUCCESS: admin@nutripass.com / NutriPass2026!');
    }
  }
}
seed();
