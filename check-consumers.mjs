import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkConsumers() {
  const { data, error } = await supabase.from('consumers').select('id, first_name, last_name, identifier, nfc_tag_uid, school_id');
  if (error) {
    console.error('Error fetching consumers:', error);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

checkConsumers();
