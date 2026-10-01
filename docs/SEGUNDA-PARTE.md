# Segunda parte: do protótipo ao produto

A parte visual está fechada em `prototype/index.html` (abre direto no navegador) e nos prints de `prototype/telas/`.
Este documento lista o que falta para ligar tudo a dados reais.

## 1. Infraestrutura (pré-requisitos)
- [ ] Criar o projeto Supabase e preencher `.env.local` (URL, chave pública, service role).
- [ ] Rodar `supabase db push` com as migrations `0001`–`0011`.
- [ ] Configurar provedor de SMS (login do paciente por código).
- [ ] Criar o primeiro nutricionista: `node scripts/create-nutritionist.mjs`.
- [ ] Rodar `npm run test:rls` contra o banco real (já passa em Postgres puro).

## 2. Ligar as telas ao banco
O contrato linha ↔ schema já está testado (`src/lib/db/rows.test.ts`) e as ações de servidor existem em `src/features/*/actions.ts`.
Falta transformar cada tela do protótipo em componente Next.js usando essas ações:

| Tela do protótipo | Ação / fonte de dados | Estado |
|---|---|---|
| Login | `features/auth/actions` | pronto, sem teste real |
| Pacientes (lista, novo) | `features/patients/actions` | parcial |
| Prontuário (resumo) | `app/nutri/pacientes/[id]` | parcial |
| Consultas / Agenda | `features/consultations/actions` | ação pronta, falta tela de agenda |
| Anamnese | `features/anamnesis/actions` | ação pronta |
| Avaliação / Composição / Energia | `features/anthropometry/actions` | ação pronta |
| Fotometria | `features/photometry` + Storage | falta upload |
| Dieta | `features/diets/actions` | ação pronta, falta banco de alimentos |
| Check-ins / Refeições (paciente) | `features/checkins/actions` | ação pronta |
| Mensagens | `features/messaging/actions` | ação pronta, falta tempo real |
| BentoNutriClub | views/tabelas `0010` | falta tela do paciente |
| Dashboard / Relatórios | `0011` + `lib/reports` | falta ligação |
| Configurações / Privacidade | tabela `consents` | falta tela |

## 3. Decisões e insumos de negócio
- **Revisão científica** (bloqueado até validar na referência original): Jackson & Pollock 7/3 (coeficientes digitados de memória), Petroski, Faulkner, Durnin & Womersley, Guedes, FAO/OMS, pontos de corte de RCQ/RCEst, combinação MET + TEF.
- **Base de alimentos**: definir a fonte (ex.: TACO) e confirmar a licença antes de importar; o importador já exige fonte, versão e licença.
- **Áudio**: escolher provedor de transcrição; precisa de consentimento do paciente para processamento externo.
- **Textos legais**: termos de uso, política de privacidade e textos dos consentimentos (hoje "v1.0" de exemplo).
- **Adesão**: confirmar a definição (refeições registradas ÷ planejadas) ou incluir água e treino.

## 4. Qualidade antes de ir ao ar
- [ ] Testes E2E (Playwright) do fluxo completo.
- [ ] Revisão de LGPD com o responsável jurídico (retenção, exportação, exclusão).
- [ ] Backup e monitoramento de erros (sem dados clínicos nos logs).
