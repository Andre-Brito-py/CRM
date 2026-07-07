import prisma from '@/prisma/index';

export default async function handler(req, res) {
  const { secret, email, action } = req.query;

  // Validação básica de segurança para evitar acessos não autorizados
  if (secret !== 'vysify_dev_secret_2026') {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    // Ação: Listar usuários para o desenvolvedor identificar o e-mail correto
    if (action === 'list') {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json({ users });
    }

    // Ação: Tornar Super Admin
    if (!email) {
      return res.status(400).json({ error: 'Parâmetro email é obrigatório para esta ação' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive'
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: `Usuário com o e-mail "${normalizedEmail}" não encontrado` });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'SUPERADMIN' }
    });

    return res.status(200).json({
      success: true,
      message: `Usuário ${updatedUser.name} (${updatedUser.email}) agora é SUPERADMIN!`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
