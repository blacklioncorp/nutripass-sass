const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function patchDatabase() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Checking for allergens column in products table...');
  
  // We can't run arbitrary SQL via the JS client easily without an RPC, 
  // but we can try to select it to see if it exists.
  const { data, error } = await supabase
    .from('products')
    .select('allergens')
    .limit(1);

  if (error && error.code === '42703') {
    console.log('Column "allergens" does not exist. Please run the following SQL in the Supabase SQL Editor:');
    console.log('\nALTER TABLE products ADD COLUMN IF NOT EXISTS allergens TEXT[];\n');
  } else if (error) {
    console.error('Error checking column:', error.message);
  } else {
    console.log('Column "allergens" already exists! ✅');
  }
}

patchDatabase();
