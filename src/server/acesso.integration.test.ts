/**
 * Testes de acesso/segurança contra um MySQL/MariaDB REAL (substituem o RLS do Postgres).
 * Rodam só com TEST_MYSQL_URL definida (banco descartável: as tabelas são apagadas e recriadas).
 *   TEST_MYSQL_URL=mysql://bn:bn@127.0.0.1:3307/bn_test npm run test:acesso
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mysql from "mysql2/promise";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const URL_TESTE = process.env.TEST_MYSQL_URL;
const rodar = describe.skipIf(!URL_TESTE);

rodar("acesso e segurança (MySQL real)", () => {
  let S: Awaited<ReturnType<typeof carregar>>;
  async function carregar() {
    process.env.MYSQL_URL = URL_TESTE!;
    process.env.SESSION_SECRET = "segredo-de-teste-com-mais-de-32-caracteres-ok";
    const [{ aplicarMigracoes }, auth, authz, mysqlMod, pac, cons, aval, anam, diet, acomp, com, cons2, fotos, painel, schema, sql] = await Promise.all([
      import("./migrar"), import("./auth-core"), import("./authz"), import("./mysql"), import("./services/pacientes"), import("./services/consultas"),
      import("./services/avaliacoes"), import("./services/anamnese"), import("./services/dietas"), import("./services/acompanhamento"), import("./services/comunidade"),
      import("./services/consentimentos"), import("./services/fotos"), import("./services/painel"), import("@/features/patients/schema"), import("./sql"),
    ]);
    return { aplicarMigracoes, auth, authz, mysqlMod, pac, cons, aval, anam, diet, acomp, com, cons2, fotos, painel, schema, sql };
  }
  const storage = mkdtempSync(join(tmpdir(), "bn-storage-"));
  let NA: { id: string; papel: "nutritionist" }, NB: typeof NA, AD: { id: string; papel: "admin" }, PA: { id: string; papel: "patient" }, PB: typeof PA;
  let consA: string;
  const base = { birth_date: "1990-03-02", biological_sex: "female", primary_goal: "health" };

  beforeAll(async () => {
    S = await carregar();
    const c = await mysql.createConnection({ uri: URL_TESTE!, multipleStatements: true });
    const [t] = await c.query<any[]>("SELECT TABLE_NAME n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()");
    await c.query("SET FOREIGN_KEY_CHECKS=0");
    for (const r of t) await c.query(`DROP TABLE IF EXISTS \`${r.n}\``);
    await c.query("SET FOREIGN_KEY_CHECKS=1");
    await c.end();
    await S.aplicarMigracoes(URL_TESTE!);
    process.env.STORAGE_DIR = storage;
    const a = await S.auth.criarProfissional({ nome: "Nutri A", papel: "nutritionist", crn: "CRN-6 1001", senha: "Senha!234" });
    const b = await S.auth.criarProfissional({ nome: "Nutri B", papel: "nutritionist", crn: "CRN-6 1002", senha: "Senha!234" });
    const ad = await S.auth.criarProfissional({ nome: "Admin", papel: "admin", email: "admin@exemplo.com", senha: "Senha!234" });
    NA = { id: a.id, papel: "nutritionist" }; NB = { id: b.id, papel: "nutritionist" }; AD = { id: ad.id, papel: "admin" };
    const mk = (nome: string, tel: string) => S.schema.patientSchema.parse({ ...base, full_name: nome, phone: tel });
    PA = { id: (await S.pac.criarPaciente(NA, mk("Paciente Alfa Silva", "83991110001"))).id, papel: "patient" };
    PB = { id: (await S.pac.criarPaciente(NB, mk("Paciente Beta Souza", "83991110002"))).id, papel: "patient" };
    consA = (await S.cons.criarConsulta(NA, { patientId: PA.id, consultationType: "initial" })).id;
  });
  afterAll(async () => { rmSync(storage, { recursive: true, force: true }); await S?.mysqlMod.fecharBanco(); });

  const nega = (p: Promise<unknown>) => expect(p).rejects.toThrow(/Acesso negado/);

  it("paciente A só enxerga o próprio cadastro", async () => {
    expect((await S.pac.listarPacientes(PA)).map((p) => p.id)).toEqual([PA.id]);
    await nega(S.pac.obterPaciente(PA, PB.id));
    await nega(S.pac.lerDadosSaude(PA, PB.id));
    await expect(S.pac.lerDadosSaude(PA, PA.id)).resolves.not.toThrow;
  });
  it("paciente não cria consulta nem cadastra paciente", async () => {
    await nega(S.cons.criarConsulta(PA, { patientId: PA.id, consultationType: "initial" }));
    await nega(S.pac.criarPaciente(PA, S.schema.patientSchema.parse({ ...base, full_name: "Intruso Teste", phone: "83991119999" })));
  });
  it("nutricionista A vê só a própria carteira; B não alcança o paciente de A", async () => {
    expect((await S.pac.listarPacientes(NA)).map((p) => p.id)).toEqual([PA.id]);
    expect((await S.pac.listarPacientes(NB)).map((p) => p.id)).toEqual([PB.id]);
    expect((await S.pac.listarPacientes(AD)).length).toBe(2);
    await nega(S.pac.obterPaciente(NB, PA.id));
    await nega(S.pac.lerDadosSaude(NB, PA.id));
  });
  it("nutricionista B não cria consulta para paciente de A (falha de segurança corrigida)", async () => {
    await nega(S.cons.criarConsulta(NB, { patientId: PA.id, consultationType: "initial" }));
    expect((await S.cons.listarConsultas(NB)).length).toBe(0);
    expect((await S.cons.listarConsultas(NA)).length).toBe(1);
  });
  it("avaliação: só a equipe responsável, só em rascunho; B é negado", async () => {
    const i = { consultationId: consA, assessmentDate: "2026-10-01", weightKg: 66.9, heightCm: 168, waistCm: 75.5, hipCm: 98, pairs: { biceps_relaxed: { right: 32.1, left: 31.4 } } };
    await nega(S.aval.salvarAvaliacao(NB, i));
    await nega(S.aval.salvarAvaliacao(PA, i));
    const r = await S.aval.salvarAvaliacao(NA, i);
    const [row] = await S.mysqlMod.consultar<any>("SELECT age_at_assessment, bmi FROM anthropometric_assessments WHERE id=?", [r.id]);
    expect(Number(row.age_at_assessment)).toBe(36);          // idade na data da avaliação (nasc. 02/03/1990)
    expect(Number(row.bmi)).toBeGreaterThan(23);
  });
  it("energia: grava entradas e saídas completas; B é negado", async () => {
    const e = { sex: "female" as const, weightKg: 66.9, heightCm: 168, age: 36, equation: "mifflin" as const, method: { type: "factor" as const, level: "moderate" as const }, strategy: { type: "percent" as const, value: -10 } };
    await nega(S.aval.salvarEnergia(NB, consA, e));
    const r = await S.aval.salvarEnergia(NA, consA, e);
    const [row] = await S.mysqlMod.consultar<any>("SELECT equation_version, created_by FROM energy_calculations WHERE id=?", [r.id]);
    expect(row.equation_version).toBe("1.0"); expect(row.created_by).toBe(NA.id);
  });
  it("anamnese: IA propõe, só confirmado vira dado clínico; paciente e B não leem", async () => {
    const an = await S.anam.registrarAnamnese(NA, consA, { rawText: "Dorme às 23h.", extractor: "rule-based-ptbr" });
    const item = (status: any, v: string) => ({ id: v, category: "sleep" as const, field: "Dorme", value: v, source: { kind: "text" as const, snippet: "Dorme às 23h." }, status });
    await expect(S.anam.decidirItens(NA, an.id, [item("pending", "1")])).rejects.toThrow(/sem decisão/);
    await S.anam.decidirItens(NA, an.id, [item("confirmed", "23:00"), item("rejected", "x")]);
    expect((await S.anam.lerAnamneseConfirmada(NA, PA.id)).length).toBe(1);
    await nega(S.anam.lerAnamneseConfirmada(PA, PA.id));
    await nega(S.anam.lerAnamneseConfirmada(NB, PA.id));
    await nega(S.anam.registrarAnamnese(NB, consA, { rawText: "x", extractor: "y" }));
  });
  it("consulta finalizada é imutável; emenda guarda o original; tudo auditado", async () => {
    await nega(S.cons.finalizarConsulta(NB, consA));
    await S.cons.finalizarConsulta(NA, consA);
    await nega(S.aval.salvarAvaliacao(NA, { consultationId: consA, assessmentDate: "2026-10-02", weightKg: 60, heightCm: 170 }));
    await expect(S.cons.finalizarConsulta(NA, consA)).rejects.toThrow(/Acesso negado/);       // já não é rascunho
    await expect(S.cons.emendarConsulta(NA, consA, "ok", "n")).rejects.toThrow(/motivo/);
    await nega(S.cons.emendarConsulta(NB, consA, "erro de digitação", "nota nova"));
    await S.cons.emendarConsulta(NA, consA, "erro de digitação", "nota nova");
    const [am] = await S.mysqlMod.consultar<any>("SELECT previous_snapshot FROM consultation_amendments WHERE consultation_id=?", [consA]);
    const snap = typeof am.previous_snapshot === "string" ? JSON.parse(am.previous_snapshot) : am.previous_snapshot;
    expect(snap.record_state).toBe("finalized");
    const [n] = await S.mysqlMod.consultar<any>("SELECT COUNT(*) n FROM audit_logs WHERE entity='consultations'");
    expect(Number(n.n)).toBeGreaterThanOrEqual(3);
  });
  it("dieta: paciente só vê a PUBLICADA; publicada é imutável; nova versão aposenta a anterior", async () => {
    const consD = (await S.cons.criarConsulta(NA, { patientId: PA.id, consultationType: "follow_up" })).id;
    await nega(S.diet.importarAlimentos(NA, []));
    await S.diet.importarAlimentos(AD, [{ id: "00000000-0000-4000-8000-0000000000f1", name: "Alimento teste", source: "teste", source_version: "1", license: "teste", calories: 100, protein: 10, carbohydrate: 10, fat: 1 }]);
    const refeicoes = [{ name: "Almoço", time: "12:30", foods: [{ foodId: "00000000-0000-4000-8000-0000000000f1", quantity: 150 }] }];
    await nega(S.diet.criarDieta(NB, consD, { meals: refeicoes }));
    const d1 = await S.diet.criarDieta(NA, consD, { vetKcal: 1900, meals: refeicoes });
    expect(d1.version).toBe(1);
    expect(await S.diet.lerDietas(PA, PA.id)).toEqual([]);                    // rascunho: invisível ao paciente
    await expect(S.diet.avancarDieta(NA, d1.id, "published")).rejects.toThrow(/Transição/);
    await S.diet.avancarDieta(NA, d1.id, "reviewed"); await S.diet.avancarDieta(NA, d1.id, "finalized");
    await expect(S.diet.atualizarDieta(NA, d1.id, { meals: refeicoes })).rejects.toThrow(/não pode ser editada/);
    await nega(S.diet.avancarDieta(NB, d1.id, "published"));
    await S.diet.avancarDieta(NA, d1.id, "published");
    expect((await S.diet.lerDietas(PA, PA.id)).map((d) => d.version)).toEqual([1]);
    await nega(S.diet.lerDietas(PB, PA.id)); await nega(S.diet.lerDietas(NB, PA.id));
    const consD2 = (await S.cons.criarConsulta(NA, { patientId: PA.id, consultationType: "follow_up" })).id;
    const d2 = await S.diet.criarDieta(NA, consD2, { meals: refeicoes });
    expect(d2.version).toBe(2);
    expect((await S.diet.lerDietas(PA, PA.id)).map((d) => d.version)).toEqual([1]);   // v2 em rascunho não aparece; v1 segue visível
    await S.diet.avancarDieta(NA, d2.id, "reviewed"); await S.diet.avancarDieta(NA, d2.id, "finalized"); await S.diet.avancarDieta(NA, d2.id, "published");
    expect((await S.diet.lerDietas(PA, PA.id)).map((d) => d.version)).toEqual([2]);
    const [pub] = await S.mysqlMod.consultar<any>("SELECT COUNT(*) n FROM diets WHERE patient_id=? AND status='published'", [PA.id]);
    expect(Number(pub.n)).toBe(1);                                                        // uma publicada por paciente
    await expect(S.mysqlMod.executar("UPDATE diets SET status='published' WHERE id=?", [d1.id])).rejects.toThrow(/Duplicate/);   // o próprio banco recusa
  });
  it("check-in: só o paciente, só hoje, em blocos de 500 ml", async () => {
    await nega(S.acomp.salvarCheckin(NA, { waterMl: 500 }));
    await expect(S.acomp.salvarCheckin(PA, { waterMl: 300 })).rejects.toThrow(/500 ml/);
    await expect(S.acomp.salvarCheckin(PA, { waterMl: 500, trained: true })).rejects.toThrow(/modalidade/);
    await S.acomp.salvarCheckin(PA, { waterMl: 1000 });
    await S.acomp.salvarCheckin(PA, { waterMl: 1500, trained: true, modality: "Corrida", minutes: 40 });   // mesmo dia: atualiza
    const rows: any[] = await S.acomp.listarCheckins(PA, PA.id);
    expect(rows.length).toBe(1); expect(rows[0].water_ml).toBe(1500);
    expect(String(rows[0].checkin_date instanceof Date ? rows[0].checkin_date.toISOString().slice(0, 10) : rows[0].checkin_date)).toBe(S.sql.hojeBR());
    await nega(S.acomp.listarCheckins(PB, PA.id)); await nega(S.acomp.listarCheckins(NB, PA.id));
    expect((await S.acomp.listarCheckins(NA, PA.id)).length).toBe(1);
    await nega(S.acomp.registrarRefeicao(NA, { mealType: "lunch" }));
    await S.acomp.registrarRefeicao(PA, { mealType: "lunch", before: "calm", after: "satisfied" });
  });
  it("mensagens: só paciente ↔ nutricionista responsável", async () => {
    await S.acomp.enviarMensagem(PA, PA.id, "dúvida");
    await S.acomp.enviarMensagem(NA, PA.id, "resposta");
    await nega(S.acomp.enviarMensagem(NB, PA.id, "intruso"));
    await nega(S.acomp.enviarMensagem(PB, PA.id, "intruso"));
    await nega(S.acomp.lerMensagens(NB, PA.id)); await nega(S.acomp.lerMensagens(PB, PA.id));
    const msgs: any[] = await S.acomp.lerMensagens(NA, PA.id);
    expect(msgs.length).toBe(2);
    expect(await S.acomp.marcarLidas(PB, msgs.map((m) => m.id))).toBe(0);                // só o destinatário marca
    expect(await S.acomp.marcarLidas(NA, msgs.map((m) => m.id))).toBe(1);                // a mensagem do paciente para o nutricionista
  });
  it("fotos: exigem consentimento clínico; só quem pode ver o paciente abre; cada acesso é auditado", async () => {
    const consF = (await S.cons.criarConsulta(NA, { patientId: PA.id, consultationType: "reassessment" })).id;
    const img = Buffer.from("fake-webp-bytes");
    await expect(S.fotos.salvarFoto(NA, consF, "front", img, "image/webp")).rejects.toThrow(/autorizou/);
    await expect(S.fotos.salvarFoto(NA, consF, "front", img, "image/png" as any)).rejects.toThrow(/Formato/);
    await nega(S.cons2.aceitarImagem(NB, PA.id, "clinical_use")); await nega(S.cons2.aceitarImagem(NA, PA.id, "clinical_use"));  // só o paciente aceita
    await S.cons2.aceitarImagem(PA, PA.id, "clinical_use");
    await nega(S.fotos.salvarFoto(NB, consF, "front", img, "image/webp"));
    const f = await S.fotos.salvarFoto(NA, consF, "front", img, "image/webp");
    expect((await S.fotos.lerFoto(NA, f.id)).bytes.equals(img)).toBe(true);
    expect((await S.fotos.lerFoto(PA, f.id)).mime).toBe("image/webp");
    await nega(S.fotos.lerFoto(PB, f.id)); await nega(S.fotos.lerFoto(NB, f.id));
    const [v] = await S.mysqlMod.consultar<any>("SELECT COUNT(*) n FROM audit_logs WHERE action='view' AND entity='body_photos'");
    expect(Number(v.n)).toBe(2);
    await S.cons2.revogarImagem(PA, PA.id, "clinical_use");
    await expect(S.fotos.salvarFoto(NA, consF, "back", img, "image/webp")).rejects.toThrow(/autorizou/);
  });
  it("comunidade: por nutricionista, consentimento público para fotos, moderação só do dono", async () => {
    await nega(S.com.publicar(PA, { kind: "official", body: "oficial" }));
    await expect(S.com.publicar(PA, { kind: "meal", body: "prato", imagePath: "community-images/a/1.webp" })).rejects.toThrow(/autorize o uso público/);
    await expect(S.com.publicar(PA, { kind: "meal", body: "prato", imagePath: "fotos/x/front.webp" })).rejects.toThrow(/clínicas/);
    await S.cons2.aceitarImagem(PA, PA.id, "clinical_use");
    await expect(S.com.publicar(PA, { kind: "meal", body: "prato", imagePath: "community-images/a/1.webp" })).rejects.toThrow(/autorize o uso público/);   // clínico não basta
    await S.cons2.aceitarImagem(PA, PA.id, "public_use");
    const post = await S.com.publicar(PA, { kind: "meal", body: "prato", imagePath: "community-images/a/1.webp" });
    await S.com.publicar(NA, { kind: "official", body: "Dica da semana" });
    await S.com.publicar(PB, { kind: "tip", body: "dica de B" });
    const feedA: any[] = await S.com.feed(PA); const feedB: any[] = await S.com.feed(PB);
    expect(feedA.map((p) => p.body).sort()).toEqual(["Dica da semana", "prato"]);
    expect(feedB.map((p) => p.body)).toEqual(["dica de B"]);
    expect(feedA.find((p) => p.body === "prato").author_name).toBe("Paciente");         // só o primeiro nome
    await nega(S.com.moderar(NB, post.id, "hide")); await nega(S.com.moderar(PB, post.id, "delete")); await nega(S.com.moderar(PB, post.id, "hide"));
    await nega(S.com.curtir(PB, post.id)); await nega(S.com.comentar(PB, post.id, "oi"));
    await S.com.curtir(PA, post.id); await S.com.comentar(NA, post.id, "ótimo");
    await S.com.moderar(NA, post.id, "hide");
    expect((await S.com.feed(PB)).length).toBe(1);
    expect((await S.com.feed(PA)).some((p: any) => p.id === post.id)).toBe(true);          // o autor ainda vê o próprio post oculto
    await expect(S.com.curtir(PA, post.id)).rejects.toThrow(/Acesso negado/);              // oculto não recebe curtidas
    await S.com.moderar(PA, post.id, "delete");                                              // autor exclui o próprio
    await nega(S.com.criarDesafio(PA, { title: "x", startsOn: "2026-10-05", endsOn: "2026-10-12" }));
    await expect(S.com.criarDesafio(NA, { title: "x", startsOn: "2026-10-12", endsOn: "2026-10-05" })).rejects.toThrow(/depois do início/);
  });
  it("painel: cada nutricionista conta só a própria carteira", async () => {
    const a = await S.painel.painel(NA), b = await S.painel.painel(NB), ad = await S.painel.painel(AD);
    expect(a.pacientesAtivos).toBe(1); expect(b.pacientesAtivos).toBe(1); expect(ad.pacientesAtivos).toBe(2);
    await nega(S.painel.painel(PA));
  });
  it("login do nutricionista: senha errada, CRN inexistente e usuário inativo falham", async () => {
    expect((await S.auth.autenticarProfissional("crn-6   1001", "Senha!234"))?.id).toBe(NA.id);   // CRN normalizado
    expect((await S.auth.autenticarProfissional("admin@exemplo.com", "Senha!234"))?.papel).toBe("admin");
    expect(await S.auth.autenticarProfissional("CRN-6 1001", "errada!234")).toBeNull();
    expect(await S.auth.autenticarProfissional("CRN-9 9999", "Senha!234")).toBeNull();
    await S.mysqlMod.executar("UPDATE usuarios SET ativo=0 WHERE id=?", [NB.id]);
    expect(await S.auth.autenticarProfissional("CRN-6 1002", "Senha!234")).toBeNull();
    await S.mysqlMod.executar("UPDATE usuarios SET ativo=1 WHERE id=?", [NB.id]);
    await expect(S.auth.criarProfissional({ nome: "X", papel: "nutritionist", crn: "CRN-6 7", senha: "fraca" })).rejects.toThrow(/senha/i);
  });
  it("login do paciente: código de uso único, 5 tentativas, só o nutricionista responsável emite", async () => {
    await nega(S.pac.emitirCodigoPaciente(NB, PA.id)); await nega(S.pac.emitirCodigoPaciente(PA, PA.id));
    const c1 = await S.pac.emitirCodigoPaciente(NA, PA.id);
    expect(c1).toMatch(/^\d{6}$/);
    expect(await S.auth.entrarComCodigo("83991119990", c1)).toBeNull();                      // telefone desconhecido
    expect((await S.auth.entrarComCodigo("(83) 99111-0001", c1))?.id).toBe(PA.id);
    expect(await S.auth.entrarComCodigo("83991110001", c1)).toBeNull();                      // uso único
    const c2 = await S.pac.emitirCodigoPaciente(NA, PA.id);
    for (let i = 0; i < 5; i++) expect(await S.auth.entrarComCodigo("83991110001", c2 === "000000" ? "111111" : "000000")).toBeNull();
    expect(await S.auth.entrarComCodigo("83991110001", c2)).toBeNull();                      // bloqueado após 5 erros, mesmo com o código certo
    const c3 = await S.pac.emitirCodigoPaciente(NA, PA.id);                                  // um novo código invalida o anterior
    expect((await S.auth.entrarComCodigo("83991110001", c3))?.id).toBe(PA.id);
  });
  it("sessão: só o hash vai ao banco; inativo e expirada não valem", async () => {
    const { token } = await S.auth.criarSessaoDb(NA.id, "127.0.0.1", "teste");
    expect((await S.auth.usuarioDaSessao(token))?.id).toBe(NA.id);
    const [r] = await S.mysqlMod.consultar<any>("SELECT token_hash FROM sessoes WHERE usuario_id=? ORDER BY criado_em DESC LIMIT 1", [NA.id]);
    expect(r.token_hash).not.toBe(token); expect(r.token_hash).toHaveLength(64);
    expect(await S.auth.usuarioDaSessao("token-invalido")).toBeNull(); expect(await S.auth.usuarioDaSessao(undefined)).toBeNull();
    await S.mysqlMod.executar("UPDATE sessoes SET expira_em=UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE token_hash=?", [r.token_hash]);
    expect(await S.auth.usuarioDaSessao(token)).toBeNull();
  });
});
