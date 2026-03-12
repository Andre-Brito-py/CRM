import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/prisma/index';
import { sendMail } from '@/lib/server/mail';
import { getSystemConfig } from '@/lib/server/config';

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: { msg: `${req.method} method unsupported` } });
    }

    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: { msg: 'Please provide all details' } });
        }

        // Checking if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(400).json({ error: { msg: 'A user with this email already exists' } });
        }

        // Hashing password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Creating User (unverified)
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });

        // Generate Verification Token
        const token = crypto.randomBytes(32).toString('hex');
        await prisma.verificationToken.create({
            data: {
                identifier: email,
                token,
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            },
        });

        // Send Verification Email
        const appUrl = await getSystemConfig('APP_URL', process.env.APP_URL);
        const verificationUrl = `${appUrl}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

        await sendMail({
            html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
          <h2>Welcome to Nextacular, ${name}!</h2>
          <p>Please click the button below to verify your email address and activate your account.</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; color: white; background-color: #14b8a6; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
          <p>Or paste this link into your browser:<br/><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This link expires in 24 hours.</p>
        </div>
      `,
            subject: '[Nextacular] Confirm your email address',
            text: `Welcome to Nextacular, ${name}! Please verify your email by opening this link: ${verificationUrl}`,
            to: email,
        });

        return res.status(201).json({ message: 'User created successfully. Please check your email to verify your account.' });
    } catch (error) {
        console.error('Registration Error:', error);
        return res.status(500).json({ error: { msg: 'Unable to register user' } });
    }
};

export default handler;
