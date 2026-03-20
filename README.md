# Closify CRM

Um CRM omnichannel projetado para vender, atender e acompanhar clientes sem virar refém de planilha. 

Plataforma B2B multi-tenant com foco em operação comercial de alta performance, atendimento unificado (WhatsApp + Email), pipeline visual, automações No-Code e monetização nativa por planos SaaS (Stripe).

---

## Por que isso existe (Motivação)
- **Construção de Negócio:** Quero alavancar um produto SaaS B2B rentável.
- **Domínio Tecnológico:** Preciso de uma plataforma que eu controle 100% (código, produto, dados e evolução).
- **Resolver uma Dor Real:** A meta é simples: simplificar o caos comercial de milhares de PMEs com uma experiência premium, rápida e sólida.

## Diferenciais Premium (Corporate Experience)
A Closify foi totalmente redesenhada em **Março/2026** (Executive Lilac Rebranding) para oferecer uma experiência de ponta, unindo funcionalidade robusta com uma estética corporativa premium.

- **Landing Page Cinematográfica (High-Conversion):** Interface imersiva projetada para converter leads com animações guiadas pelo mouse e *Pricing Dinâmico* gerido 100% via Super Admin (com suporte a descontos anuais).
- **Inbox Omnichannel Unificado:** Centralize WhatsApp e E-mail em uma interface limpa. Gerencie conversas com resumos de Inteligência Artificial e sugestões automáticas de respostas em tempo real.
- **Pipeline com Glassmorphism:** Visualize seus negócios através de um Kanban moderno, com efeitos de vidro fosco, indicadores de probabilidade (AI Fit) e filtros drag-and-drop rápidos.
- **Custom Fields & Formulários Públicos (Web Forms):** Adapte o CRM com campos personalizados dinâmicos e crie Páginas de Captura de Leads nativas (Form Builder) num piscar de olhos.

## Plataforma No-Code (Adaptável ao Negócio)
A ideia aqui é que **o CRM não é engessado**. Cada workspace consegue criar fluxos próprios sem pedir feature nova:
- **Workflows (Automações por Regra):** Gatilhos + condições + ações, suporte a ações encadeadas e delays (ex: se "Proposta Enviada", disparar WP em 2 dias e notificar App).
- **Webhooks & Zapier v2:** Assinatura HMAC com rotação de segredo, Catch Hooks e integração nativa com o Zapier via eventos do produto (ex: Pagamento criado, Novo Lead, Mudança no Pipeline, NPS Promotor).
- **Presets por Nicho:** Onboarding "1-click" que monta funis, campos, automações e templates baseados na vertical do cliente (ex: Imobiliária, Assistência Técnica, Restaurante).
- **Roteamento Inteligente:** SLA de Inbox (escalonamento e round-robin entre a equipe).

---

## Arquitetura e Engenharia (Tech Stack)

### Regras Internas da Casa (Pra eu não me sabotar)
1. *Zero credenciais hardcoded*. Tudo via \`.env\` ou cofres criptografados no banco (SystemConfig).
2. *Segurança Admin Master*. Tudo do painel Super Admin é auditável (via tabelas de trilha \`Activity\`).
3. *Hardening Multi-Tenant*. Tudo DEVE filtrar estritamente por \`workspaceId\` (inclusive chamadas de IA).
4. *Validação Pragmática*. Se uma feature não tem métrica/uso, ela é removida. Melhor pequeno e funcionando do que inchado e quebrado.

### Dinheiro e Modelo de Negócios (Pra não me enganar)
- **Assinaturas SaaS (Stripe):** Entram no webhook principal da plataforma e abrem ou cortam acesso automaticamente baseados nos limites definidos (ex: Overture, Seats).
- **Pagamentos Internos do CRM:** O cliente pode usar o CRM para fazer suas próprias vendas (Asaas, MercadoPago, Pagar.me), e a plataforma debita uma \`marketplace_fee\` ou split de forma fluída e transparente.
- **FinOps e Cota de IA:** A Inteligência artificial é taxada sobre o uso (Overage Limits). Se a Cota do plano (ex: 200k tokens) acabar, o sistema injeta um faturamento (\`invoice_item\`) no Stripe automaticamente cobrando a volumetria extra.

---

## Como Rodar e Testar

### Ambiente Local (Dev)
Requisitos: Node.js 18+, Postgres Database (local ou Neon direct string).

```bash
# 1. Instale as dependências
npm install

# 2. Roda as migrações no banco local e reseta schemas
npx prisma migrate dev

# 3. Faz o seed de planos nativos (exatamente como a Landing Page) e o login Super Admin
npx prisma db seed

# 4. Sobe a aplicação
npm run dev
```
> **Nota:** Se o Next.js mudar de porta sozinho (3001/3002), o `NEXTAUTH_URL` fixo no `.env` do localhost pode gerar tela branca de CSRF. Deixe dinâmico em dev.

### Troubleshooting (Erros comuns)

**1) Server Error: `Cannot find module './chunks/vendor-chunks/next.js'`**

Isso quase sempre é cache/artefato corrompido do build do Next. Limpe a pasta `.next` e suba novamente:

```bash
# PowerShell (Windows)
Remove-Item -Recurse -Force .next
npm run dev
```

**2) `listen EADDRINUSE: address already in use` (porta ocupada)**

Suba em outra porta:

```bash
npm run dev -- --port 3001
```

### Configuração de Deploy (Go-Live na Vercel + Neon)
- **Banco de Dados (Neon):** Utilize a *Connection String Pooled* na Vercel para suporte serverless impecável (PgBouncer automático). Use a *Direct String* local apenas para rodar `prisma db push` / `migrate deploy`.
- **Migração em Produção:** Lembre de apontar no CLI local a url *direct* e rodar `DATABASE_URL="postgresql://...NEON_DIRECT..." npm run prisma:migrate:deploy` seguido de `npx prisma db seed`.

### SystemConfigs (API do Super Admin)
O coração da plataforma agora vive num painel visual dentro do sistema (`/admin/system`). Todas as chaves do **OpenAI, Google OAuth, Gateway de SaaS Stripe, Domínios da Vercel para Mapeamento Custom, AWS S3 e Analytics** são persistidas lá com algoritmo forte de criptografia. 
O `.env` em produção requer apenas o básico: `DATABASE_URL`, `NEXTAUTH_SECRET`, `APP_URL`, e a `CONFIG_ENCRYPTION_KEY` mãe.

---

## Diário de Bordo (Changelog de Dev)

Para não perder a linha de evolução, aqui estão os saltos da plataforma consolidados:

### Fase de Maturidade B2B e Multi-Tenant (Finalizadas)
- **Fase 6 (Auditoria e LGPD):** Adição rigorosa da trilha de auditoria para ações de Super Admin e Webhooks. Endpoints nativos `/privacy/export` e `/privacy/erase` por workspace para conformidade total com a LGPD e GDPR (Direito ao esquecimento).
- **Fase 8 (Operações e Resiliência):** Tela de incidentes (SLA/Ack) no admin, Masquerade auditável (login como cliente), e botões globais para repescagem / reprocesso manual de webhooks falhos e automações devidas.
- **Fase 9 (Limites Enforcados):** As lógicas de "Assentos/Membros" e de Convites Pendentes validadas ativamente para inibir Spam. Rate Limiting implementado no topo do Postgres para ser independente da memória Serverless do Node na Vercel. 
- **Fase 11 (Stripe em Produção):** Automações rígidas cobrindo idempotência. Replay interno 2x em falha temporária e check validador `GET /api/admin/stripe/validate` detectando ambientes Test/Live descasados com um clique. Integração nativa de Nota Fiscal de Serviço (NFS-e) via Focus NFE amarrada ao pagamento efetuado (Invoice Paid).

### Sprint "Polimento Executivo" (Março 2026)
- **Rebranding "Executive Lilac":** A interface abandonou as cores padrão "Teal" em direção à uma identidade primária "Brand/Roxa", infundindo credibilidade e elegância da ponta do pipeline à apresentação do Help Center corporativo.
- **UI/UX & Dinamismo:** Preços da Landing Page calculados e renderizados de forma "Ao Vivo" conectados ao JSON dos Planos (Super Admin). Modais globais de Cookie Consent configuráveis pelo cliente, reativados usando Contextos da React v18 e migrados do G-Analytics nativo em prol de scripts condicionados à LGPD.
- **Múltiplos Ciclos de Faturamento (SaaS):** Adição de lógica mensal e descontos inteligentes (percentuais dinâmicos) na assinatura anual, exibidos na interface de preços em *Real-Time* com gatilho de convencimento cognitivo (preço proporcional no mês equivalente para planos anuais).
- **Robustez de UX Pública:** A tela de login uniu estética e modernismo e ganhou "visão dupla" com imagem. A "Interactive Demo" se blindou de anomalias (incluindo host de imagens não liberadas do Next.js Avatar) e traduções `react-i18next` dinâmicas completas foram implementadas para os leads gringos nas suas propagandas/call-to-actions.
- **AI Chatbot Autopilot:** Introdução de um chatbot multimodal 100% autônomo. A IA atende os clientes 24/7 lendo o contexto de negócio da empresa, recomendando links de Produtos/Checkouts, enviando Formulários de Triagem (Web Forms) de forma inteligente e transcrevendo áudios ou lendo imagens no WhatsApp, tudo debitando da cota transparente do cliente integradamente via Stripe.

### Expansão Global & Inteligência de Precificação (Março 2026 - Sprint 2)
- **Arquitetura Multi-Moeda Nativa:** O Super Admin agora pode definir preços independentes para **BRL, USD, EUR e GBP** em um único plano. O sistema sincroniza múltiplos `Price IDs` no Stripe automaticamente.
- **Detecção Inteligente de Localidade:** A Landing Page e o fluxo de checkout detectam o idioma/local do visitante para exibir a moeda correta (ex: $ para gringos, R$ para brasileiros) e aplicar o faturamento localizado sem fricção.
- **Catálogo de Produtos com Imagens:** Lojistas agora podem anexar imagens aos seus produtos (`PaymentProduct`), visualizando-as no dashboard e exibindo-as em destaque nas páginas públicas de pagamento para aumentar a conversão.
- **IA Responsiva ao Idioma:** Todo o motor de IA (Resumos e Sugestões) foi blindado para detectar o idioma da conversa e responder nativamente na língua do usuário, garantindo um atendimento humano e global.

---

## Licença

Este projeto comercial é mantido e licenciado sob a **MIT License** — veja o arquivo [LICENSE](LICENSE) para detalhes de cópia e direitos.

---

<div align="center">
  Construído com obsessão por <a href="https://github.com/Andre-Brito-py">Andre Brito</a>
</div>
