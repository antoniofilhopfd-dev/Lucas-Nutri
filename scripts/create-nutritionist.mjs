// Cria um nutricionista (usuário + perfil + CRN). Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-nutritionist.mjs "Lucas Bento" "CRN-6 12345" lucas@exemplo.com 'senha-forte-aqui'
import { createClient } from "@supabase/supabase-js";
const [name, crn, email, password, role = "nutritionist"] = process.argv.slice(2);
if (!name || !crn || !email || !password || password.length < 8) { console.error("Uso: <nome> <crn> <email> <senha(8+)> [nutritionist|admin]"); process.exit(1); }
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role } });
if (error) throw error;
const id = data.user.id;
for (const [t, row] of [["profiles", { id, role, full_name: name }], ["nutritionists", { id, crn: crn.trim().toUpperCase().replace(/\s+/g, " ") }]]) {
  const { error: e } = await sb.from(t).insert(row); if (e) throw e;
}
console.log("Nutricionista criado:", id);
