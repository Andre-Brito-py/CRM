# Go-Live Checklist - Closify

Preparar o lançamento de um projeto SaaS exige atenção a detalhes críticos de segurança, performance e experiência do usuário. Aqui está seu checklist personalizado:

## 1. Configurações de Ambiente (Production)
> [!IMPORTANT]
> Certifique-se de que todas as variáveis `process.env` estão configuradas no seu provedor de hospedagem (ex: Vercel).

- [ ] **DATABASE_URL**: Apontando para o banco de produção (evite usar o mesmo de dev).
- [ ] **NEXTAUTH_URL**: Deve ser o seu domínio oficial (ex: `https://app.closify.com.br`).
- [ ] **NEXTAUTH_SECRET**: Uma chave forte e secreta.
- [ ] **APP_URL**: Definida corretamente para que links em e-mails e webhooks funcionem.

## 2. E-mails e Comunicação
- [ ] **Provedor SMTP Real**: Substitua as configurações de log/teste por um serviço como SendGrid, Postmark ou Amazon SES.
- [ ] **EMAIL_FROM**: Use um e-mail do seu domínio (ex: `suporte@closify.com.br`).
- [ ] **SPF/DKIM/DMARC**: Configure os registros DNS do seu domínio para garantir que os e-mails não caiam no spam.

## 3. Pagamentos e Assinaturas (Stripe)
- [ ] **Live Mode**: Troque as chaves de `test` para `live`.
- [ ] **Webhook Secret**: Atualize o segredo do webhook no painel do Stripe para apontar para a URL de produção.
- [ ] **Product/Price IDs**: Garanta que os IDs dos planos no banco de dados correspondam aos IDs "Live" do Stripe.

## 4. Banco de Dados e Infraestrutura
- [ ] **Prisma Migrate**: Execute `npx prisma migrate deploy` no pipeline de deploy.
- [ ] **Backups**: Ative backups automáticos diários para o banco de dados.
- [ ] **SSL/HTTPS**: Certifique-se de que o site está rodando apenas sob HTTPS.

## 5. Experiência e Segurança
- [ ] **Logos e Favicons**: Verifique se todos os ativos visuais (como o e-mail que acabamos de atualizar) estão carregando corretamente com URLs absolutas.
- [ ] **Páginas Legais**: Termos de Uso e Política de Privacidade devem estar acessíveis no rodapé.
- [ ] **Monitoramento de Erros**: Considere instalar o **Sentry** para capturar erros em tempo real que os usuários possam encontrar.

---
🚀 **Boa sorte com o lançamento!** O Closify está pronto para brilhar.
