import { validateAddDomain, validateSession } from '@/config/api-validation';
import api from '@/lib/common/api';
import {
  createDomain,
  deleteDomain,
  verifyDomain,
} from '@/prisma/services/domain';
import { getWorkspace } from '@/prisma/services/workspace';
import { createAuditActivity } from '@/prisma/services/activity';
import { getSystemConfig } from '@/lib/server/config';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'POST') {
    const session = await validateSession(req, res);
    await validateAddDomain(req, res);
    const { domainName } = req.body;
    const workspace = await getWorkspace(session.user.userId, session.user.email, req.query.workspaceSlug);
    const [teamId, apiUrl, projectId, token] = await Promise.all([
      getSystemConfig('VERCEL_TEAM_ID', process.env.VERCEL_TEAM_ID),
      getSystemConfig('VERCEL_API_URL', process.env.VERCEL_API_URL),
      getSystemConfig('VERCEL_PROJECT_ID', process.env.VERCEL_PROJECT_ID),
      getSystemConfig('VERCEL_AUTH_BEARER_TOKEN', process.env.VERCEL_AUTH_BEARER_TOKEN),
    ]);
    if (!apiUrl || !projectId || !token) {
      res.status(500).json({ errors: { error: { msg: 'Vercel domain integration is not configured' } } });
      return;
    }
    const response = await api(
      `${apiUrl}/v9/projects/${projectId}/domains${teamId ? `?teamId=${teamId}` : ''}`,
      {
        body: { name: domainName },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
      }
    );

    if (!response.error) {
      const { apexName, verified, verification } = response;
      await createDomain(
        session.user.userId,
        session.user.email,
        req.query.workspaceSlug,
        domainName,
        apexName,
        verified,
        verification
      );
      if (workspace?.id) {
        await createAuditActivity(
          workspace.id,
          session.user.userId,
          {
            action: 'DOMAIN_CREATE',
            title: 'Domain created',
            metadata: { name: domainName, apexName, verified },
          },
          req
        );
      }
      res.status(200).json({ data: { domain: domainName } });
    } else {
      res
        .status(response.status)
        .json({ errors: { error: { msg: response.error.message } } });
    }
  } else if (method === 'PUT') {
    const session = await validateSession(req, res);
    const { domainName } = req.body;
    const workspace = await getWorkspace(session.user.userId, session.user.email, req.query.workspaceSlug);
    const [teamId, apiUrl, projectId, token] = await Promise.all([
      getSystemConfig('VERCEL_TEAM_ID', process.env.VERCEL_TEAM_ID),
      getSystemConfig('VERCEL_API_URL', process.env.VERCEL_API_URL),
      getSystemConfig('VERCEL_PROJECT_ID', process.env.VERCEL_PROJECT_ID),
      getSystemConfig('VERCEL_AUTH_BEARER_TOKEN', process.env.VERCEL_AUTH_BEARER_TOKEN),
    ]);
    if (!apiUrl || !projectId || !token) {
      res.status(500).json({ errors: { error: { msg: 'Vercel domain integration is not configured' } } });
      return;
    }
    const response = await api(
      `${apiUrl}/v9/projects/${projectId}/domains/${domainName}/verify${teamId ? `?teamId=${teamId}` : ''}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
      }
    );

    if (!response.error) {
      await verifyDomain(
        session.user.userId,
        session.user.email,
        req.query.workspaceSlug,
        domainName,
        response.verified
      );
      if (workspace?.id) {
        await createAuditActivity(
          workspace.id,
          session.user.userId,
          {
            action: 'DOMAIN_VERIFY',
            title: 'Domain verification updated',
            metadata: { name: domainName, verified: response.verified },
          },
          req
        );
      }
      res.status(200).json({ data: { verified: response.verified } });
    } else {
      res
        .status(response.status)
        .json({ errors: { error: { msg: response.error.message } } });
    }
  } else if (method === 'DELETE') {
    const session = await validateSession(req, res);
    const { domainName } = req.body;
    const workspace = await getWorkspace(session.user.userId, session.user.email, req.query.workspaceSlug);
    const [teamId, apiUrl, projectId, token] = await Promise.all([
      getSystemConfig('VERCEL_TEAM_ID', process.env.VERCEL_TEAM_ID),
      getSystemConfig('VERCEL_API_URL', process.env.VERCEL_API_URL),
      getSystemConfig('VERCEL_PROJECT_ID', process.env.VERCEL_PROJECT_ID),
      getSystemConfig('VERCEL_AUTH_BEARER_TOKEN', process.env.VERCEL_AUTH_BEARER_TOKEN),
    ]);
    if (!apiUrl || !projectId || !token) {
      res.status(500).json({ errors: { error: { msg: 'Vercel domain integration is not configured' } } });
      return;
    }
    await api(
      `${apiUrl}/v8/projects/${projectId}/domains/${domainName}${teamId ? `?teamId=${teamId}` : ''}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'DELETE',
      }
    );
    await deleteDomain(
      session.user.userId,
      session.user.email,
      req.query.workspaceSlug,
      domainName
    );
    if (workspace?.id) {
      await createAuditActivity(
        workspace.id,
        session.user.userId,
        { action: 'DOMAIN_DELETE', title: 'Domain deleted', metadata: { name: domainName } },
        req
      );
    }
    res.status(200).json({ data: { domain: domainName } });
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
