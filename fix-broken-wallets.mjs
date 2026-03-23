import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fix() {
  console.log('Buscando consumidores sin monedero (huérfanos)...');
  
  // Get all consumers
  const { data: consumers, error: cErr } = await supabase.from('consumers').select('id, identifier, first_name');
  if (cErr) return console.error(cErr);

  // Get all wallets
  const { data: wallets, error: wErr } = await supabase.from('wallets').select('consumer_id');
  if (wErr) return console.error(wErr);

  const walletConsumerIds = new Set(wallets.map(w => w.consumer_id));
  const orphans = consumers.filter(c => !walletConsumerIds.has(c.id));

  console.log(`Encontrados ${orphans.length} consumidores huérfanos.`);
  
  if (orphans.length > 0) {
    const defaultWallets = orphans.map(c => ({
      consumer_id: c.id,
      type: 'comedor',
      balance: 0.00
    }));

    const { error: insertErr } = await supabase.from('wallets').insert(defaultWallets);
    if (insertErr) {
      console.error('Error creando monederos faltantes:', insertErr);
    } else {
      console.log('✅ Monederos faltantes creados con éxito. Rosi ya tiene su monedero listo.');
    }
  }
}

fix();
