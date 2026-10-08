# Publicar na Hostinger

Há dois cenários bem diferentes. Hoje só o **A** está pronto.

| | O que sobe | Plano de hospedagem necessário | Pronto? |
|---|---|---|---|
| **A. Protótipo** | 1 arquivo HTML estático (dados fictícios) | Qualquer plano de hospedagem web (Apache) | Sim |
| **B. App completo** | Next.js + Supabase (dados reais) | Hospedagem com **Node.js** (Business/Cloud) ou **VPS**, mais um projeto Supabase | Não: depende da segunda parte |

> O app completo usa *server actions* e *middleware* do Next.js, então **não** funciona em hospedagem só de arquivos estáticos/PHP.

---

## Node.js na Hostinger (assistente "Node.js web app" a partir do GitHub)

Foi o caminho que você abriu no hPanel. Funciona hoje em **modo demonstração**: o site mostra o protótipo, sem Supabase.

**Preencha assim**
| Campo | Valor |
|---|---|
| Repositório / branch | `antoniofilhopfd-dev/Lucas-Nutri` · branch `claude/bentonutrisync-saas-dev-pwzovg` (depois, a branch oficial) |
| Comando de construção | `npm run build` |
| Gerenciador de pacotes | `npm` |
| Diretório de saída | `.next` |
| Comando de início | `npm start` |
| Node.js | 20 ou 22 |

**Variáveis de ambiente** (a Hostinger não deixa continuar com valor vazio; use estes valores temporários):
| Chave | Valor agora |
|---|---|
| `NEXT_PUBLIC_DEMO_MODE` | `true` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://exemplo.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `pendente` |
| `SUPABASE_SERVICE_ROLE_KEY` | `pendente` |

Com `NEXT_PUBLIC_DEMO_MODE=true`, o endereço principal (`/`) e `/demo` abrem o protótipo, e `/nutri` e `/paciente` redirecionam para a demonstração (ficam **fechadas** até o Supabase existir). Os valores `exemplo` e `pendente` não são chaves reais.

**Quando o Supabase estiver pronto:** troque as três variáveis pelos valores reais, **apague** `NEXT_PUBLIC_DEMO_MODE` (ou ponha `false`) e **refaça o build** (variáveis `NEXT_PUBLIC_*` entram no código na hora do build). Nunca cole a `SUPABASE_SERVICE_ROLE_KEY` em chat, e-mail ou no GitHub: só no painel da Hostinger.

**Atualização automática:** deixe ligada a opção de implantar a cada push no GitHub (ou use o webhook do hPanel). A cada push, a Hostinger refaz o build e o protótipo atualizado entra no ar.

---

## A. Protótipo para o cliente, sempre puxando do GitHub

Como funciona: a cada push que altera o protótipo, o GitHub Actions (`.github/workflows/deploy-hostinger.yml`) gera o site e o publica na branch **`deploy-hostinger`**, que contém **só** os arquivos do site (`index.html`, `favicon.png`, `robots.txt`, `.htaccess`). A Hostinger acompanha essa branch e faz o pull sozinha. Assim o código-fonte, as migrations e os documentos nunca ficam dentro da pasta pública.

**Ainda sem domínio? Tudo bem.** A Hostinger entrega um **endereço temporário** do seu site (algo como `https://nome-aleatorio.hostingersite.com`; aparece no hPanel, no painel do site, como domínio temporário ou prévia do site). Use esse endereço agora e troque pelo domínio quando ele estiver registrado e apontado. O protótipo não depende do nome do domínio: usa só caminhos relativos.

**Configuração única na Hostinger** (os nomes dos menus podem variar um pouco conforme o plano):
1. **Escolha onde o site vai ficar:**
   - *Sem domínio ainda:* use a pasta `public_html` do site com o endereço temporário. Ela costuma vir com um arquivo de exemplo (por exemplo `default.php`): **apague** antes, porque o Git precisa de uma pasta vazia.
   - *Com domínio depois:* crie o subdomínio `demo` (ex.: `demo.seudominio.com.br`) com a pasta vazia e repita o passo 2 apontando para ela, ou simplesmente associe o domínio ao mesmo site.
2. **Git:** hPanel → **Avançado → Git** → criar repositório:
   - *Repositório:* `https://github.com/antoniofilhopfd-dev/Lucas-Nutri.git` (o repositório é público, não precisa de chave).
   - *Branch:* `deploy-hostinger`
   - *Diretório:* `public_html` (ou a pasta do subdomínio).
3. Clique em **Implantar/Deploy** para o primeiro pull e abra o endereço temporário para conferir.
4. **Atualização automática:** a Hostinger mostra uma **URL de webhook** (*Auto Deployment*). No GitHub: *Settings → Webhooks → Add webhook*, cole a URL, *Content type* `application/json`, evento **Just the push event**. Daí em diante, cada push dispara o pull.
5. **SSL e HTTPS:** quando o certificado do endereço/domínio estiver ativo, descomente o bloco de redirecionamento HTTPS no `.htaccess` (`prototype/hostinger/.htaccess`). Até lá, o site abre normalmente pelo endereço que a Hostinger indicar.

**Quando o domínio ficar pronto:** registre/aponte o domínio no hPanel (Domínios), associe-o ao mesmo site (ou crie o subdomínio e refaça o passo 2 nele), ative o SSL e descomente o redirecionamento HTTPS. Não é preciso mexer no GitHub nem no código.

**Rotina depois disso:** você (ou o Claude) faz push para a branch de trabalho → o Actions atualiza `deploy-hostinger` → o webhook faz a Hostinger puxar → o site muda em cerca de 1 a 2 minutos. Para forçar manualmente: GitHub → Actions → "Publicar protótipo" → *Run workflow*.

**Proteger com senha:** o protótipo é demonstração. Use a proteção de diretório do hPanel, se o seu plano tiver, ou descomente o bloco "Senha opcional" no `.htaccess` (`prototype/hostinger/.htaccess`).

**Alternativa sem Git:** enviar `bentonutrisync-prototipo-hostinger.zip` pelo Gerenciador de arquivos e extrair na pasta do subdomínio.

**Observação:** o protótipo carrega as fontes do Google Fonts; sem internet no aparelho, cai numa fonte padrão, sem quebrar o layout.

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
