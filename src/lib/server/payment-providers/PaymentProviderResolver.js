import { getProvider, getWorkspaceProviderName, resolveWebhookProvider } from './resolver';

export default class PaymentProviderResolver {
  static async getProvider(workspaceId) {
    return await getProvider(workspaceId);
  }

  static async getWorkspaceProviderName(workspaceId) {
    return await getWorkspaceProviderName(workspaceId);
  }

  static async resolveWebhookProvider({ req, providerName }) {
    return await resolveWebhookProvider({ req, providerName });
  }
}

