import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

async function seedMaster() {
  const email = 'master@nutripass.com';
  const password = 'Password123!';
  
  console.log(`Buscando / Creando super_admin auth user: ${email}`);
  let { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'NutriPass Master' }
  });

  let userId;
  if (authErr && authErr.message.includes('already been registered')) {
      const { data: usersData } = await supabase.auth.admin.listUsers();
      userId = usersData.users.find(u => u.email === email)?.id;
      console.log('User ya existe en Auth, usando su ID...');
  } else if (authErr) {
      console.error(`Error creando user:`, authErr);
      return;
  } else {
      userId = authData.user.id;
  }

  if (userId) {
    console.log('Inyectando perfil de master...');
    const { error: profErr } = await supabase.from('profiles').upsert({
      id: userId,
      role: 'superadmin',
      full_name: 'NutriPass Master',
      school_id: null // El master no pertenece a ningún colegio
    });

    if (profErr) {
      console.error(`Error creando el perfil master:`, profErr);
    } else {
      console.log(`Perfil master creado exitosamente.`);
    }
  }
}

seedMaster();
