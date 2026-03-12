import AsaasProvider from './providers/asaas';
import StripeProvider from './providers/stripe';
import PagarmeProvider from './providers/pagarme';
import MercadoPagoProvider from './providers/mercadopago';

export const buildProviderInstance = ({ provider, credential, environment }) => {
  const name = String(provider?.name || '').toLowerCase();
  const args = { provider, credential, environment };
  if (name === 'asaas') return new AsaasProvider(args);
  if (name === 'stripe') return new StripeProvider(args);
  if (name === 'pagarme') return new PagarmeProvider(args);
  if (name === 'mercadopago') return new MercadoPagoProvider(args);
  throw new Error('Unknown provider');
};

