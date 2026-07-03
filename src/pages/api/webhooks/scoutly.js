import prisma from '@/prisma/index';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { workspaceId } = req.query;

  if (!workspaceId) {
    return res.status(400).json({ error: 'workspaceId query parameter is required' });
  }

  try {
    const workspace = await prisma.workspace.findFirst({
      where: { id: String(workspaceId), deletedAt: null },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found or deleted' });
    }

    const { source, event, preferredChannel, lead } = req.body;

    if (!lead) {
      return res.status(400).json({ error: 'Lead details are required' });
    }

    // 1. Process Company if companyName is provided
    let company = null;
    if (lead.companyName) {
      company = await prisma.company.findFirst({
        where: {
          workspaceId: workspace.id,
          name: lead.companyName,
          deletedAt: null,
        },
      });

      if (!company) {
        company = await prisma.company.create({
          data: {
            workspaceId: workspace.id,
            name: lead.companyName,
          },
        });
      }
    }

    // 2. Process Contact (deduplicate by email or phone)
    let contact = null;
    const searchConditions = [];
    if (lead.email) searchConditions.push({ email: lead.email });
    if (lead.phone) searchConditions.push({ phone: lead.phone });

    if (searchConditions.length > 0) {
      contact = await prisma.contact.findFirst({
        where: {
          workspaceId: workspace.id,
          deletedAt: null,
          OR: searchConditions,
        },
      });
    }

    if (contact) {
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          preferredChannel: preferredChannel || contact.preferredChannel || 'whatsapp',
          companyId: company ? company.id : contact.companyId,
        },
      });
    } else {
      contact = await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          name: lead.contactName || lead.companyName || 'Novo Lead',
          email: lead.email || null,
          phone: lead.phone || null,
          preferredChannel: preferredChannel || 'whatsapp',
          companyId: company ? company.id : null,
          jobTitle: 'Lead from Scoutly',
        },
      });
    }

    // 3. Find first stage of the first pipeline
    const pipeline = await prisma.pipeline.findFirst({
      where: { workspaceId: workspace.id, deletedAt: null },
      include: {
        stages: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!pipeline || !pipeline.stages || pipeline.stages.length === 0) {
      return res.status(500).json({
        error: 'No active sales pipeline or stages configured in this workspace.',
      });
    }

    const firstStage = pipeline.stages[0];

    // 4. Create the Deal card in the first stage
    const dealName = `${lead.companyName || lead.contactName || 'Novo Lead'} - Scoutly`;
    const deal = await prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        name: dealName,
        stageId: firstStage.id,
        contactId: contact.id,
        companyId: company ? company.id : null,
        priority: 'MEDIUM',
        customFields: {
          score: lead.score || 0,
          scoreReason: lead.scoreReason || '',
          personalizedMessage: lead.personalizedMessage || '',
          source: 'scoutly',
        },
      },
    });

    // 5. Create audit/activity entry
    await prisma.activity.create({
      data: {
        workspaceId: workspace.id,
        type: 'DEAL_CREATED',
        title: `Deal "${dealName}" imported from Scoutly`,
        dealId: deal.id,
      },
    });

    return res.status(201).json({
      success: true,
      dealId: deal.id,
      contactId: contact.id,
    });
  } catch (error) {
    console.error('[scoutly-webhook] Error processing lead handoff:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default handler;
