# BentoNutriSync

Plataforma SaaS do ecossistema BentoNutri (Lucas Bento, Nutricionista): prontuário nutricional longitudinal, avaliação física, motor clínico versionado, dietas, acompanhamento, chat e comunidade.

## Stack
Next.js 15 · React 19 · TypeScript · Tailwind · Supabase (Postgres, Auth, Storage, RLS) · Zod · React Hook Form · TanStack Query · Recharts · pdf-lib · Vitest.

## Rodando
```bash
npm install
cp .env.example .env.local   # preencha as chaves do Supabase
npm run dev                  # app
npm test                     # testes unitários (lógica clínica, regras, validações)
npm run typecheck && npm run build
supabase db reset            # aplica supabase/migrations/0001..0011
supabase test db             # testes de RLS (supabase/tests/rls_test.sql)
```

## Estrutura
- `supabase/migrations/` — esquema, RLS, auditoria, versionamento (0001–0011).
- `src/lib/clinical/` — motor clínico puro, sem React: índices, composição corporal, plicometria, energia, macros, classificações.
- `src/lib/ai/` — camada abstrata de fala/NLP; padrão local, externo só com consentimento.
- `src/features/*` — regras e telas por módulo.

## Princípios que o código aplica
- **Consulta é o centro**: dados clínicos têm `patient_id` e `consultation_id`; consulta finalizada só muda por emenda auditada (o original fica preservado).
- **Sem recálculo silencioso**: cada cálculo guarda equação, versão, entradas e saídas (`jsonb`).
- **RLS no banco**, não só na interface. Paciente só vê o próprio; nutricionista só a sua carteira; admin global.
- **Imagens**: buckets privados, URL assinada de 5 min, consentimento clínico separado do público.
- **IA propõe, nutricionista confirma**: nada da anamnese vira dado clínico sem confirmação.

## REVISÃO CIENTÍFICA NECESSÁRIA (bloqueado até validar na referência original)
- Plicometria: Jackson & Pollock 7 e 3 dobras (coeficientes digitados, não conferidos), Petroski, Faulkner, Durnin & Womersley, Guedes (sem coeficientes).
- FAO/OMS (sem coeficientes por faixa etária).
- Pontos de corte de RCQ e RCEst; combinação MET + TEF (metodologia documentada no resultado, a validar).
- Base de alimentos: nenhuma tabela foi copiada; importar TACO ou outra base só com licença registrada.

## Estado
Fundação, motor clínico, módulos e migrations estão implementados e testados em nível de unidade. Faltam: login real (CRN+senha; telefone+OTP), ligação das telas ao banco, transcrição de áudio com provedor, upload real de arquivos, testes E2E e execução dos testes de RLS contra um projeto Supabase.
