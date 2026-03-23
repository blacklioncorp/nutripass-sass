import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  // Get Sakbe school
  const { data: schools } = await supabase.from('schools').select('id').limit(1);
  if (!schools || schools.length === 0) return console.log('No schools found.');
  const schoolId = schools[0].id;

  console.log('Inserting consumers...');
  const { data: consumers, error: consErr } = await supabase.from('consumers').insert([
    {
      school_id: schoolId,
      first_name: 'Juan',
      last_name: 'Pérez',
      identifier: '2024-001',
      nfc_tag_uid: '123-456',
      type: 'student',
      is_active: true
    },
    {
      school_id: schoolId,
      first_name: 'Carlos',
      last_name: 'Ruiz',
      identifier: '2024-002',
      type: 'student',
      is_active: true
    }
  ]).select();

  if (consErr) {
    console.error('Error inserting consumers:', consErr);
    return;
  }

  console.log('Consumers inserted. Creating wallets...');
  const wallets = consumers.map(c => ({
    consumer_id: c.id,
    type: 'comedor',
    balance: c.first_name === 'Juan' ? 500.00 : 0.00,
    max_overdraft: 50.00
  }));

  const { error: wallErr } = await supabase.from('wallets').insert(wallets);
  if (wallErr) {
    console.error('Error creating wallets:', wallErr);
  } else {
    console.log('Test users created successfully! Juan has $500.00 and Carlos has $0.00 (but 50 overdraft).');
  }
}

seed();
