import prisma from '@/prisma/index';
// Public API for fetching and submitting a WebForm

export default async function handler(req, res) {
  const { slug } = req.query;

  if (req.method === 'GET') {
    try {
      const webForm = await prisma.webForm.findUnique({
        where: { slug },
        include: {
          workspace: {
            select: { id: true, name: true, slug: true }
          }
        }
      });

      if (!webForm || !webForm.isActive || webForm.deletedAt) {
        return res.status(404).json({ error: { msg: 'Form not found or inactive' } });
      }

      res.status(200).json({ data: { webForm } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Error loading form' } });
    }
  } else if (req.method === 'POST') {
    try {
      const webForm = await prisma.webForm.findUnique({
        where: { slug },
      });

      if (!webForm || !webForm.isActive || webForm.deletedAt) {
        return res.status(404).json({ error: { msg: 'Form not found or inactive' } });
      }

      const submissionData = req.body;
      
      // We need to create a Contact.
      const mappedData = {};
      const customFields = {};
      
      // In `submissionData`, keys are field IDs. 
      // Look up each field in `webForm.config` to see where it maps.
      let formConfig = [];
      try {
        formConfig = typeof webForm.config === 'string' ? JSON.parse(webForm.config) : webForm.config;
      } catch (e) {
        formConfig = webForm.config || [];
      }

      for (const field of formConfig) {
        const val = submissionData[field.id];
        if (val !== undefined && val !== '') {
          if (field.mapsTo) {
            mappedData[field.mapsTo] = val;
          } else {
            customFields[field.label] = val;
          }
        }
      }

      // 1. Find or create Contact
      let contactName = mappedData.name || mappedData.nome || 'Lead (Web Form)';
      let contactEmail = mappedData.email;
      let contactPhone = mappedData.phone;
      
      let contact = null;
      if (contactEmail) {
        contact = await prisma.contact.findFirst({
          where: { workspaceId: webForm.workspaceId, email: contactEmail, deletedAt: null },
        });
      }
      
      if (!contact && contactPhone) {
        contact = await prisma.contact.findFirst({
          where: { workspaceId: webForm.workspaceId, phone: contactPhone, deletedAt: null },
        });
      }

      const mergedCustomFields = contact?.customFields 
        ? { ...contact.customFields, ...customFields }
        : customFields;

      if (contact) {
        // Update existing contact
        contact = await prisma.contact.update({
          where: { id: contact.id },
          data: {
            name: mappedData.name || contact.name,
            phone: mappedData.phone || contact.phone,
            jobTitle: mappedData.jobTitle || contact.jobTitle,
            customFields: mergedCustomFields,
          }
        });
      } else {
        // Create new contact
        contact = await prisma.contact.create({
          data: {
            workspaceId: webForm.workspaceId,
            name: contactName,
            email: contactEmail,
            phone: contactPhone,
            jobTitle: mappedData.jobTitle,
            customFields: mergedCustomFields,
          }
        });
      }

      // 2. Attach tags if defined
      if (webForm.tagId) {
        // Tag many-to-many is implicit or explicit? 
        // Wait, Contact has `tags Tag[]`. In prisma we can connect.
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            tags: {
              connect: { id: webForm.tagId }
            }
          }
        });
      }

      // 3. Create Deal if pipeline and stage exist
      if (webForm.pipelineId && webForm.stageId) {
        const deal = await prisma.deal.create({
          data: {
            workspaceId: webForm.workspaceId,
            contactId: contact.id,
            stageId: webForm.stageId,
            name: `Lead: ${contactName}`,
            customFields: customFields, // Can attach custom fields to deal too
          }
        });

        // Add an Activity to the Deal
        await prisma.activity.create({
          data: {
            workspaceId: webForm.workspaceId,
            dealId: deal.id,
            contactId: contact.id,
            type: 'NOTE',
            title: `Origem: Web Form (${webForm.name})`,
            content: `Preencheu o formulário web na página pública.`,
          }
        });
      } else {
         // If no deal, at least add Activity to Contact
         await prisma.activity.create({
          data: {
            workspaceId: webForm.workspaceId,
            contactId: contact.id,
            type: 'NOTE',
            title: `Origem: Web Form (${webForm.name})`,
            content: `Preencheu o formulário web na página pública.`,
          }
        });
      }

      res.status(200).json({ success: true, message: webForm.successMessage || 'Submitted' });

    } catch (error) {
      console.error('Submission error:', error);
      res.status(500).json({ error: { msg: 'Failed to submit form' } });
    }
  } else {
    res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
