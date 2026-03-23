import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function seedProfiles() {
  console.log('Fetching Sakbe school...');
  const { data: schools } = await supabase.from('schools').select('id').limit(1);
  if (!schools || schools.length === 0) return console.log('No schools found.');
  const schoolId = schools[0].id;

  const usersToCreate = [
    { email: 'papa@sakbe.com', password: 'Password123!', role: 'parent', name: 'Papá Prueba' },
    { email: 'vendedor@sakbe.com', password: 'Password123!', role: 'staff', name: 'Cajero Cafetería' }
  ];

  for (const u of usersToCreate) {
    console.log(`Creating auth user: ${u.email}`);
    // Create in auth.users via admin API
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.name }
    });

    if (authErr) {
      if (authErr.message.includes('already exists')) {
        console.log(`User ${u.email} already exists.`);
        continue;
      }
      console.error(`Error creating auth user ${u.email}:`, authErr);
      continue;
    }

    const userId = authData.user.id;

    console.log(`Creating profile for ${u.email}...`);
    const { error: profErr } = await supabase.from('profiles').insert({
      id: userId,
      school_id: schoolId,
      role: u.role,
      full_name: u.name
    });

    if (profErr) {
      console.error(`Error creating profile for ${u.email}:`, profErr);
    } else {
      console.log(`Profile ${u.role} created successfully.`);
    }

    // If it's the parent, let's create a child consumer
    if (u.role === 'parent') {
      console.log('Creating child consumer for parent...');
      const { data: child, error: childErr } = await supabase.from('consumers').insert({
        school_id: schoolId,
        parent_id: userId,
        first_name: 'Hijo',
        last_name: 'Prueba',
        identifier: '2026-999',
        type: 'student',
        is_active: true
      }).select().single();

      if (!childErr && child) {
        console.log('Creating wallet for child...');
        await supabase.from('wallets').insert({
          consumer_id: child.id,
          type: 'comedor',
          balance: 200.00,
          max_overdraft: 50.00
        });
        console.log('Child consumer and wallet created ($200.00).');
      } else {
        console.error('Error creating child consumer:', childErr);
      }
    }
  }

  console.log('Done.');
}

seedProfiles();
