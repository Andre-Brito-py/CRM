import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { getWorkspaceLimits, isModuleAllowed } from '@/lib/server/subscription';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { msg: 'Method not allowed' } });
  }

  const session = await validateSession(req, res);
  if (!session) return;

  const { workspaceSlug } = req.query;

  try {
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: { some: { email: session.user.email, deletedAt: null } },
      },
      select: { id: true },
    });

    if (!workspace) {
      return res.status(404).json({ error: { msg: 'Workspace not found' } });
    }

    // Check if the plan allows Meta Ads
    const isAllowed = await isModuleAllowed(workspace.id, 'meta_ads');
    if (!isAllowed) {
      return res.status(403).json({ 
        error: { 
          msg: 'Sua assinatura atual não inclui o módulo de Meta Ads Analytics. Faça o upgrade para liberar esta função.' 
        } 
      });
    }

    // Check integration status
    const integration = await prisma.integration.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId: workspace.id,
          provider: 'META_ADS',
        },
      },
    });

    if (!integration || !integration.enabled || !integration.credentials?.accessToken) {
      if (workspaceSlug === 'acme-corp-premium') {
        return res.status(200).json({
          data: {
            summary: {
              spend: 12450.60,
              impressions: 485000,
              clicks: 12400,
              leads: 842,
              cpl: 14.78,
              roas: 4.2,
            },
            trend: [
              { date: '2026-03-01', value: 450 },
              { date: '2026-03-05', value: 890 },
              { date: '2026-03-10', value: 1200 },
              { date: '2026-03-15', value: 1100 },
              { date: '2026-03-20', value: 2500 },
              { date: '2026-03-25', value: 3800 },
              { date: '2026-03-31', value: 3510.60 },
            ],
            campaigns: [
              { id: 'mock-1', name: 'Lead Gen - Brasil - Top Performers', status: 'ACTIVE', spend: 4500, leads: 320, cpl: 14.06, ctr: 2.8, channel: ['facebook', 'instagram'], adAccountName: 'Acme Premium Ads' },
              { id: 'mock-2', name: 'Retargeting - Abandono de Carrinho', status: 'ACTIVE', spend: 2800.50, leads: 154, cpl: 18.18, ctr: 4.2, channel: ['instagram'], adAccountName: 'Acme Premium Ads' },
              { id: 'mock-3', name: 'Brand Awareness - Q1 2026', status: 'PAUSED', spend: 5150.10, leads: 368, cpl: 13.99, ctr: 1.5, channel: ['facebook'], adAccountName: 'Acme Premium Ads' },
            ],
            isConnected: true,
            isDemo: true,
          },
        });
      }

      return res.status(200).json({
        data: {
          summary: { spend: 0, impressions: 0, clicks: 0, leads: 0, cpl: 0, roas: 0 },
          campaigns: [],
          isConnected: false,
          isDemo: false,
        },
      });
    }

    const accessToken = integration.credentials.accessToken;
    const limits = await getWorkspaceLimits(workspace.id);
    const maxAdAccounts = limits.maxAdAccounts;

    // 1. Fetch Ad Accounts for this User
    const adAccountsRes = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name&access_token=${accessToken}`);
    const adAccountsData = await adAccountsRes.json();

    if (adAccountsData.error) {
       console.error("Meta Graph API error (ad accounts):", adAccountsData.error);
       return res.status(500).json({ error: { msg: 'Failed to access Meta Graph API (Token might be invalid)' } });
    }

    let adAccountsToProcess = adAccountsData.data || [];
    
    // Apply Plan limitations
    if (typeof maxAdAccounts === 'number' && maxAdAccounts > 0) {
       adAccountsToProcess = adAccountsToProcess.slice(0, maxAdAccounts);
    }

    if (adAccountsToProcess.length === 0) {
        return res.status(200).json({
            data: {
                summary: { spend: 0, impressions: 0, clicks: 0, leads: 0, cpl: 0, roas: 0 },
                campaigns: [],
                isConnected: true,
                isDemo: false,
                message: 'No active Ad Accounts found.'
            },
        });
    }

    // 2. Fetch specific Insights for each allowed Ad Account
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalLeads = 0;
    let campaignsList = [];

    // Fields to request from Meta Marketing API
    // We want campaigns with insights over the last 30 days.
    const fields = 'id,name,status,daily_budget,objective,insights.date_preset(last_30d){impressions,clicks,spend,actions}';
    
    for (const adAccount of adAccountsToProcess) {
        const campaignsRes = await fetch(`https://graph.facebook.com/v19.0/${adAccount.id}/campaigns?fields=${encodeURIComponent(fields)}&access_token=${accessToken}`);
        const campaignsData = await campaignsRes.json();

        if (campaignsData.error) {
            console.error(`Meta Graph API error fetching campaigns for ${adAccount.id}:`, campaignsData.error);
            continue;
        }

        const campaigns = campaignsData.data || [];

        for (const camp of campaigns) {
            const insight = camp.insights?.data?.[0];
            
            let spend = 0, impressions = 0, clicks = 0, leads = 0;

            if (insight) {
                spend = parseFloat(insight.spend || 0);
                impressions = parseInt(insight.impressions || 0, 10);
                clicks = parseInt(insight.clicks || 0, 10);
                
                // Parse lead events
                const actions = insight.actions || [];
                const leadAction = actions.find(a => a.action_type === 'lead');
                if (leadAction) {
                    leads = parseInt(leadAction.value || 0, 10);
                }
            }

            const cpl = leads > 0 ? (spend / leads) : 0;
            const ctr = impressions > 0 ? ((clicks / impressions) * 100) : 0;

            totalSpend += spend;
            totalImpressions += impressions;
            totalClicks += clicks;
            totalLeads += leads;

            campaignsList.push({
                id: camp.id,
                name: camp.name,
                objective: camp.objective,
                status: camp.status,
                spend,
                impressions,
                clicks,
                leads,
                cpl,
                ctr,
                channel: ['facebook', 'instagram'], // Mocked visualization channel for now
                startDate: insight?.date_start || '',
                dailyBudget: camp.daily_budget ? (parseInt(camp.daily_budget, 10) / 100) : null,
                adAccountName: adAccount.name
            });
        }
    }

    const overallCpl = totalLeads > 0 ? parseFloat((totalSpend / totalLeads).toFixed(2)) : 0;
    const roas = 0; // Requires purchase value attribution implementation

    return res.status(200).json({
      data: {
        summary: {
          spend: parseFloat(totalSpend.toFixed(2)),
          impressions: totalImpressions,
          clicks: totalClicks,
          leads: totalLeads,
          cpl: overallCpl,
          roas,
        },
        campaigns: campaignsList,
        isConnected: true,
        isDemo: false,
      },
    });
  } catch (error) {
    console.error('Error fetching ads metrics:', error);
    return res.status(500).json({ error: { msg: 'Internal server error' } });
  }
}
