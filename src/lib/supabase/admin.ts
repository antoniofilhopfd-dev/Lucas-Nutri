import { createClient } from "@supabase/supabase-js";
/** Somente servidor. Nunca importar em componentes client. */
export const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
