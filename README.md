# Nextacular CRM 🚀

![Nextacular CRM](./public/images/seo-cover.png)

**Nextacular CRM** é uma plataforma SaaS completa para gerenciamento de relacionamento com clientes, vendas e atendimento omnichannel. Construído sobre o Nextacular starter kit, este projeto evoluiu para um CRM robusto com suporte a multi-tenancy, pipelines visuais e integração planejada com WhatsApp e IA.

## 🌟 Funcionalidades Principais

### 🏢 Multi-tenancy & Workspaces
- **Workspaces Isolados**: Crie múltiplos ambientes de trabalho para diferentes equipes ou empresas.
- **Gestão de Equipe**: Convide membros e gerencie permissões.
- **Configurações Personalizadas**: Domínios customizados e branding.

### 📊 CRM Completo
- **Gestão de Contatos**: Base centralizada de clientes e leads.
- **Gestão de Empresas**: Organização de contas corporativas (B2B).
- **Pipeline de Vendas Visual**: Quadro Kanban com drag-and-drop para gerenciar oportunidades.
- **Histórico de Atividades**: Timeline detalhada de interações.

### 🌍 Internacionalização
- **Suporte Multi-idioma**: Interface traduzida para Português e Inglês.
- **Detecção Automática**: Preferência salva por usuário.

### 🛠️ Tech Stack Moderna
- **Frontend**: Next.js 13, Tailwind CSS, Headless UI
- **Backend**: Next.js API Routes (Serverless)
- **Database**: PostgreSQL, Prisma ORM
- **Auth**: NextAuth.js (Magic Links)
- **Pagamentos**: Stripe Integration
- **Drag-and-Drop**: @hello-pangea/dnd

---

## 🚀 Como Começar

### Pré-requisitos
- Node.js 16+
- PostgreSQL
- Stripe Account (opcional para faturamento)

### Instalação

1. **Clone o repositório**
   ```bash
   git clone https://github.com/Andre-Brito-py/CRM.git
   cd CRM
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   Copie o arquivo `.env.example` para `.env` e preencha as chaves necessárias (Database URL, NextAuth Secret, Stripe Keys, etc.).

4. **Configure o Banco de Dados**
   ```bash
   npx prisma migrate dev
   ```

5. **Inicie o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```

O sistema estará acessível em `http://localhost:3000`.

---

## 🗺️ Roadmap de Desenvolvimento

O projeto segue um plano de desenvolvimento estruturado:

- [x] **Core CRM**: Modelagem de dados (Contatos, Empresas, Deals).
- [x] **Pipeline Visual**: Kanban com drag-and-drop.
- [x] **Internacionalização**: Suporte PT-BR/EN.
- [ ] **Inbox Omnichannel**: Central de atendimento unificada.
- [ ] **Integração WhatsApp**: Envio e recebimento de mensagens.
- [ ] **Automação & Workflows**: Regras automáticas de vendas.
- [ ] **Inteligência Artificial**: Assistente de resposta e insights.
- [ ] **Mobile App**: Versão PWA otimizada.

---

## 📄 Documentação
Para detalhes completos sobre todas as funcionalidades, consulte o [Manual do Usuário](./MANUAL.md).

## 🤝 Contribuição
Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## 📄 Licença
Este projeto é licenciado sob a MIT License.
