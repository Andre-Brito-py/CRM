import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import isEmail from 'validator/lib/isEmail';
import prisma from '@/prisma/index';
import { sendMail } from '@/lib/server/mail';
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

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: { msg: `${req.method} method unsupported` } });
    }

    const requestId = String(req.headers['x-request-id'] || '').trim() || null;
    const successPayload = { message: 'User created successfully. Please check your email to verify your account.' };
    const termsVersion = process.env.TERMS_VERSION || process.env.NEXT_PUBLIC_TERMS_VERSION || '2026-03-13';
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const jitterMs = (base, spread) => base + crypto.randomInt(0, spread + 1);
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
    const hasHoneypot = (body) => {
        const candidates = ['website', 'url', 'homepage', 'companyWebsite'];
        for (const key of candidates) {
            const v = String(body?.[key] ?? '').trim();
            if (v) return true;
        }
        return false;
    };
    const rl = await rateLimit({ req, limit: 10, windowMs: 10 * 60_000 });
    if (!rl.ok) {
        log({ level: 'warn', msg: 'auth_register_rate_limited', requestId });
        return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    try {
        if (hasHoneypot(req.body || {})) {
            await sleep(jitterMs(700, 900));
            log({ level: 'warn', msg: 'auth_register_honeypot_triggered', requestId });
            return res.status(201).json(successPayload);
        }

        const { name, email, password } = req.body || {};
        const termsAccepted = req.body?.termsAccepted === true;
        const twoFactorEnabled = req.body?.twoFactorEnabled === true;
        const planPriceId = req.body?.planPriceId ? String(req.body.planPriceId) : null;
        const normalizedEmail = String(email || '').trim().toLowerCase();

        if (!name || !normalizedEmail || !password) {
            await sleep(jitterMs(250, 350));
            return res.status(400).json({ error: { msg: 'Please provide all details' } });
        }

        if (!termsAccepted) {
            await sleep(jitterMs(250, 350));
            return res.status(400).json({ error: { msg: 'You must accept the Terms of Use' } });
        }

        if (!isEmail(normalizedEmail)) {
            await sleep(jitterMs(250, 350));
            return res.status(400).json({ error: { msg: 'Invalid email' } });
        }

        if (String(password || '').length < 8) {
            await sleep(jitterMs(250, 350));
            return res.status(400).json({ error: { msg: 'Password too short' } });
        }

        const rlEmail = await rateLimit({ req, limit: 3, windowMs: 60_000, key: `auth:register:email:${normalizedEmail}` });
        if (!rlEmail.ok) {
            log({ level: 'warn', msg: 'auth_register_email_rate_limited', requestId });
            return res.status(429).json({ error: { msg: 'Too Many Requests' } });
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                email: {
                    equals: normalizedEmail,
                    mode: 'insensitive',
                }
            },
        });

        if (existingUser) {
            await sleep(jitterMs(600, 900));
            log({ level: 'info', msg: 'auth_register_existing_email', requestId });
            return res.status(201).json(successPayload);
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email: normalizedEmail,
                password: hashedPassword,
                termsVersion,
                termsAcceptedAt: new Date(),
                twoFactorEnabled: twoFactorEnabled || false,
            },
        });

        const token = crypto.randomBytes(32).toString('hex');
        await prisma.verificationToken.create({
            data: {
                identifier: normalizedEmail,
                token,
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            },
        });

        const appUrl = await getSystemConfig('APP_URL', process.env.APP_URL);
        const verificationUrl = `${appUrl}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

        await sendMail({
            html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
          <h2>Welcome to Closify, ${name}!</h2>
          <p>Please click the button below to verify your email address and activate your account.</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; color: white; background-color: #14b8a6; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
          <p>Or paste this link into your browser:<br/><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This link expires in 24 hours.</p>
        </div>
      `,
            subject: '[Closify] Confirm your email address',
            text: `Welcome to Closify, ${name}! Please verify your email by opening this link: ${verificationUrl}`,
            to: normalizedEmail,
        });

        const requireCardOnSignup = isTruthy(
            await getSystemConfig(
                'PAYMENTS_REQUIRE_CARD_ON_SIGNUP',
                process.env.PAYMENTS_REQUIRE_CARD_ON_SIGNUP ?? 'true'
            )
        );
        const paymentsSecretKey = await getSystemConfig('PAYMENTS_SECRET_KEY', process.env.PAYMENTS_SECRET_KEY);
        if (requireCardOnSignup && !paymentsSecretKey) {
            return res.status(500).json({ error: { msg: 'Payments are not configured' } });
        }
        if (!planPriceId && !requireCardOnSignup) {
            return res.status(201).json(successPayload);
        }
        if (!paymentsSecretKey && !planPriceId) {
            return res.status(201).json(successPayload);
        }

        let customerPayment = await getPayment(normalizedEmail);
        if (!customerPayment) {
            await createPaymentAccount(normalizedEmail, user.id);
            customerPayment = await getPayment(normalizedEmail);
        }

        if (!customerPayment?.paymentId) {
            return res.status(201).json(successPayload);
        }

        const automaticTax = await getSystemConfig('STRIPE_AUTOMATIC_TAX', process.env.STRIPE_AUTOMATIC_TAX);
        const taxIdCollection = await getSystemConfig('STRIPE_TAX_ID_COLLECTION', process.env.STRIPE_TAX_ID_COLLECTION);
        const billingAddressCollection = await getSystemConfig(
            'STRIPE_BILLING_ADDRESS_COLLECTION',
            process.env.STRIPE_BILLING_ADDRESS_COLLECTION
        );
        const automaticTaxEnabled = isTruthy(automaticTax);
        const taxIdCollectionEnabled = isTruthy(taxIdCollection);
        const normalizedBillingAddressCollection = ['auto', 'required'].includes(
            String(billingAddressCollection || '').trim().toLowerCase()
        )
            ? String(billingAddressCollection).trim().toLowerCase()
            : null;

        const configuredPaymentMethodTypes = await getSystemConfig(
            'STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES',
            process.env.STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES
        );
        const paymentMethodTypes = parsePaymentMethodTypes(configuredPaymentMethodTypes);

        const stripe = await getStripe();
        const paymentSession = planPriceId
            ? await (async () => {
                const price = await stripe.prices.retrieve(planPriceId);
                const product = await stripe.products.retrieve(price.product);
                return await stripe.checkout.sessions.create({
                    customer: customerPayment.paymentId,
                    mode: 'subscription',
                    payment_method_types: paymentMethodTypes,
                    payment_method_collection: 'always',
                    line_items: [{ price: price.id, quantity: 1 }],
                    allow_promotion_codes: true,
                    billing_address_collection: automaticTaxEnabled ? 'required' : (normalizedBillingAddressCollection || undefined),
                    automatic_tax: automaticTaxEnabled ? { enabled: true } : undefined,
                    tax_id_collection: taxIdCollectionEnabled ? { enabled: true } : undefined,
                    customer_update: {
                        name: 'auto',
                        address: 'auto',
                    },
                    success_url: `${appUrl}/auth/login?paid=success`,
                    cancel_url: `${appUrl}/auth/register?paid=cancelled`,
                    metadata: {
                        customerId: customerPayment.customerId,
                        type: product?.metadata?.type || 'STANDARD',
                        automaticTax: automaticTaxEnabled ? 'true' : 'false',
                        taxIdCollection: taxIdCollectionEnabled ? 'true' : 'false',
                    },
                });
            })()
            : await stripe.checkout.sessions.create({
                customer: customerPayment.paymentId,
                mode: 'setup',
                payment_method_types: paymentMethodTypes,
                customer_update: {
                    name: 'auto',
                    address: 'auto',
                },
                success_url: `${appUrl}/auth/login?setup=success`,
                cancel_url: `${appUrl}/auth/register?setup=cancelled`,
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

        return res.status(201).json({
            ...successPayload,
            data: { sessionId: paymentSession.id },
        });
    } catch (error) {
        log({ level: 'error', msg: 'auth_register_failed', requestId, error });
        reportError(error, { route: '/api/auth/register', requestId });
        return res.status(500).json({ error: { msg: 'Unable to register user' } });
    }
};

export default handler;
