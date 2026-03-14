import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';

const normalizeDigits = (value) => String(value || '').replace(/\D/g, '');

export default async function handler(req, res) {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const issuers = await prisma.fiscalIssuer.findMany({
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    return res.status(200).json({ data: { issuers } });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const code = String(body.code || '').trim();
    const name = String(body.name || '').trim();
    const cnpjPrestador = normalizeDigits(body.cnpjPrestador);
    const inscricaoMunicipalPrestador =
      body.inscricaoMunicipalPrestador === undefined || body.inscricaoMunicipalPrestador === null
        ? null
        : String(body.inscricaoMunicipalPrestador).trim() || null;
    const codigoMunicipioEmissora = body.codigoMunicipioEmissora ? Number(body.codigoMunicipioEmissora) : null;
    const codigoMunicipioPrestacao = body.codigoMunicipioPrestacao ? Number(body.codigoMunicipioPrestacao) : null;
    const codigoOpcaoSimplesNacional =
      body.codigoOpcaoSimplesNacional === undefined || body.codigoOpcaoSimplesNacional === null || body.codigoOpcaoSimplesNacional === ''
        ? null
        : Number(body.codigoOpcaoSimplesNacional);
    const regimeEspecialTributacao =
      body.regimeEspecialTributacao === undefined || body.regimeEspecialTributacao === null || body.regimeEspecialTributacao === ''
        ? null
        : Number(body.regimeEspecialTributacao);
    const isDefault = Boolean(body.isDefault);

    const errors = {};
    if (!code) errors.code = { msg: 'code é obrigatório' };
    if (!name) errors.name = { msg: 'name é obrigatório' };
    if (!cnpjPrestador) errors.cnpjPrestador = { msg: 'cnpjPrestador é obrigatório' };
    if (!codigoMunicipioEmissora || Number.isNaN(codigoMunicipioEmissora)) {
      errors.codigoMunicipioEmissora = { msg: 'codigoMunicipioEmissora inválido' };
    }
    if (codigoMunicipioPrestacao !== null && Number.isNaN(codigoMunicipioPrestacao)) {
      errors.codigoMunicipioPrestacao = { msg: 'codigoMunicipioPrestacao inválido' };
    }
    if (codigoOpcaoSimplesNacional !== null && Number.isNaN(codigoOpcaoSimplesNacional)) {
      errors.codigoOpcaoSimplesNacional = { msg: 'codigoOpcaoSimplesNacional inválido' };
    }
    if (regimeEspecialTributacao !== null && Number.isNaN(regimeEspecialTributacao)) {
      errors.regimeEspecialTributacao = { msg: 'regimeEspecialTributacao inválido' };
    }
    if (Object.keys(errors).length > 0) return res.status(400).json({ errors });

    const issuer = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.fiscalIssuer.updateMany({ data: { isDefault: false } });
      }
      return await tx.fiscalIssuer.upsert({
        where: { code },
        update: {
          name,
          cnpjPrestador,
          inscricaoMunicipalPrestador,
          codigoMunicipioEmissora,
          codigoMunicipioPrestacao,
          codigoOpcaoSimplesNacional,
          regimeEspecialTributacao,
          isDefault,
        },
        create: {
          code,
          name,
          cnpjPrestador,
          inscricaoMunicipalPrestador,
          codigoMunicipioEmissora,
          codigoMunicipioPrestacao,
          codigoOpcaoSimplesNacional,
          regimeEspecialTributacao,
          isDefault,
        },
      });
    });

    return res.status(200).json({ data: { issuer } });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: { msg: 'Method not supported' } });
}

