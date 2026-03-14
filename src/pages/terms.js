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

        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Aceite</h2>
        <p className="mb-4">
          Ao criar uma conta, acessar ou utilizar a plataforma {companyName} (&quot;Plataforma&quot;), você declara ter lido,
          compreendido e aceito estes Termos de Uso (&quot;Termos&quot;). Se você não concordar com estes Termos, não utilize
          a Plataforma.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Quem Somos e Contato</h2>
        <p className="mb-4">
          A Plataforma é operada por {companyName}. Para suporte e solicitações, utilize: <span className="font-bold">{supportEmail}</span>.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Descrição do Serviço</h2>
        <p className="mb-4">
          A Plataforma oferece ferramentas de CRM, funil de vendas, automações e recursos de comunicação omnichannel, incluindo integrações com
          serviços de terceiros. Recursos e limites podem variar conforme o plano contratado.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Cadastro e Conta</h2>
        <p className="mb-4">
          Você deve fornecer informações verdadeiras e atualizadas e manter a confidencialidade de suas credenciais. Você é responsável por todas
          as atividades realizadas sob sua conta e por garantir que o uso da Plataforma ocorra em conformidade com a legislação aplicável.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Planos, Pagamentos e Faturamento</h2>
        <p className="mb-4">
          Planos pagos são cobrados de forma recorrente e antecipada, conforme periodicidade indicada no momento da contratação. A contratação pode
          exigir a inclusão de um método de pagamento válido (ex.: cartão de crédito). Promoções, cupons e condições especiais podem ser aplicadas
          conforme regras vigentes.
        </p>
        <p className="mb-4">
          O processamento de pagamentos e a gestão de assinatura podem ser realizados por provedor terceirizado (ex.: Stripe), sujeito também aos termos
          do respectivo provedor. Podemos disponibilizar um portal de cobrança para que você gerencie método de pagamento, cancelamento e alterações.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Mudança de Plano (Upgrade e Downgrade)</h2>
        <p className="mb-4">
          Você pode solicitar a alteração do seu plano a qualquer momento. Em upgrades, a alteração pode ocorrer imediatamente. Em downgrades (mudança
          para um plano inferior), você mantém os recursos e limites do plano superior até a próxima data de cobrança (tipicamente em até 30 dias),
          quando a alteração passa a valer e o valor cobrado será ajustado.
        </p>
        <p className="mb-4">
          Em upgrades, podem existir cobranças proporcionais (prorrata) para refletir o tempo restante do ciclo atual, conforme regras do provedor de
          pagamento e configurações aplicáveis.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">6.1 Cancelamento, Reembolsos e Impostos</h2>
        <p className="mb-4">
          Você pode solicitar o cancelamento a qualquer momento. Salvo disposição legal obrigatória em sentido diverso, o cancelamento normalmente passa
          a valer ao final do período já pago, e não há reembolso automático de valores já cobrados. Impostos podem ser aplicáveis conforme sua
          localidade e informações de cobrança fornecidas, podendo constar em faturas e recibos.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Uso Aceitável</h2>
        <p className="mb-4">
          É proibido utilizar a Plataforma para fins ilícitos, enviar spam, explorar vulnerabilidades, ou violar políticas de terceiros (por exemplo,
          políticas do WhatsApp/Meta, e regras de provedores de e-mail). Podemos aplicar limitações técnicas, suspender recursos ou contas e cooperar com
          autoridades quando necessário.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Dados e Privacidade</h2>
        <p className="mb-4" id="privacidade">
          Ao utilizar a Plataforma, você pode inserir dados pessoais de terceiros (por exemplo, contatos). Você se compromete a possuir base legal para
          o tratamento desses dados e a utilizá-los de forma responsável. A Plataforma pode adotar medidas técnicas para segurança e conformidade, e poderá
          restringir acessos em caso de uso indevido.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">9. Propriedade Intelectual</h2>
        <p className="mb-4">
          A Plataforma, suas marcas, design e código são protegidos por direitos de propriedade intelectual. Estes Termos não concedem licença ou cessão
          além do direito limitado de uso conforme o plano contratado e estes Termos.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">10. Suspensão e Encerramento</h2>
        <p className="mb-4">
          Podemos suspender ou encerrar o acesso à Plataforma em caso de violação destes Termos, fraude, tentativa de abuso, ou por exigência legal. Você
          pode encerrar o uso a qualquer momento, observadas as condições de pagamento aplicáveis ao seu plano.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">11. Limitação de Responsabilidade</h2>
        <p className="mb-4">
          Na extensão máxima permitida pela lei, {companyName} não será responsável por danos indiretos, lucros cessantes, perda de dados ou interrupções
          decorrentes do uso da Plataforma, inclusive quando causados por falhas de terceiros, integrações, provedores de infraestrutura ou serviços externos.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">12. Alterações destes Termos</h2>
        <p className="mb-4">
          Podemos atualizar estes Termos periodicamente. A versão vigente estará sempre disponível nesta página. Alterações relevantes podem ser comunicadas
          por meios razoáveis, e o uso continuado da Plataforma após a atualização pode indicar aceitação.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">13. Lei Aplicável e Foro</h2>
        <p className="mb-4">
          Estes Termos são regidos pelas leis aplicáveis do Brasil. Fica eleito o foro competente para dirimir eventuais controvérsias, salvo disposições
          legais obrigatórias em sentido diverso.
        </p>
      </main>
      <Footer />
    </LandingLayout>
  );
};

export default TermsOfUse;
