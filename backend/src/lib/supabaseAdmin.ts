import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  // Do not throw here to allow the server to boot; callers will check
  // eslint-disable-next-line no-console
  console.warn('[supabaseAdmin] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

export const supabaseAdmin = url && serviceKey ? createClient(url, serviceKey, {
  auth: { persistSession: false },
}) : (null as any);
