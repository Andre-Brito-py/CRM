import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';

const normalizeDocumentDigits = (value) => String(value || '').replace(/\D/g, '');

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'GET') {
    const session = await validateSession(req, res);
    const profile = await prisma.fiscalProfile.findUnique({
      where: { userId: session.user.userId },
      select: {
        documentType: true,
        document: true,
        name: true,
        email: true,
        phone: true,
        cep: true,
        uf: true,
        codigoMunicipio: true,
        logradouro: true,
        numero: true,
        complemento: true,
        bairro: true,
      },
    });
    return res.status(200).json({ data: { fiscalProfile: profile } });
  }

  if (method === 'PUT') {
    const session = await validateSession(req, res);
    const body = req.body || {};

    const documentType = String(body.documentType || '').trim().toUpperCase();
    const document = normalizeDocumentDigits(body.document);
    const name = String(body.name || '').trim();
    const email = body.email === undefined || body.email === null ? session.user.email : String(body.email).trim();
    const phone = body.phone === undefined || body.phone === null ? null : String(body.phone).trim();
    const cep = body.cep === undefined || body.cep === null ? null : normalizeDocumentDigits(body.cep);
    const uf = body.uf === undefined || body.uf === null ? null : String(body.uf).trim().toUpperCase();
    const codigoMunicipio =
      body.codigoMunicipio === undefined || body.codigoMunicipio === null || body.codigoMunicipio === ''
        ? null
        : Number(body.codigoMunicipio);
    const logradouro = body.logradouro === undefined || body.logradouro === null ? null : String(body.logradouro).trim();
    const numero = body.numero === undefined || body.numero === null ? null : String(body.numero).trim();
    const complemento = body.complemento === undefined || body.complemento === null ? null : String(body.complemento).trim();
    const bairro = body.bairro === undefined || body.bairro === null ? null : String(body.bairro).trim();

    const errors = {};
    if (documentType !== 'CPF' && documentType !== 'CNPJ') errors.documentType = { msg: 'documentType inválido' };
    if (!document) errors.document = { msg: 'document é obrigatório' };
    if (!name) errors.name = { msg: 'name é obrigatório' };
    if (codigoMunicipio === null || Number.isNaN(codigoMunicipio)) errors.codigoMunicipio = { msg: 'codigoMunicipio inválido' };

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const saved = await prisma.fiscalProfile.upsert({
      where: { userId: session.user.userId },
      update: {
        documentType,
        document,
        name,
        email,
        phone,
        cep,
        uf,
        codigoMunicipio,
        logradouro,
        numero,
        complemento,
        bairro,
      },
      create: {
        userId: session.user.userId,
        documentType,
        document,
        name,
        email,
        phone,
        cep,
        uf,
        codigoMunicipio,
        logradouro,
        numero,
        complemento,
        bairro,
      },
      select: {
        documentType: true,
        document: true,
        name: true,
        email: true,
        phone: true,
        cep: true,
        uf: true,
        codigoMunicipio: true,
        logradouro: true,
        numero: true,
        complemento: true,
        bairro: true,
      },
    });

    return res.status(200).json({ data: { fiscalProfile: saved } });
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
};

export default handler;

