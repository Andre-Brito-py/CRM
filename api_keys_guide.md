# Guia de Configuração de Chaves de API (Vysify)

Para o Vysify funcionar 100%, você precisará configurar as seguintes chaves. A maioria pode ser configurada diretamente pelo **Painel Super Admin**, mas algumas são fundamentais para o "bootcamp" do sistema e devem ir no arquivo [.env](file:///c:/Users/Usu%C3%A1rio/Documents/novo/nextacular/.env).

## 1. Configuração Obrigatória (Direto no Código / .env)
Estas chaves são essenciais para o servidor iniciar e para o banco de dados funcionar. **Não podem ser configuradas pelo painel.**

| Chave | Descrição | Onde conseguir |
| :--- | :--- | :--- |
| `DATABASE_URL` | Conexão com o PostgreSQL | Seu provedor de banco (ex: Supabase, Railway, Neon) |
| `NEXTAUTH_SECRET` | Segurança da sessão | Gere uma string aleatória (ex: `openssl rand -base64 32`) |
| `CONFIG_ENCRYPTION_KEY` | Chave para criptografar segredos no banco | Gere uma string aleatória forte |
| `APP_URL` | URL base do app | `https://seu-dominio.com` |

---

## 2. Configurações via Painel Super Admin (`/admin/settings`)
Estas chaves podem ser salvas e alteradas em tempo real através da interface administrativa.

### 🛡️ Pagamentos e Assinaturas (Stripe)
Necessário para cobrar as assinaturas dos seus clientes do Vysify.
*   **Stripe Secret Key (`PAYMENTS_SECRET_KEY`)**: [Stripe Dashboard > API Keys](https://dashboard.stripe.com/apikeys)
*   **Stripe Webhook Secret (`STRIPE_WEBHOOK_SECRET`)**: No Stripe, crie um webhook apontando para `https://seu-dominio.com/api/webhooks/stripe`. O secret será gerado lá.

### 🤖 Inteligência Artificial (OpenAI)
Para as funções de resumos de conversa, sugestões e automações.
*   **OpenAI API Key (`OPENAI_API_KEY`)**: [OpenAI Platform](https://platform.openai.com/api-keys)

### 📧 Email (SMTP)
Para envio de links de confirmação e recuperação de senha.
*   **SMTP User/Password**: Use um serviço como [Resend](https://resend.com), [Postmark](https://postmarkapp.com) ou [SendGrid](https://sendgrid.com).

### ☁️ Armazenamento de Arquivos (AWS S3)
Para uploads de mídias, fotos de perfil e documentos.
*   **AWS Access Key / Secret**: [AWS IAM Console](https://console.aws.amazon.com/iam/home#/users)
*   **Bucket Name**: Nome do seu bucket S3.

### 🏠 Domínios Personalizados (Vercel)
Se você permitir que seus clientes usem domínios próprios.
*   **Vercel Auth Token**: [Vercel Account Settings > Tokens](https://vercel.com/account/tokens)
*   **Vercel Project/Team ID**: Disponível no dashboard do seu projeto na Vercel.

### 📝 Nota Fiscal (Focus NFe)
Para emissão automática de NF-e para seus clientes (Brasil).
*   **Focus NFe API Key**: [Focus NFe Dashboard](https://focusnfe.com.br/)

---

## 💡 Dica Importante
> [!TIP]
> Ao configurar chaves no **Painel Super Admin**, elas são criptografadas no banco de dados usando sua `CONFIG_ENCRYPTION_KEY`. Isso garante que, mesmo que o banco de dados seja exposto, suas chaves de API permaneçam seguras.

## Verificação
Após inserir as chaves no painel, clique em **"Salvar"**. Você pode usar o botão **"Validar Stripe"** no painel de configurações para testar se a integração com o gateway está funcionando corretamente.
