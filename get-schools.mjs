import 'dotenv/config';

async function fetchSchools() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/schools?select=id,subdomain,name';
  const res = await fetch(url, {
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
    }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

fetchSchools();
