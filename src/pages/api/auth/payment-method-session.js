import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import isEmail from 'validator/lib/isEmail';
import prisma from '@/prisma/index';
import { getSystemConfig } from '@/lib/server/config';
import { log, reportError } from '@/lib/server/logger';
import { rateLimit } from '@/lib/server/rateLimit';
import getStripe from '@/lib/server/stripe';
import { createPaymentAccount, getPayment } from '@/prisma/services/customer';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '64kb',
    },
  },
};

const isTruthy = (value) => {
  const v = String(value || '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
};

const parsePaymentMethodTypes = (raw) => {
  const tokens = String(raw || '')
    .split(',')
    .map((t) => String(t || '').trim())
    .filter(Boolean);
  return tokens.length > 0 ? tokens : ['card'];
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { msg: `${req.method} method unsupported` } });
  }

  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const jitterMs = (base, spread) => base + crypto.randomInt(0, spread + 1);

  const rl = await rateLimit({ req, limit: 30, windowMs: 10 * 60_000 });
  if (!rl.ok) {
    log({ level: 'warn', msg: 'auth_payment_method_session_rate_limited', requestId });
    return res.status(429).json({ error: { msg: 'Too Many Requests' } });
  }

  try {
    const { email, password } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      await sleep(jitterMs(250, 350));
      return res.status(400).json({ error: { msg: 'Please provide all details' } });
    }

    if (!isEmail(normalizedEmail)) {
      await sleep(jitterMs(250, 350));
      return res.status(400).json({ error: { msg: 'Invalid email' } });
    }

    const rlEmail = await rateLimit({
      req,
      limit: 5,
      windowMs: 60_000,
      key: `auth:payment-method:email:${normalizedEmail}`,
    });
    if (!rlEmail.ok) {
      log({ level: 'warn', msg: 'auth_payment_method_session_email_rate_limited', requestId });
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      select: { id: true, email: true, password: true, role: true },
    });

    if (!user?.password) {
      await sleep(jitterMs(250, 350));
      return res.status(401).json({ error: { msg: 'Unauthorized' } });
    }

    const ok = await bcrypt.compare(String(password), user.password);
    if (!ok) {
      await sleep(jitterMs(250, 350));
      return res.status(401).json({ error: { msg: 'Unauthorized' } });
    }

    if (user.role === 'SUPERADMIN') {
      return res.status(200).json({ data: { sessionId: null } });
    }

    const requireCardOnSignup = isTruthy(
      await getSystemConfig(
        'PAYMENTS_REQUIRE_CARD_ON_SIGNUP',
        process.env.PAYMENTS_REQUIRE_CARD_ON_SIGNUP ?? 'true'
      )
    );
    if (!requireCardOnSignup) {
      return res.status(200).json({ data: { sessionId: null } });
    }

    const paymentsSecretKey = await getSystemConfig('PAYMENTS_SECRET_KEY', process.env.PAYMENTS_SECRET_KEY);
    if (!paymentsSecretKey) {
      return res.status(500).json({ error: { msg: 'Payments are not configured' } });
    }

    const appUrl = await getSystemConfig('APP_URL', process.env.APP_URL);
    if (!appUrl) {
      return res.status(500).json({ error: { msg: 'APP_URL is missing' } });
    }

    let customerPayment = await getPayment(user.email);
    if (!customerPayment) {
      await createPaymentAccount(user.email, user.id);
      customerPayment = await getPayment(user.email);
    }

    if (!customerPayment?.paymentId) {
      return res.status(500).json({ error: { msg: 'Customer payment account not found' } });
    }

    const configuredPaymentMethodTypes = await getSystemConfig(
      'STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES',
      process.env.STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES
    );
    const paymentMethodTypes = parsePaymentMethodTypes(configuredPaymentMethodTypes);

    const stripe = await getStripe();
    const paymentSession = await stripe.checkout.sessions.create({
      customer: customerPayment.paymentId,
      mode: 'setup',
      payment_method_types: paymentMethodTypes,
      customer_update: {
        name: 'auto',
        address: 'auto',
      },
      success_url: `${appUrl}/auth/login?setup=success`,
      cancel_url: `${appUrl}/auth/login?setup=cancelled`,
      metadata: {
        customerId: customerPayment.customerId,
        purpose: 'signup_setup',
      },
      setup_intent_data: {
        metadata: {
          customerId: customerPayment.customerId,
          purpose: 'signup_setup',
        },
      },
    });

    return res.status(200).json({ data: { sessionId: paymentSession.id } });
  } catch (error) {
    log({ level: 'error', msg: 'auth_payment_method_session_failed', requestId, error });
    reportError(error, { route: '/api/auth/payment-method-session', requestId });
    return res.status(500).json({ error: { msg: 'Unable to create payment method session' } });
  }
}

