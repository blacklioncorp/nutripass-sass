import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log('--- Fetching sample data ---');
  
  const { data: consumers, error: cErr } = await supabase
    .from('consumers')
    .select('id, first_name')
    .limit(1);
    
  if (cErr) {
    console.error('Error fetching consumers:', cErr);
    return;
  }
  
  if (!consumers.length) {
    console.log('No consumers found.');
    return;
  }
  
  const consumerId = consumers[0].id;
  console.log(`Using consumer: ${consumers[0].first_name} (${consumerId})`);

  const { data: wallets, error: wErr } = await supabase
    .from('wallets')
    .select('id, type, balance')
    .eq('consumer_id', consumerId);
    
  if (wErr) {
    console.error('Error fetching wallets:', wErr);
    return;
  }

  console.log('Wallets found:', wallets);

  const comedorWallet = wallets.find(w => w.type === 'comedor');
  
  if (!comedorWallet) {
    console.log('No comedor wallet found for this consumer.');
    return;
  }

  console.log('--- Testing Transaction Insert ---');
  
  const testTx = {
    wallet_id: comedorWallet.id,
    amount: 10.00,
    type: 'debit',
    description: 'Test Transaction from script',
    metadata: {
      consumer_id: consumerId,
      source_type: 'daily_menu',
      daily_menu_id: '00000000-0000-0000-0000-000000000000', // dummy
      date: new Date().toISOString().split('T')[0],
      wallet_type: 'comedor',
      status: 'pendiente_recoger',
    },
  };

  const { data: txData, error: txErr } = await supabase
    .from('transactions')
    .insert([testTx])
    .select();

  if (txErr) {
    console.error('FAILED to insert transaction:', JSON.stringify(txErr, null, 2));
  } else {
    console.log('SUCCESS: Transaction inserted:', txData);
  }
}

runTest();
