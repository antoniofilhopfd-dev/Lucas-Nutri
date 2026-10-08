# BentoNutriSync

Plataforma SaaS do ecossistema BentoNutri (Lucas Bento, Nutricionista): prontuário nutricional longitudinal, avaliação física, motor clínico versionado, dietas, acompanhamento, chat e comunidade.

## Stack
Next.js 15 · React 19 · TypeScript · Tailwind · MySQL/MariaDB (mysql2, login próprio, fotos em disco do servidor) · Zod · React Hook Form · TanStack Query · Recharts · pdf-lib · Vitest.

## Rodando
```bash
npm install
cp .env.example .env.local   # MYSQL_URL, SESSION_SECRET, APP_URL, STORAGE_DIR
npm run dev                  # app (migrations aplicam sozinhas na primeira conexão)
npm test                     # testes unitários
TEST_MYSQL_URL=mysql://usuario:senha@host:3306/banco_de_teste npm run test:acesso   # testes de acesso (apaga as tabelas do banco indicado!)
npm run typecheck && npm run build
npm run auth:criar-nutri -- "Lucas Bento" "CRN-6 00000" email@exemplo.com   # primeiro acesso (pede a senha)
```
Sem `MYSQL_URL` (ou com `NEXT_PUBLIC_DEMO_MODE=true`) o site serve só o protótipo estático em `/demo`.

## Estrutura
- `db/migrations/` — esquema MySQL (001–006), embutido em `src/server/migracoes-sql.ts` e aplicado no start.
- `src/server/` — banco, login, regras de acesso (`authz.ts`) e serviços por módulo.
- `src/lib/clinical/` — motor clínico puro, sem React: índices, composição corporal, plicometria, energia, macros, classificações.
- `src/lib/ai/` — camada abstrata de fala/NLP; padrão local, externo só com consentimento.
- `src/features/*` — regras, ações de servidor e telas por módulo.

## Princípios que o código aplica
- **Consulta é o centro**: dados clínicos têm `patient_id` e `consultation_id`; consulta finalizada só muda por emenda auditada (o original fica preservado).
- **Sem recálculo silencioso**: cada cálculo guarda equação, versão, entradas e saídas (JSON).
- **Regras de acesso no servidor** (`authz.ts`), testadas contra MySQL real. Paciente só vê o próprio; nutricionista só a sua carteira; admin global.
- **Imagens**: arquivos fora da pasta pública, servidos por rota autenticada, consentimento clínico separado do público.
- **IA propõe, nutricionista confirma**: nada da anamnese vira dado clínico sem confirmação.

## REVISÃO CIENTÍFICA NECESSÁRIA (bloqueado até validar na referência original)
- Plicometria: Jackson & Pollock 7 e 3 dobras (coeficientes digitados, não conferidos), Petroski, Faulkner, Durnin & Womersley, Guedes (sem coeficientes).
- FAO/OMS (sem coeficientes por faixa etária).
- Pontos de corte de RCQ e RCEst; combinação MET + TEF (metodologia documentada no resultado, a validar).
- Base de alimentos: nenhuma tabela foi copiada; importar TACO ou outra base só com licença registrada.

## Estado
6 migrations aplicam em MariaDB 10.11; 97 testes unitários e 17 testes de acesso (isolamento paciente/nutricionista/admin, imutabilidade de consulta finalizada, dieta publicada única, fotos e consentimento, comunidade) passam; fluxo real de login testado ponta a ponta. Login do paciente: telefone + código de 6 dígitos emitido pelo nutricionista (WhatsApp) ou por webhook de SMS opcional (`SMS_WEBHOOK_URL`).

Faltam: ligar as telas clínicas (anamnese, avaliação, energia, dietas, fotometria) e a área do paciente às ações de servidor, transcrição de áudio, upload de fotos na interface e mais testes E2E.
