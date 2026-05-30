# Manual do Usuário - Vysify

Bem-vindo ao **Vysify**, uma plataforma SaaS completa para gerenciamento de workspaces, equipes e CRM. Este manual descreve todas as funcionalidades disponíveis no sistema para ajudá-lo a aproveitar ao máximo a ferramenta.

## 🚀 Primeiros Passos

### Autenticação (Login)
O Vysify utiliza um sistema de autenticação seguro via **Magic Link** (Link Mágico), eliminando a necessidade de senhas complexas.
1. Acesse a página de login.
2. Insira seu endereço de e-mail.
3. Clique em "Send the Magic Link".
4. Verifique sua caixa de entrada e clique no link recebido para entrar automaticamente.

---

## 🏢 Workspaces (Áreas de Trabalho)

Os Workspaces são o núcleo da organização no Vysify. Tudo o que você cria (contatos, negócios, configurações) pertence a um workspace específico.

### Criar um Workspace
Ao entrar pela primeira vez, você será guiado para criar seu primeiro workspace.
- **Nome**: O nome visível da sua empresa ou projeto.
- **Slug**: O identificador único na URL (ex: `app.nextacular.com/account/meu-projeto`).

### Alternar entre Workspaces
Se você pertence a múltiplas equipes, pode alternar entre elas clicando no nome do workspace atual no menu lateral e selecionando outro na lista.

---

## 📊 CRM (Gestão de Relacionamento)

O Vysify inclui um CRM integrado para gerenciar suas vendas e relacionamentos comerciais.

### 1. Pipeline (Funil de Vendas)
O Pipeline é um quadro **Kanban** visual para gerenciar seus negócios (Deals).
- **Visualização**: Colunas representando estágios (Lead, Qualificado, Negociação, Fechado, Perdido).
- **Drag-and-Drop**: Arraste e solte os cartões de negócios entre as colunas para atualizar o estágio.
- **Criar Negócio**: Clique no botão "Add Deal" para registrar uma nova oportunidade, associando-a a um contato ou empresa.

### 2. Contatos
Gerencie as pessoas com quem você faz negócios.
- **Listagem**: Visualize todos os seus contatos cadastrados.
- **Adicionar Contato**: Registre nome, email e outros detalhes de novos clientes.

### 4. Dashboard (Painel de Controle)
Uma visão geral completa do seu workspace.
- **Stat Cards**: Métricas chave como Total de Contatos, Negócios Abertos/Fechados e Receita total.
- **Activity Feed**: Um registro cronológico de todas as ações importantes realizadas no sistema (ex: criação de negócios, contatos, atualizações).
- **Sales Performance**: Gráfico visual mostrando o volume de vendas (negócios ganhos) nos últimos 6 meses.

### 5. Inbox (Central de Mensagens)
Gerencie todas as suas conversas em um único lugar.
- **Lista de Conversas**: Visualize chats ativos com contatos, com indicadores de novas mensagens e tempo desde a última interação.
- **Janela de Chat**: Troque mensagens de texto em tempo real.
- **Integração Futura**: Esta interface será conectada ao WhatsApp Business API para comunicação externa.

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

## 🛡️ Painel de Super Admin

O Vysify possui um painel administrativo exclusivo para gestão da plataforma, acessível apenas para usuários com função de **Super Admin**.

### Acesso
O painel é acessado através de uma conta com privilégios elevados (ex: `admin@nextacular.com`). O login segue o mesmo padrão via **Magic Link**.

### Dashboard Geral
Ao acessar o painel, o administrador tem uma visão geral da saúde do sistema, incluindo:
- Lista de usuários recentes cadastrados.
- Visualização rápida dos planos de assinatura de cada usuário.

### Gestão de Usuários
Na seção **Users**, o administrador tem controle total sobre a base de usuários:
- **Listagem Completa**: Visualize todos os usuários, seus e-mails, datas de cadastro e planos (Free, Standard, Premium).
- **Ações de Gestão**:
    - **Suspender (Suspend)**: Bloqueia o acesso do usuário à plataforma temporariamente.
    - **Reativar (Reactivate)**: Restaura o acesso de um usuário suspenso.
    - **Deletar (Delete)**: Remove o usuário do sistema (soft delete), mantendo integridade histórica mas revogando acesso.
    - **Impersonate**: Acesse a conta de um usuário como se fosse ele para suporte e diagnóstico.
    *Nota: Por segurança, não é possível suspender ou deletar outros Super Admins.*

### Pagamentos (Payments)
A seção **Payments** oferece uma visão financeira centralizada:
- Histórico de transações recentes.
- Identificação de clientes e seus planos associados.
- Detalhes de IDs de pagamento para auditoria.

### Gestão de Workspaces
Visualize e gerencie todos os workspaces criados na plataforma, independentemente do proprietário.

### Configurações de API (Novo)
O Super Admin pode gerenciar chaves de API e configurações sensíveis do sistema (como Stripe Keys, OpenAI API Key, Email Server) diretamente pelo painel, sem precisar editar arquivos de ambiente ou reiniciar o servidor.

- **Acesso**: Menu lateral > **API Settings**.
- **Adicionar Chave**:
    1. Selecione a categoria (Geral, Pagamento, Email, IA).
    2. Insira o nome da chave (ex: `STRIPE_SECRET_KEY`).
    3. Insira o valor da chave.
    4. Clique em "Add Configuration".
- **Visualização**: As chaves são armazenadas de forma segura e os valores são ocultados por padrão (exibidos como `••••••••`). Clique no ícone de olho para revelar.
- **Prioridade**: O sistema prioriza as configurações definidas no painel sobre as variáveis de ambiente (`.env`), permitindo atualizações em tempo real.

### Monitoramento de Sistema
Visualize o status de saúde da aplicação em tempo real:
- **Database Status**: Conectividade com o banco de dados.
- **System Uptime**: Tempo de atividade do servidor.
- **Memory Usage**: Uso de memória RAM do processo.
- **Response Time**: Latência média das requisições.

---

## 🚀 Funcionalidades No-Code (Automações e Personalização)

O Vysify foi projetado para permitir que você personalize o CRM e automatize processos sem escrever uma única linha de código.

### 1. Campos Personalizados (Custom Fields)
Você pode estender os dados padrão de Contatos e Negócios para atender às necessidades específicas do seu negócio.

- **Tipos de Campos**: Texto, Número, Data, Seleção Única/Múltipla, Moeda e Área de Texto.
- **Variáveis Dinâmicas**: Use o valor desses campos em qualquer template de mensagem ou tarefa usando a sintaxe `{{contact.customFields.nome_do_campo}}`.
- **Escopo**: Defina se o campo deve aparecer apenas em Contatos, apenas em Negócios (Deals) ou em ambos.

> [!TIP]
> **Dica de Uso**: Crie um campo "Score do Lead" para priorizar contatos automaticamente via automações baseadas no valor inserido.

### 2. Motor de Automações
Localizado em **Configurações > Automações**, este módulo permite criar regras "Se ISSO acontecer, ENTÃO faça AQUILO".

#### Gatilhos (Quando disparar?)
- **Mensagem Recebida**: Dispara quando um contato envia uma mensagem via WhatsApp, Instagram ou Email.
- **Tag Adicionada**: Quando você (ou o sistema) aplica uma etiqueta a um contato.
- **Mudança de Estágio**: Quando um negócio é movido de uma coluna para outra no Funil.
- **Quebra de SLA**: Dispara se um cliente ficar sem resposta por mais de 15 minutos.
- **Inatividade**: Dispara se o cliente não responder após um determinado número de dias.

#### Ações (O que fazer?)
- **Enviar Mensagem (WhatsApp/Email)**: Envie respostas automáticas baseadas em templates.
- **Resposta com IA (Autopilot)**: O sistema usa o contexto da sua empresa para responder de forma inteligente.
- **Mover Negócio**: Avance ou retorne um negócio no funil automaticamente.
- **Criar Tarefa**: Gere pendências fixas para a equipe (ex: "Ligar para cliente urgente").
- **Distribuir Lead**: Atribua o contato automaticamente a um membro disponível da equipe.
- **Notificar Equipe**: Envie alertas internos para garantir que ninguém perca uma oportunidade.
- **Ações em Massa**: Configure sequências de ações com atrasos (ex: Esperar 2 horas e então enviar e-mail).

> [!IMPORTANT]
> **Simulação**: Antes de ativar uma regra para todos os clientes, utilize o botão **"Simular"** para testar se as condições e variáveis dinâmicas estão funcionando como esperado.

---

## 🔌 Integrações Avançadas e Zapier

O Vysify permite que você conecte o CRM a mais de 5.000 aplicativos através do Zapier ou Make.

### Integração com Zapier vía Webhooks
Não é necessário um "App" na loja do Zapier. Como o sistema é No-Code, ele se conecta via **Webhooks de Entrada**.

1. No Zapier, crie um **Trigger** do tipo "Webhooks by Zapier" e selecione "Catch Webhook".
2. Copie a URL gerada pelo Zapier.
3. No Vysify, crie uma **Automação** e escolha a ação **"Enviar para Webhook (Zapier)"**.
4. Cole a URL do Zapier.
5. Agora, sempre que o gatilho da automação ocorrer, os dados completos do contato e do negócio serão enviados para o Zapier em tempo real.

---

## 🔌 Guia de Integrações

Este guia detalha como conectar seus canais de comunicação externos ao Vysify.

> **Como chegar à tela de Integrações no Vysify:**
> 1. No menu superior, clique em **Área de Trabalho**
> 2. Na barra lateral esquerda, clique em **INTEGRAÇÕES**

### 1. WhatsApp Cloud API (Official)
Para conectar seu WhatsApp, você deve utilizar a API oficial da Meta.

**Etapa 1 — Configuração na Meta (developers.facebook.com):**
1. Crie uma conta de desenvolvedor em [developers.facebook.com](https://developers.facebook.com/).
2. Crie um App do tipo **Business** e selecione o caso de uso **"Conectar no WhatsApp"**.
3. Vá em **Casos de uso → Conectar no WhatsApp → Configuração da API**.
4. Na tela, você encontrará:
   - **Identificação do número de telefone** → *Phone Number ID*
   - **Identificação da conta do WhatsApp Business** → *Business Account ID*
   - **Token de acesso** → clique em **"Copiar"** ao lado do campo

**Etapa 2 — Configuração no Vysify:**
1. No menu superior, clique em **Área de Trabalho**.
2. Na barra lateral, clique em **INTEGRAÇÕES**.
3. Selecione **WhatsApp** e clique em **Adicionar Número**.
4. Preencha os campos:
   - **Phone Number ID**: Obtido no painel da Meta.
   - **Business Account ID (WABA ID)**: Obtido no painel da Meta.
   - **Access Token**: Copiado do painel da Meta (token temporário de 24h para testes).
   - **Verify Token**: Qualquer texto (ex: `vysify123`) — você usará o mesmo valor no Webhook da Meta.
5. Copie a **URL de Webhook** gerada pelo Vysify.

**Etapa 3 — Configurar Webhook na Meta:**
1. Na Meta, vá em: **Seu App → WhatsApp → Configuração**.
2. Cole a URL de Webhook do Vysify no campo **URL de Callback**.
3. Preencha o **Verify Token** com o mesmo valor que você usou no Vysify.
4. Clique em **Verificar e Salvar**.
5. Em **Webhook Fields**, marque a opção `messages`.

### 2. Email Omnichannel (Inbound)
Receba e responda e-mails diretamente no seu Inbox centralizado.

**Passo a passo:**
1. No menu superior, clique em **Área de Trabalho**.
2. Na barra lateral, clique em **INTEGRAÇÕES** e selecione **Email**.
3. Ative o serviço para gerar sua **URL de Inbound Webhook**.
4. No seu provedor de e-mail transacional (ex: **Postmark**, **SendGrid** ou **Mailgun**):
   - Crie uma regra de **Inbound Webhook**.
   - Cole a URL gerada pelo Vysify.
   - Configure o encaminhamento do seu e-mail corporativo (ex: `ajuda@suaempresa.com`) para o e-mail de entrada do seu provedor.
5. O Vysify processará automaticamente os e-mails recebidos e os transformará em conversas no Inbox.

### 3. Instagram Direct
Vincule suas mensagens do Instagram ao CRM.

**Passo a passo:**
1. Certifique-se de que sua conta do Instagram é **Business** e está vinculada a uma **Página do Facebook**.
2. No menu superior, clique em **Área de Trabalho**.
3. Na barra lateral, clique em **INTEGRAÇÕES** e selecione **Instagram**.
4. Autentique-se via Facebook e conceda as permissões de `instagram_manage_messages`.
5. Selecione a conta do Instagram desejada.
6. As mensagens recebidas via Direct aparecerão automaticamente no seu Inbox.

### 4. Gmail Sync
Sincronize seu histórico de e-mails corporativos.

1. No menu superior, clique em **Área de Trabalho**.
2. Na barra lateral, clique em **INTEGRAÇÕES** e selecione **Gmail**.
3. Clique em **Connect Gmail**.
4. Realize o login na sua conta Google Workspace e autorize o Vysify.
5. O sistema começará a sincronizar seus contatos e histórico de e-mails para as timelines do CRM.

---

## 🛠 Funcionalidades Técnicas (Para Desenvolvedores)

- **Tech Stack**: Next.js 13, Prisma, PostgreSQL, Tailwind CSS.
- **Banco de Dados**: Uso de JSONb para alta performance em campos dinâmicos.
- **API**: Endpoints documentados em `src/pages/api`.
- **Segurança**: Validação rigorosa de sessões e rate limiting em todas as rotas sensíveis.
- **Internacionalização (i18n)**: Suporte nativo a múltiplos idiomas.

---

*Este manual reflete a versão atual do sistema, incluindo o Dashboard, Inbox e o motor de Automações No-Code.*
