import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

import Meta from '@/components/Meta/index';
import { LandingLayout } from '@/layouts/index';
import { Footer } from '@/sections/index';

const TermsOfUse = () => {
  const router = useRouter();
  const { status, data: session, update } = useSession();
  const [isAccepting, setAcceptingState] = useState(false);
  const companyName =
    process.env.NEXT_PUBLIC_COMPANY_NAME || 'Nextacular CRM';
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@example.com';
  const termsVersion = process.env.NEXT_PUBLIC_TERMS_VERSION || '2026-03-13';
  const lastUpdated = '13/03/2026';

  const acceptedAt = session?.user?.termsAcceptedAt || null;
  const acceptedVersion = session?.user?.termsVersion || null;
  const mustAcceptTerms =
    status === 'authenticated' && (!acceptedAt || acceptedVersion !== termsVersion);

  const handleAcceptTerms = async () => {
    if (isAccepting) return;
    setAcceptingState(true);
    try {
      const response = await fetch('/api/legal/accept-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        setAcceptingState(false);
        return;
      }

      if (typeof update === 'function') {
        try {
          await update();
        } catch { }
      }

      const nextParam = router.query?.next ? String(router.query.next) : null;
      const destination = nextParam || '/account';
      router.push(destination);
    } finally {
      setAcceptingState(false);
    }
  };

  return (
    <LandingLayout>
      <Meta
        title="Termos de Uso - Nextacular CRM"
        description="Termos de Uso da plataforma Nextacular CRM."
      />
      <main className="max-w-4xl mx-auto px-6 py-20 text-gray-800">
        {mustAcceptTerms && (
          <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-amber-900">
                Para continuar usando a plataforma, você precisa aceitar os Termos de Uso (versão {termsVersion}).
              </div>
              <button
                type="button"
                onClick={handleAcceptTerms}
                disabled={isAccepting}
                className="inline-flex items-center justify-center rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {isAccepting ? 'Aceitando...' : 'Aceitar Termos'}
              </button>
            </div>
          </div>
        )}
        <h1 className="text-4xl font-bold mb-8">Termos de Uso</h1>
        <p className="mb-1">Versão: {termsVersion}</p>
        <p className="mb-8">Última atualização: {lastUpdated}</p>

        <section className="prose prose-blue max-w-none text-gray-600">
          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">1. Introdução e Aceite</h2>
          <p className="mb-4">
            Estes Termos de Uso (&quot;Termos&quot;) representam um acordo legal vinculativo entre você, a empresa ou entidade
            que representa (&quot;Cliente&quot; ou &quot;Usuário&quot;) e a <strong>{companyName}</strong>. 
            Ao criar uma conta, acessar ou utilizar a nossa plataforma de software como serviço (SaaS), API e serviços correlatos 
            (&quot;Plataforma&quot;), você declara possuir capacidade legal (ou poderes de representação de sua empresa) e 
            aceita incondicionalmente estes Termos e a nossa Política de Privacidade.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">2. Descrição e Provisão do Serviço</h2>
          <p className="mb-4">
            O <strong>{companyName}</strong> é uma plataforma B2B que fornece ferramentas de CRM, gestão de funis de venda, 
            automações (workflows), relatórios analíticos, caixas de entrada omnichannel (suporte) e formulários de captura de leads.
          </p>
          <p className="mb-4">
            <strong>2.1 Disponibilidade:</strong> Nós nos esforçamos para oferecer um SLA (Service Level Agreement) de disponibilidade
            técnica comercialmente razoável, porém não oferecemos garantia absoluta de disponibilidade. Ocasionalmente, haverá
            manutenções programadas que serão comunicadas previamente na medida do possível.
          </p>
          <p className="mb-4">
            <strong>2.2 Modificações:</strong> Nós reservamos o direito de aprimorar, adicionar, remover ou descontinuar
            recursos da Plataforma sem aviso prévio para refletir a evolução tecnológica da ferramenta.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">3. Uso Aceitável (Acceptable Use Policy)</h2>
          <p className="mb-4">
            Ao utilizar a Plataforma, você concorda expressamente em <strong>não</strong>:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Utilizar os serviços para fins ilícitos, fraudulentos ou para armazenamento de dados proibidos pela legislação (como dados de pedofilia, apologia ao crime, terrorismo, etc).</li>
            <li>Praticar envios massivos de mensagens não solicitadas (SPAM) ou violar as políticas Anti-Spam (CAN-SPAM) e diretrizes de parceiros integrados, como a API do WhatsApp (Meta).</li>
            <li>Tentar realizar engenharia reversa, &quot;scrapping&quot; abusivo da nossa estrutura ou tentar contornar limitações tecnológicas ou financeiras impostas pelos planos.</li>
            <li>Compartilhar acessos (logins e senhas). Cada usuário deve possuir uma credencial nominal e intransferível no Workspace.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">4. Dados e Compliance (LGPD e GDPR)</h2>
          <p className="mb-4">
            Nos moldes da <strong>Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018)</strong> e da <strong>GDPR</strong>, 
            é fundamental estabelecer os papéis legais das partes envolvidas:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Você (Cliente) atua como Controlador:</strong> É sua responsabilidade garantir a licitude dos dados (leads, contatos de clientes) que você insere na Plataforma. Você deve assegurar que obteve consentimento, legítimo interesse ou outra base legal válida para processar os dados dessas pessoas dentro do nosso CRM.</li>
            <li><strong>{companyName} atua como Operadora:</strong> Nossa função restringe-se ao processamento tecnológico, hospedagem e estrutura sistêmica dos dados guiados por você, não consumindo seus leads de forma independente para finalidades próprias.</li>
          </ul>
          <p className="mb-4">
            <strong>4.1 Notificações e Incidentes:</strong> Caso ocorra qualquer suspeita técnica de vazamentos, as partes concordam
            em notificar-se mutuamente em prazos razoáveis para cooperarem junto às Agências Reguladoras de Proteção de Dados (ANPD).
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">5. Comercial, Faturamento e Planos</h2>
          <p className="mb-4">
            O uso profissional da Plataforma requer a assinatura de Planos Pagos de forma pré-paga e automática.
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Cobranças:</strong> Os valores correspondentes à sua licença SaaS serão faturados periodicamente (mensalmente ou anualmente) e processados pelo provedor Stripe. Impostos cabíveis serão emitidos nas Notas Fiscais correspondentes.</li>
            <li><strong>Upgrade/Downgrade:</strong> Migrações de planos são imediatas. Downgrades mantêm a franquia e os recursos do plano antigo até o último dia vigente do ciclo atual de faturamento. Extensões (&quot;add-ons&quot;) de inteligência artificial requerem crédito em conta sob demanda, ou compra de pacotes adicionais.</li>
            <li><strong>Inadimplência:</strong> O não pagamento até a data de vencimento poderá acarretar bloqueio sistêmico com carência limitada de acesso (&quot;Grace Period&quot;), e após 60 (sessenta) dias, o espaço hospedado bem como todos os dados, regras e fluxos poderão entrar em purga técnica definitiva (exclusão).</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">6. Limitação de Responsabilidade</h2>
          <p className="mb-4 text-sm bg-gray-50 border-l-4 border-gray-300 p-4">
            Na máxima extensão permitida por lei, o <strong>{companyName}</strong> NÃO responderá por: (a) lucros cessantes ou prejuízos indiretos pela sua impossibilidade momentânea de fechar negócios por indisponibilidade técnica da máquina; (b) dados inseridos ou corrompidos por operadores na sua conta do Workspace; e (c) quebra das políticas da API Oficial do Whatsapp com o Meta que resultem ao banimento de seus números telefônicos - tendo em vista que o conteúdo enviado por seus agentes comerciais não está sob nosso escrutínio prévio.
            Nossa responsabilidade civil decorrente deste contrato nunca será superior aos valores que você nos pagou para hospedar a licença durante os últimos 6 (seis) meses faturados.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">7. Rescisão e Exportação de Dados (Exit Strategy)</h2>
          <p className="mb-4">
            O Cliente poderá rescindir a assinatura a qualquer tempo cessando os faturamentos seguintes a partir da rescisão pelo Painel de Custos (Billing).
            Considerando a legislação de Portabilidade de Dados, o Cliente terá os mecanismos em &quot;Advanced Settings&quot; para <strong>exportar a integralidade de seus dados da plataforma (via JSON)</strong> antes do bloqueio definitivo da conta se assim desejar.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">8. Disposições Finais</h2>
          <p className="mb-4">
            <strong>Foro:</strong> Fica eleito o foro da sede do {companyName} no Brasil, com exclusão de qualquer outro, por mais privilegiado que seja,
            para dirimir quaisquer litígios ou omissões relativas à interpretação destes Termos.
          </p>
          <p className="mb-4">
            <strong>Alterações:</strong> O {companyName} garante o envio via e-mail e exibirá notificações em tela quando atualizações materiais a estes
            contratos de termos de uso ocorrerem.
          </p>
        </section>
      </main>
      <Footer />
    </LandingLayout>
  );
};

export default TermsOfUse;
