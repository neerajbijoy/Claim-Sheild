/**
 * Apply missing schema columns to Supabase documents table.
 * Run once: node scripts/migrate_documents_schema.js
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

let url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log('[Migration] No Supabase credentials configured. Skipping.');
  process.exit(0);
}
if (!url.startsWith('http')) url = 'https://' + url;

const sb = createClient(url, key);

const SQL = `
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_text TEXT;
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS extraction_status TEXT DEFAULT 'SUCCESS';
`;

async function run() {
  console.log('[Migration] Applying documents schema update...');
  const { data, error } = await sb.rpc('exec_sql', { sql: SQL });
  if (error) {
    // exec_sql RPC may not exist — print instructions for manual run
    console.warn('[Migration] exec_sql RPC unavailable. Please run the following SQL manually in the Supabase SQL Editor:\n');
    console.log(SQL);
    console.log('\nOr go to: https://supabase.com/dashboard → your project → SQL Editor → paste and run the above.');
  } else {
    console.log('[Migration] ✅ Schema updated successfully.', data);
  }
}

run().catch(err => console.error('[Migration] Error:', err.message));
