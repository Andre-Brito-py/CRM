import Meta from '@/components/Meta/index';
import { LandingLayout } from '@/layouts/index';
import { Footer } from '@/sections/index';

const PrivacyPolicy = () => {
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Nextacular CRM';
  const privacyEmail =
    process.env.NEXT_PUBLIC_PRIVACY_EMAIL ||
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
    'privacy@example.com';
  const privacyVersion = '2026-03-13';
  const lastUpdated = '13/03/2026';

  return (
    <LandingLayout>
      <Meta
        title="Política de Privacidade - Nextacular CRM"
        description="Política de Privacidade da plataforma Nextacular CRM."
      />
      <main className="max-w-4xl mx-auto px-6 py-20 text-gray-800">
        <h1 className="text-4xl font-bold mb-8">Política de Privacidade</h1>
        <p className="mb-1">Versão: {privacyVersion}</p>
        <p className="mb-8">Última atualização: {lastUpdated}</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Controladora e Contato</h2>
        <p className="mb-4">
          Esta Política descreve como {companyName} trata dados pessoais no contexto do uso da plataforma. Para dúvidas, solicitações e
          exercício de direitos, entre em contato pelo e-mail: <span className="font-bold">{privacyEmail}</span>.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Dados que Coletamos</h2>
        <p className="mb-4">
          Podemos coletar:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Dados de cadastro (nome, e-mail, credenciais e preferências).</li>
          <li>Dados de cobrança e assinatura (status do plano, identificadores de pagamento e histórico).</li>
          <li>Dados operacionais do CRM inseridos pelo usuário (contatos, empresas, negócios, tarefas e mensagens).</li>
          <li>Dados técnicos (logs, endereço IP, identificadores de dispositivo e métricas de uso para segurança e performance).</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Finalidades e Bases Legais</h2>
        <p className="mb-4">
          Tratamos dados pessoais para prestar e aprimorar o serviço, operar recursos contratados, garantir segurança, cumprir obrigações legais e
          viabilizar cobrança. As bases legais podem incluir execução de contrato, cumprimento de obrigação legal/regulatória, legítimo interesse e,
          quando aplicável, consentimento.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Compartilhamento e Operadores</h2>
        <p className="mb-4">
          Não vendemos dados pessoais. Podemos compartilhar dados com fornecedores (operadores) estritamente para operar a plataforma, por exemplo:
          processamento de pagamentos, disparo de e-mails, hospedagem, armazenamento, analytics e integrações solicitadas (como WhatsApp/Meta e IA).
          Esses fornecedores devem tratar os dados conforme nossas instruções e com medidas de segurança adequadas.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Transferências Internacionais</h2>
        <p className="mb-4">
          Alguns fornecedores podem operar fora do Brasil. Quando houver transferência internacional, adotamos salvaguardas apropriadas, conforme
          legislação aplicável, buscando garantir um nível de proteção adequado.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Retenção e Exclusão</h2>
        <p className="mb-4">
          Mantemos dados pelo tempo necessário para cumprir as finalidades desta Política e obrigações legais/regulatórias. Você pode solicitar
          exportação e remoção de dados conforme os recursos disponibilizados na plataforma e/ou pelo canal de contato.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Direitos do Titular</h2>
        <p className="mb-4">
          Conforme a LGPD, você pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade e
          informações sobre compartilhamentos. Para exercer direitos, utilize <span className="font-bold">{privacyEmail}</span>.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Segurança</h2>
        <p className="mb-4">
          Adotamos medidas técnicas e organizacionais razoáveis para proteger dados pessoais contra acessos não autorizados, perda, alteração e
          destruição. Nenhuma medida é absoluta, e recomendamos boas práticas de segurança no uso de credenciais e integrações.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">9. Atualizações desta Política</h2>
        <p className="mb-4">
          Esta Política pode ser atualizada periodicamente. A versão vigente estará sempre disponível nesta página, com indicação de versão e data.
        </p>
      </main>
      <Footer />
    </LandingLayout>
  );
};

export default PrivacyPolicy;
