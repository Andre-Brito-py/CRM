# Manual do Usuário - Nextacular

Bem-vindo ao **Nextacular**, uma plataforma SaaS completa para gerenciamento de workspaces, equipes e CRM. Este manual descreve todas as funcionalidades disponíveis no sistema para ajudá-lo a aproveitar ao máximo a ferramenta.

## 🚀 Primeiros Passos

### Autenticação (Login)
O Nextacular utiliza um sistema de autenticação seguro via **Magic Link** (Link Mágico), eliminando a necessidade de senhas complexas.
1. Acesse a página de login.
2. Insira seu endereço de e-mail.
3. Clique em "Send the Magic Link".
4. Verifique sua caixa de entrada e clique no link recebido para entrar automaticamente.

---

## 🏢 Workspaces (Áreas de Trabalho)

Os Workspaces são o núcleo da organização no Nextacular. Tudo o que você cria (contatos, negócios, configurações) pertence a um workspace específico.

### Criar um Workspace
Ao entrar pela primeira vez, você será guiado para criar seu primeiro workspace.
- **Nome**: O nome visível da sua empresa ou projeto.
- **Slug**: O identificador único na URL (ex: `app.nextacular.com/account/meu-projeto`).

### Alternar entre Workspaces
Se você pertence a múltiplas equipes, pode alternar entre elas clicando no nome do workspace atual no menu lateral e selecionando outro na lista.

---

## 📊 CRM (Gestão de Relacionamento)

O Nextacular inclui um CRM integrado para gerenciar suas vendas e relacionamentos comerciais.

### 1. Pipeline (Funil de Vendas)
O Pipeline é um quadro **Kanban** visual para gerenciar seus negócios (Deals).
- **Visualização**: Colunas representando estágios (Lead, Qualificado, Negociação, Fechado, Perdido).
- **Drag-and-Drop**: Arraste e solte os cartões de negócios entre as colunas para atualizar o estágio.
- **Criar Negócio**: Clique no botão "Add Deal" para registrar uma nova oportunidade, associando-a a um contato ou empresa.

### 2. Contatos
Gerencie as pessoas com quem você faz negócios.
- **Listagem**: Visualize todos os seus contatos cadastrados.
- **Adicionar Contato**: Registre nome, email e outros detalhes de novos clientes.

### 3. Empresas
Gerencie as organizações dos seus clientes.
- **Listagem**: Visualize as empresas parceiras ou clientes.
- **Adicionar Empresa**: Registre dados corporativos para associar a negócios e contatos.

---

## ⚙️ Configurações da Conta e Workspace

Acesse o menu de configurações para personalizar sua experiência.

### Configurações de Perfil
- **Nome e Email**: Atualize seus dados pessoais.
- **Idioma**: Selecione seu idioma de preferência (**Português** ou **Inglês**). A interface se adaptará automaticamente.
- **ID da Conta**: Visualize seu ID único para suporte ou integrações.
- **Desativar Conta**: Opção para excluir permanentemente sua conta pessoal.

### Configurações do Workspace
- **Geral**: Altere o nome e o slug do workspace.
- **Membros da Equipe**: Convide novos membros por email para colaborar no seu workspace.
- **Domínio**: Configure domínios personalizados (funcionalidade avançada).
- **Excluir Workspace**: Encerre o workspace e remova todos os dados associados.

### Faturamento (Billing)
- Gerencie sua assinatura (Free, Standard, Premium).
- Visualize faturas e métodos de pagamento integrados via Stripe.

---

## 🛠 Funcionalidades Técnicas (Para Desenvolvedores)

- **Tech Stack**: Next.js, Prisma, PostgreSQL, Tailwind CSS.
- **API**: O projeto possui endpoints de API organizados em `src/pages/api`.
- **Validação**: Todas as entradas de API são validadas para garantir segurança.
- **Internacionalização (i18n)**: Suporte nativo a múltiplos idiomas.

---

*Este manual reflete a versão atual do sistema. Novas funcionalidades como Inbox e Chat estão em desenvolvimento.*
