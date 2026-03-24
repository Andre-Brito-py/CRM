import Meta from '@/components/Meta/index';
import { LandingLayout } from '@/layouts/index';
import { Footer } from '@/sections/index';

const PrivacyPolicy = () => {
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Vysify CRM';
  const privacyEmail =
    process.env.NEXT_PUBLIC_PRIVACY_EMAIL ||
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
    'privacy@example.com';
  const privacyVersion = '2026-03-13';
  const lastUpdated = '13/03/2026';

  return (
    <LandingLayout>
      <Meta
        title="Política de Privacidade - Vysify CRM"
        description="Política de Privacidade da plataforma Vysify CRM."
      />
      <main className="max-w-4xl mx-auto px-6 py-20 text-gray-800">
        <h1 className="text-4xl font-bold mb-8">Política de Privacidade</h1>
        <p className="mb-1">Versão: {privacyVersion}</p>
        <p className="mb-8">Última atualização: {lastUpdated}</p>

        <section className="prose prose-blue max-w-none text-gray-600">
          <p className="mb-4 text-lg font-medium text-gray-800">
            A privacidade e a estruturação segura dos dados no ambiente B2B são um pilar de integridade operacional do <strong>{companyName}</strong>.
            Garantimos o pleno atendimento da Lei Geral de Proteção de Dados (LGPD - nº 13.709/2018) e em sintonia com os requerimentos de regulações
            internacionais afins, como o GDPR.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">1. Natureza de Atuação Sistêmica (Controlador e Operador)</h2>
          <p className="mb-4">
            Dentro de uma estrutura sistêmica SaaS e B2B, atuamos preponderantemente enquanto <strong>Operadora de Dados</strong> das informações relativas
            aos &quot;Titulares&quot; (ex.: clientes e leads da <em>sua</em> empresa). No que tange as informações que coletamos organicamente de VOCÊ (como CNPJ da Conta, Assinante e Administradores do sistema),
            o <strong>{companyName}</strong> atua enquanto <strong>Controladora</strong>.
          </p>
          <p className="mb-4">
            A Controladora final de dados de Contatos criados dentro das lógicas da plataforma será sempre o próprio Cliente Assinante.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">2. Quais Dados Tratamos</h2>
          <p className="mb-4">
            No decurso de nosso contrato comercial B2B, tratamos sob tutela legal as seguintes frentes:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Dados Contratuais e da Conta:</strong> Nome, Razão Social, E-mails Administrativos, credenciais cifradas e métricas de pagamento de subscrições ativas via gateway Stripe.</li>
            <li><strong>Dados de Utilização e Logs (Auditoria):</strong> Rastreamentos de sistema (IP, device info, browser) para atestar segurança primária aos endpoints e gerar relatórios protetivos para que clientes auditem os acessos de sua &quot;Team&quot;.</li>
            <li><strong>Dados do Inquilino (Tenant Data):</strong> E-mails, mensagens da Inbox Omnichannel, campos de pipeline, anotações de leads (Dados de Terceiros que injetam em nosso escopo de Operador).</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">3. Finalidades e Base Legal do Tratamento</h2>
          <p className="mb-4">
            O tratamento de todos estes dados possui fito restrito na <strong>Execução Regular de Contrato e Cumprimento de Obrigação Regulatória</strong>:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Hospedar as lógicas e disponibilizar a Plataforma (Contrato).</li>
            <li>Atrair automação e processos de Inteligência Artificial para inferências estatísticas restritas ao escopo fechado do seu próprio Workspace (para prever receitas e resumir históricos de chat, a pedido explícito das features contratadas).</li>
            <li>Garantir faturamentos em consonância com as regulações tributárias brasileiras de conformidade.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">4. Compartilhamento Comercial (Sub-Operadores Táticos)</h2>
          <p className="mb-4">
            Nunca e sob nenhuma circunstância comercializamos base de dados confidenciais a terceiros (&quot;Data Brokers&quot;). Para garantir a estabilidade
            da Nuvem que suporta o maquinário de processos paralelos, os dados repousam fisicamente em Sub-Operadores restritos de primeira linha
            (ex: Amazon Web Services AWS, MongoDB Atlas Database, Vercel / Cloudflare para computação de borda, e OpenAI nas pontuações de insights de IA).
            Esses fornecedores retêm conformidade máxima SOC-2 e ISO 27001.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">5. Segurança Computacional</h2>
          <p className="mb-4">
            Todos os bancos de dados que abrigam multi-inquilinato (multi-tenant) repousam sob criptografia ativa &quot;At-Rest&quot; e transitáveis sobre TLS 1.3 (In-Transit).
            Os tokens sensíveis como os Webhooks HMAC e Chaves de Integração (API Keys) de sua titularidade ficam guardados através de &quot;Cipher Algorithms&quot; de salt aleatório.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">6. A Portabilidade e Retenção (Exclusão Regulatória)</h2>
          <p className="mb-4">
            Obedecendo estritamente ao Artº. 18 da LGPD, nossos clientes têm à disposição botões sistêmicos para <strong>Portabilidade Formato Estruturado (JSON)</strong>
            de seus Workspaces de modo soberano na tela de Configurações Avançadas. Esgotada a resilição dos contratos ou caso de uma supressão
            explícita em conta, o Time Limit destrutivo dos hard-disks entra em vigor limpando todas cópias de rotina do disco (purge delay back-up procedure)
            em no máximo 30 à 60 dias das rotinas de deleção.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">7. Encarregado de Dados (DPO) e Fale Conosco</h2>
          <p className="mb-4">
            Você ou Titulares atrelados a seu serviço (seus leads) que tiverem dúvidas atinentes devem remetê-las ao Encarregado de Proteção
            pelo meio oficial de comunicações jurídicas em <span className="font-bold">{privacyEmail}</span>. Respostas regimentais às interpelações
            de titulares respeitarão rigorosamente a janela normativa brasileira legal aplicável.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">8. Política de Cookies e Tecnologias Semelhantes</h2>
          <p className="mb-4">
            Esta seção descreve como o <strong>{companyName}</strong> utiliza cookies e tecnologias semelhantes (por exemplo, armazenamento local do navegador)
            para permitir funcionalidades essenciais, prover segurança, lembrar preferências e, quando configurado, medir desempenho e uso da plataforma.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-2 text-gray-900">8.1. O que são cookies</h3>
          <p className="mb-4">
            Cookies são pequenos arquivos de texto armazenados no seu navegador quando você visita um site. Eles podem ser <strong>de sessão</strong> (expiram
            ao fechar o navegador) ou <strong>persistentes</strong> (expiram após um período definido ou quando removidos manualmente).
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-2 text-gray-900">8.2. Por que usamos cookies</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Essenciais e segurança:</strong> autenticação, integridade de sessão, prevenção de abuso e proteção contra fraudes.</li>
            <li><strong>Preferências:</strong> lembrar idioma e configurações básicas de experiência.</li>
            <li><strong>Medição e desempenho (quando habilitado):</strong> entender navegação e performance para melhoria contínua.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-2 text-gray-900">8.3. Cookies que podemos utilizar</h3>
          <p className="mb-4">
            A lista abaixo descreve categorias e exemplos de cookies. Alguns nomes e atributos podem variar conforme ambiente (por exemplo, produção vs. desenvolvimento)
            e mecanismos de segurança do navegador.
          </p>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-left border border-gray-200 border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 border border-gray-200">Categoria</th>
                  <th className="p-3 border border-gray-200">Exemplos</th>
                  <th className="p-3 border border-gray-200">Finalidade</th>
                  <th className="p-3 border border-gray-200">Retenção típica</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border border-gray-200 font-medium">Essenciais</td>
                  <td className="p-3 border border-gray-200">
                    cookies de sessão do login (ex.: <code>next-auth.session-token</code> / <code>__Secure-next-auth.session-token</code>)
                  </td>
                  <td className="p-3 border border-gray-200">
                    Manter a sessão autenticada e permitir acesso seguro às áreas restritas.
                  </td>
                  <td className="p-3 border border-gray-200">Sessão ou conforme expiração do token</td>
                </tr>
                <tr>
                  <td className="p-3 border border-gray-200 font-medium">Preferências</td>
                  <td className="p-3 border border-gray-200"><code>language</code></td>
                  <td className="p-3 border border-gray-200">Lembrar o idioma selecionado pelo usuário.</td>
                  <td className="p-3 border border-gray-200">Até 12 meses</td>
                </tr>
                <tr>
                  <td className="p-3 border border-gray-200 font-medium">Admin/Suporte (quando aplicável)</td>
                  <td className="p-3 border border-gray-200">
                    <code>vysify_impersonation</code>, <code>vysify_impersonating</code>
                  </td>
                  <td className="p-3 border border-gray-200">
                    Suportar rotinas de suporte/masquerade do Super Admin com trilha de auditoria.
                  </td>
                  <td className="p-3 border border-gray-200">Sessão ou janela configurada</td>
                </tr>
                <tr>
                  <td className="p-3 border border-gray-200 font-medium">Medição/Analytics (opcional)</td>
                  <td className="p-3 border border-gray-200">
                    cookies do Google Analytics (por exemplo, <code>_ga</code>, <code>_gid</code>), quando habilitado
                  </td>
                  <td className="p-3 border border-gray-200">
                    Medir uso e performance para aprimoramento do produto.
                  </td>
                  <td className="p-3 border border-gray-200">Conforme políticas do provedor e/ou configuração</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-semibold mt-6 mb-2 text-gray-900">8.4. Base legal e escolhas do usuário</h3>
          <p className="mb-4">
            Cookies essenciais são necessários para o funcionamento e segurança da plataforma e, por isso, normalmente se apoiam em bases legais como
            <strong> execução de contrato</strong> e/ou <strong>legítimo interesse</strong>, observados os princípios da LGPD. Cookies de medição/analytics,
            quando utilizados, podem ser tratados conforme a base legal apropriada ao contexto e jurisdição aplicável.
          </p>
          <p className="mb-4">
            Você pode gerenciar cookies nas configurações do seu navegador (bloquear, permitir por site, apagar cookies existentes). Se você bloquear cookies essenciais,
            algumas funcionalidades podem deixar de funcionar.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-2 text-gray-900">8.5. Alterações desta seção</h3>
          <p className="mb-4">
            Podemos atualizar esta seção para refletir mudanças técnicas, legais ou operacionais. Publicaremos a versão revisada nesta página com data de atualização.
          </p>
        </section>
      </main>
      <Footer />
    </LandingLayout>
  );
};

export default PrivacyPolicy;
