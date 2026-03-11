# Nextacular CRM 🚀

<div align="center">

![Version](https://img.shields.io/badge/version-1.4.1--Beta-indigo?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-13-black?style=for-the-badge&logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=for-the-badge&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

**Plataforma profissional de CRM Omnichannel para gestão de clientes, vendas e atendimento.**

[Instalação](#-como-começar) · [Funcionalidades](#-funcionalidades) · [Tech Stack](#-tech-stack) · [Roadmap](#-roadmap)

</div>

---

## ✨ Funcionalidades

### 🏢 Multi-tenancy & Workspaces
- **Workspaces Isolados** — Ambientes separados por equipe ou empresa
- **Gestão de Equipe** — Convite de membros, controle de permissões por papel
- **Seletor de Workspace** — Navegação fluida entre múltiplos ambientes

### 📊 Dashboard Executivo
- **Métricas em Tempo Real** — KPIs de vendas, receita, deals ativos e atividades
- **Gráficos Interativos** — Recharts integrado com tema claro/escuro
- **Atividades Recentes** — Timeline detalhada de eventos do workspace

### 🗂️ Pipeline de Vendas
- **Kanban Visual** — Drag-and-drop de deals entre etapas (`@hello-pangea/dnd`)
- **Múltiplas Etapas** — Prospecção, Qualificação, Proposta, Negociação, Fechamento
- **Valor por Deal** — Acompanhamento financeiro do pipeline

### 👥 Contatos & Empresas
- **Cadastro Completo** — Dados de contato, empresa, cargo, canal de comunicação
- **Vinculação de Atividades** — Histórico de interações por contato
- **Campos Personalizados** — Extensão do modelo de dados por workspace
- **Importação CSV** — Carga em massa de contatos

### 💬 Inbox Omnichannel
- **Central Unificada** — Conversas de todos os canais em um só lugar
- **Integração WhatsApp via Meta API** — Envio e recebimento de mensagens em tempo real
- **Múltiplos Números de WhatsApp** — Gerencie vários números por workspace
- **Sugestão de Resposta por IA** — Respostas inteligentes geradas pelo OpenAI

### 🔒 Autenticação & Segurança
- **Magic Link** — Login passwordless por email
- **Login por Credenciais** — Email + senha com bcrypt
- **2FA via TOTP** — Google Authenticator com QR Code
- **Verificação de Email** — Fluxo completo de confirmação de conta
- **Segurança Configurável** — Ative/desative 2FA diretamente nas configurações

### 💳 Planos & Faturamento
- **3 Planos** — Free / Standard / Premium com limites definidos por feature
- **Integração Stripe** — Checkout, Webhooks e gestão de assinaturas
- **Paywalls Inteligentes** — Bloqueio elegante de funcionalidades premium na UI
- **Billing Dashboard** — Status de plano, próximas cobranças e histórico de faturas

### 🛡️ Super Admin Panel
- **Gestão de Tenants** — Suspensão, reativação e exclusão de usuários
- **Gestão de Planos** — Criação e edição de planos de assinatura via UI
- **Configurações Globais de API** — Stripe, OpenAI, SMTP — sem re-deploy
- **Monitoramento** — Métricas de crescimento e saúde da plataforma

### 🎓 Onboarding Interativo
- **Tours Guiados** — Tour passo a passo na primeira visita de cada tela (driver.js)
- **Progressão Persistente** — Progresso salvo no banco, não reaparece após concluído
- **Tradução Automática** — Tours traduzidos conforme o idioma do usuário

### 🌍 Internacionalização (i18n)
- **6 Idiomas Suportados** — Português, Inglês, Espanhol, Francês, Alemão, Italiano
- **Detecção Automática** — Baseada no navegador do usuário
- **Seleção Manual** — Selector de idioma nas Configurações da conta

### 🎨 Design System "Elite Executive"
- **Modo Escuro Profissional** — Paleta Zinc-950 com contraste impecável em todos os elementos
- **Modo Claro Premium** — Glassmorphism, sombras elevadas e bordas sutis
- **Tipografia Executiva** — Fonte `Outfit` (display) + `Inter` (corpo)
- **Animações Fluidas** — Framer Motion com micro-interações e hover states
- **Componentes Uniformes** — Cards, Sidebar, Header e Modais com `dark:` tokens completos

### 🖥️ Página de Vendas Premium
- **Hero Animado** — Partículas e gradientes com resposta ao movimento do mouse
- **Seção de Funcionalidades** com ícones e descrições interativas
- **Preços com Feature Gating** — Tabela de planos com funcionalidades por nível
- **Testemunhos** e **FAQ** completos
- **CTA de Alta Conversão** com animações responsivas ao scroll

---

## 🛠️ Tech Stack

| Camada | Tecnologia |
|---|---|
| **Frontend** | Next.js 13, React 18, Tailwind CSS 3, Headless UI |
| **Animações** | Framer Motion |
| **Backend** | Next.js API Routes (Serverless) |
| **Banco de Dados** | PostgreSQL + Prisma ORM |
| **Autenticação** | NextAuth.js (Magic Link, Credentials, TOTP 2FA) |
| **Pagamentos** | Stripe (Checkout, Webhooks, Subscriptions) |
| **IA** | OpenAI API (Suggest Reply) |
| **WhatsApp** | Facebook/Meta Graph API |
| **Internacionalização** | react-i18next (6 idiomas) |
| **Tours** | driver.js |
| **Gráficos** | Recharts |
| **Drag & Drop** | @hello-pangea/dnd |
| **Notificações Push** | Web Push API |

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
cp .env.sample .env
# Edite .env com suas chaves

# 4. Execute as migrations do banco
npx prisma migrate dev

# 5. (Opcional) Popule o banco com dados iniciais
npx prisma db seed

# 6. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse em `http://localhost:3000`.

### Variáveis de Ambiente

```env
# Banco de Dados
DATABASE_URL="postgresql://..."

# Autenticação
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="sua-chave-secreta"

# Email (Magic Links)
EMAIL_FROM="noreply@seudominio.com"
EMAIL_SERVER="smtp://..."

# Stripe (Billing)
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Super Admin
ADMIN_EMAIL="admin@seudominio.com"
```

> As configurações de OpenAI, WhatsApp e SMTP podem ser definidas **diretamente no Super Admin Panel**, sem necessidade de re-deploy.

---

## 🗺️ Roadmap

- [x] Core CRM (Contatos, Empresas, Deals)
- [x] Pipeline de Vendas Kanban com drag-and-drop
- [x] Dashboard Executivo com métricas e gráficos
- [x] Inbox Omnichannel (WhatsApp)
- [x] Sugestão de Resposta por IA (OpenAI)
- [x] Múltiplos Números de WhatsApp por Workspace
- [x] Sistema de Planos & Paywalls (Free / Standard / Premium)
- [x] Autenticação Completa (Magic Link + Senha + 2FA)
- [x] Onboarding com Tours Interativos (driver.js)
- [x] Super Admin Panel completo
- [x] Internacionalização em 6 idiomas
- [x] Design System "Elite Executive" (Modo Escuro Profissional)
- [x] Página de Vendas Animada com Feature Gating
- [x] Importação de Contatos via CSV
- [x] Notificações Push (Web Push API)
- [ ] Automação & Workflows de Vendas
- [ ] App Mobile (PWA)
- [ ] Relatórios e Exportação de Dados

---

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis (Sidebar, Card, Button...)
├── hooks/               # React hooks customizados
├── layouts/             # Layouts de página (Account, Admin)
├── lib/
│   ├── server/          # Lógica de servidor (Stripe, Auth, WhatsApp, Mail)
│   └── common/          # Utilitários compartilhados
├── messages/            # Traduções (pt, en, es, fr, de, it)
├── pages/
│   ├── api/             # API routes (auth, workspace, admin, webhooks)
│   ├── account/         # Área do usuário (Dashboard, Settings, Billing...)
│   └── auth/            # Páginas de autenticação
├── providers/           # Context providers (workspace, session)
├── sections/            # Seções da landing page (Hero, Pricing, CTA...)
└── styles/              # CSS global e design system
prisma/
├── schema.prisma        # Schema do banco de dados
└── services/            # Serviços de acesso ao banco
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
