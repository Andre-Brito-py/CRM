/**
 * Robust phone number normalization for WhatsApp, with special handling for Brazil's 9th digit.
 */

/**
 * Normalizes a phone number to digits and international format.
 * @param {string} phone 
 * @returns {string} Digits only, starts with country code if provided.
 */
export const cleanPhone = (phone) => {
  if (!phone) return '';
  // Remove all non-digits
  return String(phone).replace(/\D/g, '');
};

/**
 * Generates variations for a Brazil phone number to help matching 12 and 13 digit formats.
 * @param {string} cleanNum - Digits only phone number
 * @returns {{ canonical: string, variations: string[] }}
 */
export const getBrazilVariations = (cleanNum) => {
  // Brazil country code is 55
  if (!cleanNum.startsWith('55')) return { canonical: cleanNum, variations: [cleanNum] };

  const isMobile = cleanNum.length >= 12 && cleanNum.length <= 13;
  if (!isMobile) return { canonical: cleanNum, variations: [cleanNum] };

  // 55 [DD] [Number]
  const ddd = cleanNum.slice(2, 4);
  const numberPart = cleanNum.slice(4);

  let with9 = cleanNum;
  let without9 = cleanNum;

  if (numberPart.length === 8) {
    // It's 55DDNNNNNNNN (12 digits), need to generate the version with 9
    with9 = `55${ddd}9${numberPart}`;
    without9 = cleanNum;
  } else if (numberPart.length === 9 && numberPart.startsWith('9')) {
    // It's 55DD9NNNNNNNN (13 digits), need to generate the version without 9
    with9 = cleanNum;
    without9 = `55${ddd}${numberPart.slice(1)}`;
  }

  // Common variations include +, digits, and the alternate 9-digit version
  return {
    canonical: with9, // We prefer storing the 13-digit version as canonical if it's a mobile
    variations: Array.from(new Set([
      with9,
      without9,
      `+${with9}`,
      `+${without9}`
    ]))
  };
};

/**
 * Comprehensive normalization for searching and storing WhatsApp numbers.
 * @param {string} phone 
 * @returns {{ clean: string, variations: string[] }}
 */
export const normalizeWhatsAppNumber = (phone) => {
  const clean = cleanPhone(phone);
  if (clean.startsWith('55')) {
    const { canonical, variations } = getBrazilVariations(clean);
    return { clean: canonical, variations };
  }
  
  return {
    clean,
    variations: [clean, `+${clean}`]
  };
};
