import dns from 'dns';

const dnsPromises = dns.promises;

/**
 * Checks MX, SPF, DKIM, and DMARC records for a domain.
 * @param {string} domain The domain name to check
 * @param {string} [dkimSelector='default'] Optional DKIM selector (defaults to 'default')
 * @returns {Promise<{mx: {valid: boolean, records: any[]}, spf: {valid: boolean, record: string|null}, dmarc: {valid: boolean, record: string|null}, dkim: {valid: boolean, record: string|null}}>}
 */
export async function verifyDomainDns(domain, dkimSelector = 'default') {
  const result = {
    domain,
    mx: { valid: false, records: [] },
    spf: { valid: false, record: null },
    dmarc: { valid: false, record: null },
    dkim: { valid: false, record: null }
  };

  if (!domain || typeof domain !== 'string') {
    return result;
  }

  const cleanedDomain = domain.trim().toLowerCase();

  // 1. Verify MX
  try {
    const mxRecords = await dnsPromises.resolveMx(cleanedDomain);
    result.mx.records = mxRecords;
    result.mx.valid = mxRecords && mxRecords.length > 0;
  } catch (error) {
    result.mx.valid = false;
    result.mx.error = error.message;
  }

  // 2. Verify SPF (TXT record containing v=spf1)
  try {
    const txtRecords = await dnsPromises.resolveTxt(cleanedDomain);
    const spfRecord = txtRecords
      .flat()
      .find(record => record.startsWith('v=spf1'));
    
    if (spfRecord) {
      result.spf.record = spfRecord;
      result.spf.valid = true;
    }
  } catch (error) {
    result.spf.valid = false;
    result.spf.error = error.message;
  }

  // 3. Verify DMARC (TXT record at _dmarc.domain containing v=DMARC1)
  try {
    const dmarcDomain = `_dmarc.${cleanedDomain}`;
    const txtRecords = await dnsPromises.resolveTxt(dmarcDomain);
    const dmarcRecord = txtRecords
      .flat()
      .find(record => record.toUpperCase().startsWith('v=DMARC1') || record.toUpperCase().startsWith('V=DMARC1'));
    
    if (dmarcRecord) {
      result.dmarc.record = dmarcRecord;
      result.dmarc.valid = true;
    }
  } catch (error) {
    result.dmarc.valid = false;
    result.dmarc.error = error.message;
  }

  // 4. Verify DKIM (TXT record at selector._domainkey.domain)
  try {
    const selectorToUse = dkimSelector.trim() || 'default';
    const dkimDomain = `${selectorToUse}._domainkey.${cleanedDomain}`;
    const txtRecords = await dnsPromises.resolveTxt(dkimDomain);
    const dkimRecord = txtRecords
      .flat()
      .find(record => record.startsWith('v=DKIM1') || record.includes('p='));
    
    if (dkimRecord) {
      result.dkim.record = dkimRecord;
      result.dkim.valid = true;
    }
  } catch (error) {
    result.dkim.valid = false;
    result.dkim.error = error.message;
  }

  return result;
}
