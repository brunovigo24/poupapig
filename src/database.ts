import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY devem ser definidos nas variáveis de ambiente');
}

// Cliente padrão para operações do usuário (com RLS)
const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente para operações da LLM (bypassa RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default supabase;
export { supabaseAdmin };
