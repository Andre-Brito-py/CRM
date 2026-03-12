# Nextacular CRM

Este repositório é privado.

Não é um projeto “open source”, nem algo feito para ser bonito para outras pessoas. É o meu caderno de obra: decisões, dúvidas, lembretes e as partes que eu não posso esquecer quando eu estiver cansado e achar que “já sei”.

## O que eu estou construindo (em uma frase)
Um CRM omnichannel para vender, atender e acompanhar clientes sem virar refém de planilha.

## Por que isso existe
- Quero abrir um negócio com isso.
- Preciso de uma plataforma que eu controle (produto, dados e evolução).
- A meta é simples: resolver dor real com uma experiência sólida.

## Regras internas (pra eu não me sabotar)
- Nada de credenciais no código/repo.
- Tudo que for “admin master” tem que ser auditável e seguro.
- Se uma feature não tiver métrica/uso, ela não existe (não investir tempo sem validar).
- Melhor pequeno e funcionando do que grande e incompleto.

## Como rodar local
Pré-requisitos: Node.js 18+, Postgres.

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Se a porta 3000 estiver ocupada, o Next sobe em outra (3001/3002…). Conferir o log do terminal.

## Variáveis de ambiente (lembrete)
Arquivo: `.env`

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
EMAIL_FROM="..."
EMAIL_SERVER="smtp://..."
STRIPE_SECRET_KEY="..."
STRIPE_WEBHOOK_SECRET="..."
ADMIN_EMAIL="..."
```

## Coisas que já estão no produto (resumo curto)
- Workspaces (multi-tenant)
- Deals + pipeline kanban
- Contatos/empresas + atividades
- Inbox omnichannel (WhatsApp)
- Login (magic link + senha) + 2FA
- Paywall por plano e painel de super admin
- Customer Satisfaction (NPS): páginas + gráficos com animação

## Próximas decisões (anotar antes de codar)
- Qual é o ICP real (quem paga)?
- Qual é o MVP que dá pra cobrar rápido?
- Onde eu preciso ser “10/10” e onde “bom o suficiente” resolve?

## Notas rápidas (pra lembrar depois)
- Se aparecer 404 em páginas do admin, confirmar em qual porta o dev server subiu.
- Se aparecer Unauthorized em ação de admin, checar sessão/cookie e rota usada.

---

## 📄 Licença

Este projeto é licenciado sob a **MIT License** — veja o arquivo [LICENSE](LICENSE) para detalhes.

---

<div align="center">
  Feito com ❤️ por <a href="https://github.com/Andre-Brito-py">Andre Brito</a>
</div>
