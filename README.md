# Nextacular CRM 🚀

<div align="center">

![Version](https://img.shields.io/badge/version-1.4.0-indigo?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-13-black?style=for-the-badge&logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=for-the-badge&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

**Uma plataforma SaaS de CRM completa para gerenciamento de clientes, vendas e atendimento omnichannel.**

[Instalação](#-como-começar) · [Funcionalidades](#-funcionalidades) · [Roadmap](#-roadmap) · [Contribuição](#-contribuição)

</div>

---

## ✨ Funcionalidades

### 🏢 Multi-tenancy & Workspaces
- **Workspaces Isolados** — Ambientes separados por equipe ou empresa
- **Gestão de Equipe** — Convite de membros e controle de permissões
- **Seletor de Workspace** — Navegação fluida entre múltiplos ambientes

### 📊 CRM Completo
- **Dashboard Executivo** — Métricas de vendas, receita e atividades em tempo real
- **Gestão de Contatos & Empresas** — Base centralizada de leads e clientes B2B
- **Pipeline de Vendas Visual** — Kanban com drag-and-drop (`@hello-pangea/dnd`)
- **Histórico de Atividades** — Timeline detalhada de interações e auditoria

### 💬 Inbox Omnichannel
- **Central Unificada** — Conversas de todos os canais em um só lugar
- **Envio de Mensagens WhatsApp** — Mensagens de saída via API do Facebook/Meta
- **Sugestão de Resposta por IA** — Respostas inteligentes geradas por OpenAI
- **Múltiplos Números de WhatsApp** — Gerencie vários números por workspace (com limites por plano)

### 🔒 Autenticação Robusta
- **Login por Magic Link** (email passwordless)
- **Login por Senha** com credenciais seguras
- **Autenticação em Dois Fatores (2FA)** via TOTP (Google Authenticator)
- **Verificação de Email** no cadastro
- **Configurações de Segurança** com QR Code para 2FA

### 💳 Billing & Planos
- **Integração Stripe** — Checkout, Webhooks e gestão de assinaturas
- **3 Planos** (Free / Standard / Premium) com limites dinâmicos
- **Paywalls Inteligentes** — Bloqueio elegante de funcionalidades premium na UI
- **Billing Page** completa com status do plano atual

### 🛡️ Super Admin Panel
- **Gestão de Tenants** — Suspensão, reativação e exclusão de contas
- **Gestão de Planos** — Criação e edição de planos de assinatura
- **Configurações de API via UI** — Stripe, OpenAI, SMTP, sem re-deploy
- **Dashboard de Monitoramento** — Métricas de crescimento e saúde da plataforma

### 🎓 Onboarding com Tours Interativos
- **Tour guiado na primeira visita** de cada tela (driver.js)
- **Opção de Pular** o tour a qualquer momento
- **Persistência no banco** — o tour não reaparece após concluído
- **Tradução automática** com base no idioma do navegador

### 🌍 Internacionalização (i18n)
- **Português (PT-BR)** e **Inglês (EN)** suportados
- **Detecção automática** do idioma do navegador
- **react-i18next** com arquivos de tradução separados

### 🎨 Design System "Executive Zinc"
- **Tipografia Premium** — Fonte `Outfit` para elementos de destaque
- **Glassmorphism** — Efeitos de backdrop blur e transparência
- **Componentes Premium** — Cards elevados, sidebar executiva com estados ativos
- **Logo Inteligente** — Transparência processada por canvas (`SmartTransparentImage`)

---

## 🛠️ Tech Stack

| Camada | Tecnologia |
|---|---|
| **Frontend** | Next.js 13, React, Tailwind CSS, Headless UI |
| **Backend** | Next.js API Routes (Serverless) |
| **Banco de Dados** | PostgreSQL + Prisma ORM |
| **Autenticação** | NextAuth.js (Magic Link, Credentials, TOTP 2FA) |
| **Pagamentos** | Stripe (Checkout, Webhooks, Subscriptions) |
| **IA** | OpenAI API (Suggest Reply) |
| **WhatsApp** | Facebook/Meta Graph API |
| **Internacionalização** | react-i18next |
| **Tours** | driver.js |
| **Drag & Drop** | @hello-pangea/dnd |

---

## 🚀 Como Começar

### Pré-requisitos
- Node.js 18+
- PostgreSQL
- Conta Stripe (para faturamento)
- Conta Meta Developer (para WhatsApp)

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/Andre-Brito-py/CRM.git
cd CRM

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas chaves (DATABASE_URL, NEXTAUTH_SECRET, etc.)

# 4. Execute as migrations do banco
npx prisma migrate dev

# 5. (Opcional) Popule o banco com dados iniciais
npx prisma db seed

# 6. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse em `http://localhost:3000`.

### Variáveis de Ambiente Necessárias

```env
# Banco de Dados
DATABASE_URL="postgresql://..."

# Autenticação
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="sua-chave-secreta"

# Email (para Magic Links)
EMAIL_FROM="noreply@seudominio.com"
EMAIL_SERVER="smtp://..."

# Stripe (Billing)
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Super Admin
ADMIN_EMAIL="admin@seudominio.com"
```

> As demais configurações (OpenAI, WhatsApp, SMTP) podem ser definidas **diretamente no painel Super Admin**, sem necessidade de re-deploy.

---

## 🗺️ Roadmap

- [x] Core CRM (Contatos, Empresas, Deals)
- [x] Pipeline Visual Kanban com drag-and-drop
- [x] Internacionalização PT-BR / EN
- [x] Dashboard Executivo com métricas
- [x] Inbox Omnichannel (UI + Backend)
- [x] Integração WhatsApp (envio/recebimento)
- [x] Assistente de IA (Sugestão de Resposta)
- [x] Múltiplos Números de WhatsApp por Workspace
- [x] Paywalls e Feature Gating por Plano
- [x] Autenticação Completa (Magic Link + Senha + 2FA)
- [x] Tours de Onboarding com tradução automática
- [x] Painel Super Admin completo
- [x] Design System "Executive Zinc" Premium
- [ ] Automação & Workflows de Vendas
- [ ] App Mobile (PWA)
- [ ] Relatórios e Exportação de Dados

---

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis (Sidebar, Logo, Button...)
├── hooks/               # React hooks customizados (data fetching)
├── layouts/             # Layouts de página (Account, Admin)
├── lib/
│   ├── server/          # Lógica de servidor (Stripe, Auth, WhatsApp, Mail)
│   └── common/          # Utilitários compartilhados
├── pages/
│   ├── api/             # API routes (auth, workspace, admin, webhooks)
│   ├── account/         # Área do usuário (Dashboard, Billing, Inbox...)
│   └── auth/            # Páginas de autenticação
├── providers/           # Context providers (workspace, session)
├── sections/            # Seções da landing page (Hero, Pricing, Footer)
└── styles/              # CSS global e design system
prisma/
└── schema.prisma        # Schema do banco de dados
```

---

## 🤝 Contribuição

Contribuições são bem-vindas!

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é licenciado sob a **MIT License** — veja o arquivo [LICENSE](LICENSE) para detalhes.

---

<div align="center">
  Feito com ❤️ por <a href="https://github.com/Andre-Brito-py">Andre Brito</a>
</div>
