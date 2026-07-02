import { resolveSpintax } from '../src/lib/server/ai/spintax';
import { verifyDomainDns } from '../src/lib/server/dns-checker';

describe('Omnichannel B2B Features', () => {
  describe('Spintax Resolver', () => {
    test('should resolve simple spintax', () => {
      const template = '{Olá|Oi} {parceiro|amigo}';
      const resolved = resolveSpintax(template);
      expect(['Olá parceiro', 'Olá amigo', 'Oi parceiro', 'Oi amigo']).toContain(resolved);
    });

    test('should resolve nested spintax', () => {
      const template = '{Olá|Oi {amigo|parceiro}}';
      const resolved = resolveSpintax(template);
      expect(['Olá', 'Oi amigo', 'Oi parceiro']).toContain(resolved);
    });

    test('should return original text if no spintax is present', () => {
      const template = 'Olá parceiro, como vai?';
      const resolved = resolveSpintax(template);
      expect(resolved).toBe('Olá parceiro, como vai?');
    });

    test('should return input as-is if not a string', () => {
      expect(resolveSpintax(null)).toBeNull();
      expect(resolveSpintax(undefined)).toBeUndefined();
      expect(resolveSpintax(123)).toBe(123);
    });
  });

  describe('DNS Health Checker', () => {
    test('should return invalid results for empty or invalid domain input', async () => {
      const result = await verifyDomainDns(null);
      expect(result.mx.valid).toBe(false);
      expect(result.spf.valid).toBe(false);
      expect(result.dmarc.valid).toBe(false);
      expect(result.dkim.valid).toBe(false);
    });
  });
});
