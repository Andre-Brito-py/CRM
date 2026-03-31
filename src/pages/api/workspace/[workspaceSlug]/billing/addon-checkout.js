import { validateSession } from '@/config/api-validation';
import getStripe from '@/lib/server/stripe';
import { getPayment, createPaymentAccount } from '@/prisma/services/customer';
import { getSystemConfig } from '@/lib/server/config';
import { getWorkspace } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { msg: 'Method not allowed' } });
  }

  try {
    const session = await validateSession(req, res);
    const { workspaceSlug } = req.query;
    const { addonType } = req.body; // 'whatsapp' ou 'ai'

    const workspace = await getWorkspace(session.user.userId || session.user.id, session.user.email, workspaceSlug);
    if (!workspace) {
      return res.status(404).json({ error: { msg: 'Workspace not found ou sem permissão' } });
    }

    let customerPayment = await getPayment(session.user?.email);
    if (!customerPayment) {
      await createPaymentAccount(session.user?.email, session.user?.userId);
      customerPayment = await getPayment(session.user?.email);
    }

    if (!customerPayment?.paymentId) {
      return res.status(400).json({ error: { msg: 'Não foi possível encontrar a conta de pagamento do usuário' } });
    }

    const appUrl = await getSystemConfig('APP_URL', process.env.APP_URL);
    const stripe = await getStripe();

    let price = 0;
    let quantity = 0;
    let name = '';
    
    if (addonType === 'whatsapp') {
      const enabled = await getSystemConfig('ADDON_WA_ENABLED', 'true');
      if (typeof enabled === 'boolean' ? !enabled : String(enabled).trim().toLowerCase() === 'false') {
        return res.status(400).json({ error: { msg: 'Pacote de WhatsApp não está disponível no momento' } });
      }
      
      const configPrice = await getSystemConfig('ADDON_WA_PRICE', 49.90);
      const configQty = await getSystemConfig('ADDON_WA_QUANTITY', 10000);
      
      quantity = Number(configQty) || 10000;
      price = Math.round(Number(configPrice) * 100);
      name = `Pacote Extra - ${quantity.toLocaleString('pt-BR')} Mensagens WhatsApp`;
    } else if (addonType === 'ai') {
      const enabled = await getSystemConfig('ADDON_AI_ENABLED', 'true');
      if (typeof enabled === 'boolean' ? !enabled : String(enabled).trim().toLowerCase() === 'false') {
        return res.status(400).json({ error: { msg: 'Pacote de IA não está disponível no momento' } });
      }
      
      const configPrice = await getSystemConfig('ADDON_AI_PRICE', 29.90);
      const configQty = await getSystemConfig('ADDON_AI_QUANTITY', 50000);
      
      quantity = Number(configQty) || 50000;
      price = Math.round(Number(configPrice) * 100);
      name = `Pacote Extra - ${quantity.toLocaleString('pt-BR')} Tokens IA`;
    } else {
      return res.status(400).json({ error: { msg: 'Tipo de Addon inválido. Valores permitidos: whatsapp, ai' } });
    }

    const paymentSession = await stripe.checkout.sessions.create({
      customer: customerPayment.paymentId,
      mode: 'payment',
      payment_method_types: ['card'], // pix não é suportado out-of-the-box sem config extra na stripe, manter card
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: { name },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/account/${workspaceSlug}/settings/usage?status=addon_success`,
      cancel_url: `${appUrl}/account/${workspaceSlug}/settings/usage?status=addon_cancelled`,
      metadata: {
        workspaceId: workspace.id,
        addonType,
        addonQuantity: String(quantity),
      },
    });

    res.status(200).json({ data: { sessionId: paymentSession.id, url: paymentSession.url } });
  } catch (error) {
    console.error('[addon-checkout] Erro:', error);
    res.status(500).json({ error: { msg: error.message } });
  }
};

export default handler;
