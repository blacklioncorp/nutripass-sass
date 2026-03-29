import { createClient } from '@supabase/supabase-js';

// Get these from env or hardcode for test script
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://juautqvqptburnflbolm.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1YXV0cXZxcHRidXJuZmxib2xtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIwNjY2MywiZXhwIjoyMDg5NzgyNjYzfQ.HM-ZQ-OhMN2yr2Lm2DhBA5nukQfY0rhnEE2zm0xekLw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runSeed() {
  console.log('Starting Audit Seed...');

  // 1. Create a dummy parent auth user if doesn't exist
  // To avoid dealing with auth emails in test, let's just create a new one:
  const parentEmail = 'padre2-auditoria@nutripass.com';
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email: parentEmail,
    password: 'Password123!',
    email_confirm: true,
  });
  if (authErr && !authErr.message.includes('already exists')) {
    console.error('Error creating auth user:', authErr);
    return;
  }
  
  // Get the user ID (existing or new)
  const { data: users } = await supabase.auth.admin.listUsers();
  const parentUser = users.users.find(u => u.email === parentEmail)!;
  console.log('Parent Auth User ID:', parentUser.id);

  // Set role to 'parent' in profiles
  await supabase.from('profiles').upsert({ id: parentUser.id, role: 'parent', email: parentEmail });
  await supabase.from('users').upsert({ id: parentUser.id, role: 'parent', email: parentEmail });

  // 2. We need a school. Let's find "Colegio Chino" or create a new "Colegio Auditoria"
  let { data: school } = await supabase.from('schools').select('id, name, subdomain').eq('name', 'Colegio Auditoria').single();
  
  if (!school) {
    const { data: newSchool, error: schoolErr } = await supabase.from('schools').insert({
      name: 'Colegio Auditoria',
      subdomain: 'auditoria',
      is_active: true,
      stripe_account_id: 'acct_1H0XXXXX', // Dummy if needed
      fee_percentage: 10
    }).select().single();
    if (schoolErr) throw schoolErr;
    school = newSchool;
  }
  console.log('School ID:', school.id);

  // 3. Create consumer
  const { data: consumer, error: consumerErr } = await supabase.from('consumers').upsert({
    school_id: school.id,
    first_name: 'Niño',
    last_name: 'Auditoria',
    identifier: '999999',
    type: 'student',
    grade: '4A',
    parent_email: parentEmail,
    is_active: true
  }, { onConflict: 'identifier' }).select().single();
  if (consumerErr) throw consumerErr;
  console.log('Consumer ID:', consumer.id);

  // Link consumer to parent
  await supabase.from('parent_consumers').upsert({
    parent_id: parentUser.id,
    consumer_id: consumer.id,
    status: 'active'
  });

  // 4. Ensure Wallets exist
  for (const wType of ['comedor', 'snack']) {
    const { data: existingWallet } = await supabase.from('wallets')
      .select('id').eq('consumer_id', consumer.id).eq('type', wType).single();
    if (!existingWallet) {
      await supabase.from('wallets').insert({ consumer_id: consumer.id, type: wType, balance: 0.00 });
    }
  }

  // 5. Create Menu for 13/04/2026
  const targetDate = '2026-04-13';
  const { data: menu, error: menuErr } = await supabase.from('daily_menus').upsert({
    school_id: school.id,
    date: targetDate,
    soup_name: 'Sopa de fideo',
    main_course_name: 'Pechuga a la plancha',
    side_dish_name: 'Arroz blanco',
    dessert_name: 'Gelatina',
    drink_name: 'Agua de Jamaica',
    combo_price: 75.00
  }, { onConflict: 'school_id, date' }).select().single();
  // Wait, unique constraint might be just id, so let's do an upsert or check
  
  console.log('Menu ID:', menu?.id);
  console.log('Seed Complete! You can now log in as:');
  console.log(`Email: ${parentEmail}`);
  console.log(`Password: Password123!`);
}

runSeed().catch(console.error);
