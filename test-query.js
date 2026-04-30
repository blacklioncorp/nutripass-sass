const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://juautqvqptburnflbolm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1YXV0cXZxcHRidXJuZmxib2xtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIwNjY2MywiZXhwIjoyMDg5NzgyNjYzfQ.HM-ZQ-OhMN2yr2Lm2DhBA5nukQfY0rhnEE2zm0xekLw');
supabase.from('transactions').select('type').limit(10).then(r => console.log(r.data));
