/**
 * Detecta o idioma do usuário a partir dos headers ou cookies da requisição.
 * 
 * @param {import('next').NextApiRequest} req - A requisição Next.js.
 * @returns {string} - O nome por extenso do idioma (ex: 'Portuguese', 'English').
 */
export const detectAiLanguage = (req) => {
  const userLang = req.headers['accept-language']?.split(',')[0] || 'pt';
  const base = String(userLang).split('-')[0].toLowerCase();

  const names = {
    'pt': 'Português',
    'en': 'English',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'it': 'Italiano'
  };

  return names[base] || 'English';
};

/**
 * Retorna uma instrução de sistema padrão para forçar o idioma da resposta.
 * 
 * @param {string} language - O nome do idioma.
 * @returns {string} - A instrução para o prompt de sistema.
 */
export const getLanguageSystemInstruction = (language) => {
  return `IMPORTANTE: Responda obrigatoriamente no idioma: ${language}.`;
};
