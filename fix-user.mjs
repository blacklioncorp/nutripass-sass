import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUser() {
  console.log('Fetching users without profiles...');
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) return console.error(usersErr);
  
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
  if (profErr) return console.error(profErr);
  
  const profileIds = new Set(profiles.map(p => p.id));
  
  const orphanUsers = usersData.users.filter(u => !profileIds.has(u.id));
  console.log(`Encontrados ${orphanUsers.length} usuarios sin perfil.`);
  
  for (const user of orphanUsers) {
    console.log(`Arreglando usuario: ${user.email} (${user.id})`);
    
    // Si queremos hacerlo master o school_admin:
    // Los haremos superadmin para que puedan navegar todo
    const { error: insertErr } = await supabase.from('profiles').insert({
      id: user.id,
      role: 'superadmin',
      full_name: user.email?.split('@')[0] || 'Admin Prueba'
    });
    
    if (insertErr) {
      console.error('Error insertando perfil:', insertErr.message);
    } else {
      console.log('Perfil superadmin creado exitosamente para', user.email);
    }
  }
}

fixUser();
