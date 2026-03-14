import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';

const normalizeDigits = (value) => String(value || '').replace(/\D/g, '');

export default async function handler(req, res) {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  const { issuerId } = req.query;
  const id = String(issuerId || '').trim();
  if (!id) return res.status(400).json({ error: { msg: 'issuerId inválido' } });

  if (req.method === 'PUT') {
    const body = req.body || {};
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
      return await tx.fiscalIssuer.update({
        where: { id },
        data: {
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

  if (req.method === 'DELETE') {
    const used = await prisma.fiscalProfile.count({ where: { issuerId: id } });
    if (used > 0) return res.status(400).json({ error: { msg: 'Emitente em uso por perfis fiscais' } });

    await prisma.fiscalIssuer.delete({ where: { id } });
    return res.status(200).json({ data: { deleted: true } });
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).json({ error: { msg: 'Method not supported' } });
}

