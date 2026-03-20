import i18n from 'i18next';

/**
 * Formata um valor numérico para uma string de moeda localizada.
 * 
 * @param {number} amount - O valor a ser formatado.
 * @param {string} currencyCode - O código da moeda (ex: 'BRL', 'USD', 'EUR').
 * @param {string} [locale] - O locale desejado (ex: 'pt-BR'). Se omitido, usa a língua atual do i18next.
 * @returns {string} - A string formatada (ex: "R$ 1.500", "$ 1,500").
 */
export const formatCurrency = (amount, currencyCode = 'BRL', locale = null) => {
  const currentLocale = locale || i18n.language || 'pt-BR';
  const currency = (currencyCode || 'BRL').toUpperCase();

  try {
    return new Intl.NumberFormat(currentLocale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0, // Closify geralmente usa valores arredondados nos planos
    }).format(amount || 0);
  } catch (error) {
    // Fallback básico caso o Intl falhe ou o código da moeda seja inválido
    const symbol = currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : currency;
    const value = Number(amount || 0).toLocaleString(currentLocale);
    return `${symbol} ${value}`;
  }
};

/**
 * Retorna a moeda padrão sugerida para um determinado idioma.
 * 
 * @param {string} lang - O código da língua (ex: 'pt', 'en').
 * @returns {string} - O código da moeda (ex: 'BRL', 'USD').
 */
export const getDefaultCurrencyForLang = (lang) => {
  const base = String(lang || '').split('-')[0].toLowerCase();
  switch (base) {
    case 'pt':
      return 'BRL';
    case 'es':
    case 'en':
      return 'USD';
    case 'de':
    case 'fr':
    case 'it':
      return 'EUR';
    default:
      return 'USD';
  }
};
