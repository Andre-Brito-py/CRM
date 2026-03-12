export default class PaymentProviderInterface {
  constructor({ provider, credential, environment }) {
    this.provider = provider;
    this.credential = credential;
    this.environment = environment;
  }

  async createCustomer() {
    throw new Error('createCustomer not implemented');
  }

  async createPayment() {
    throw new Error('createPayment not implemented');
  }

  async createPaymentLink() {
    throw new Error('createPaymentLink not implemented');
  }

  async getPayment() {
    throw new Error('getPayment not implemented');
  }

  async refundPayment() {
    throw new Error('refundPayment not implemented');
  }

  async handleWebhook() {
    throw new Error('handleWebhook not implemented');
  }
}
