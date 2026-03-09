import prisma from '@/prisma/index';

const handler = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: { msg: `${req.method} method unsupported` } });
    }

    const { token, email } = req.query;

    if (!token || !email) {
        return res.status(400).send('Invalid verification request');
    }

    try {
        const verificationToken = await prisma.verificationToken.findFirst({
            where: {
                identifier: email,
                token: token,
                expires: { gt: new Date() }
            }
        });

        if (!verificationToken) {
            return res.status(400).send('<h1>Invalid or Expired Token</h1><p>Please log in or request a new verification email.</p>');
        }

        // Verify User
        await prisma.user.update({
            where: { email },
            data: { emailVerified: new Date() }
        });

        // Delete token after successful use
        await prisma.verificationToken.deleteMany({
            where: { identifier: email }
        });

        // Redirect to login page with success param
        return res.redirect('/auth/login?verified=true');
    } catch (error) {
        console.error('Verification Error:', error);
        return res.status(500).send('An error occurred during verification');
    }
};

export default handler;
