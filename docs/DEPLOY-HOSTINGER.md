# Publicar na Hostinger

Há dois cenários bem diferentes. Hoje só o **A** está pronto.

| | O que sobe | Plano de hospedagem necessário | Pronto? |
|---|---|---|---|
| **A. Protótipo** | 1 arquivo HTML estático (dados fictícios) | Qualquer plano de hospedagem web (Apache) | Sim |
| **B. App completo** | Next.js + Supabase (dados reais) | Hospedagem com **Node.js** (Business/Cloud) ou **VPS**, mais um projeto Supabase | Não: depende da segunda parte |

> O app completo usa *server actions* e *middleware* do Next.js, então **não** funciona em hospedagem só de arquivos estáticos/PHP.

---

## A. Protótipo para o cliente (≈ 10 minutos)

Arquivo pronto: `bentonutrisync-prototipo-hostinger.zip` (ou a pasta `prototype/hostinger/`). Contém `index.html`, `favicon.png`, `robots.txt` e `.htaccess`.

**Recomendado: usar um subdomínio** (ex.: `demo.seudominio.com.br`), para não substituir o site principal.

1. No hPanel: **Domínios → Subdomínios** → criar `demo` (a Hostinger cria a pasta, normalmente `public_html/demo`).
2. **Arquivos → Gerenciador de arquivos** → abra a pasta do subdomínio.
3. **Enviar** o `.zip` e **extrair** ali (use "Extrair"/"Descompactar"). Confira que `index.html` e `.htaccess` ficaram direto na pasta, não dentro de outra subpasta. O `.htaccess` é um arquivo oculto: ative "mostrar arquivos ocultos" para vê-lo.
4. Ative o **SSL** do subdomínio (hPanel → Segurança → SSL). O `.htaccess` já redireciona HTTP para HTTPS.
5. Abra `https://demo.seudominio.com.br` e teste: login, menu do nutricionista, abas do prontuário e a visão do paciente no celular.

**O que o pacote já faz:** HTTPS forçado, bloqueio de buscadores (`noindex` + `robots.txt`), compressão e cabeçalhos de segurança básicos, sem listar pastas.

**Proteger com senha** (recomendado, já que é demonstração): no hPanel procure a opção de *proteção de diretório por senha* (o nome e a disponibilidade variam conforme o plano). Se não existir, descomente o bloco "Senha opcional" no `.htaccess` e crie um `.htpasswd` fora da pasta pública.

**Atualizar depois:** edite `prototype/src/`, rode `python3 prototype/build.py` e envie de novo `prototype/hostinger/index.html`.

**Observação:** o protótipo carrega as fontes (Montserrat e Roboto Condensed) do Google Fonts. Sem internet no aparelho do cliente, cai numa fonte padrão, sem quebrar o layout.

---

## B. App completo (para quando a segunda parte estiver pronta)

**Antes de contratar/ajustar a hospedagem**
1. Plano com **Node.js** (Hostinger: Business/Cloud com "Node.js web apps") **ou VPS**. Confirme na página do plano que há suporte a Next.js.
2. Projeto **Supabase** (recomendo a região **São Paulo**, por LGPD e latência). É lá que ficam banco, login e fotos privadas.
3. Provedor de **SMS** configurado no Supabase (login do paciente por código).

**Variáveis de ambiente** (no painel da Hostinger, nunca no repositório): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. A chave `service_role` só no servidor.

**Passos**
1. `supabase db push` (aplica as migrations `0001`–`0011`) e rodar `npm run test:rls` contra o banco.
2. `node scripts/create-nutritionist.mjs "Lucas Bento" "CRN-… " email senha` para criar o primeiro acesso.
3. Na Hostinger: criar a aplicação Node.js a partir do repositório do GitHub (branch principal), comando de build `npm ci && npm run build`, comando de início `npm start`.
4. No Supabase, em Authentication → URL, cadastrar o domínio final como *Site URL* e *Redirect URL*.
5. Apontar o domínio (ex.: `app.seudominio.com.br`) para a aplicação e ativar o SSL.
6. Testar o fluxo completo (cadastrar paciente → consulta → avaliação → dieta → publicar → paciente acessa).

**Antes de usar com pacientes reais:** revisão científica das equações bloqueadas, textos legais/LGPD, backup do banco e monitoramento de erros (ver `docs/SEGUNDA-PARTE.md`).
