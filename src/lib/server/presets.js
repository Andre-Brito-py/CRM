export const INDUSTRY_PRESETS = [
  {
    id: 'real_estate',
    name: 'Real Estate (Imobiliária)',
    description: 'Optimized for real estate agencies managing property inquiries, viewings, and sales.',
    icon: 'HomeIcon',
    pipelines: [
      {
        name: 'Vendas de Imóveis',
        stages: [
          { name: 'Novo Lead', color: '#3b82f6' },
          { name: 'Contato Feito', color: '#8b5cf6' },
          { name: 'Visita Agendada', color: '#f59e0b' },
          { name: 'Em Negociação', color: '#10b981' },
          { name: 'Contrato Assinado', color: '#059669' },
          { name: 'Perdido', color: '#ef4444' }
        ]
      }
    ],
    customFields: [
      { key: 'property_type', label: 'Tipo de Imóvel', type: 'select', options: 'Apartamento, Casa, Terreno, Comercial', area: 'both' },
      { key: 'budget', label: 'Orçamento (Budget)', type: 'currency', required: false, area: 'sales' },
      { key: 'neighborhood', label: 'Bairro de Interesse', type: 'text', area: 'both' }
    ],
    tags: [
      { name: 'Comprador' },
      { name: 'Inquilino' },
      { name: 'Proprietário' },
      { name: 'Investidor' }
    ]
  },
  {
    id: 'clinic',
    name: 'Health Clinic (Clínica)',
    description: 'Perfect for health professionals scheduling appointments and managing patient relationships.',
    icon: 'HeartIcon',
    pipelines: [
      {
        name: 'Agendamentos',
        stages: [
          { name: 'Solicitação de Consulta', color: '#3b82f6' },
          { name: 'Triagem / Aguardando', color: '#8b5cf6' },
          { name: 'Consulta Confirmada', color: '#10b981' },
          { name: 'Atendimento Realizado', color: '#6366f1' },
          { name: 'Retorno Agendado', color: '#f59e0b' },
          { name: 'Cancelado/Faltou', color: '#ef4444' }
        ]
      }
    ],
    customFields: [
      { key: 'health_insurance', label: 'Convênio Médico', type: 'text', area: 'both' },
      { key: 'symptoms', label: 'Sintomas/Queixa', type: 'text', area: 'support' },
      { key: 'birth_date', label: 'Data de Nascimento', type: 'date', area: 'both' }
    ],
    tags: [
      { name: 'Primeira Consulta' },
      { name: 'Retorno' },
      { name: 'Urgência' },
      { name: 'Particular' }
    ]
  },
  {
    id: 'agency',
    name: 'Digital Agency / B2B',
    description: 'Standard B2B sales process for agencies selling services, contracts, and retainers.',
    icon: 'BriefcaseIcon',
    pipelines: [
      {
        name: 'Sales Pipeline (B2B)',
        stages: [
          { name: 'Prospect (Frio)', color: '#94a3b8' },
          { name: 'Lead Qualificado (MQL)', color: '#3b82f6' },
          { name: 'Reunião Realizada', color: '#8b5cf6' },
          { name: 'Proposta Enviada', color: '#f59e0b' },
          { name: 'Em Fechamento', color: '#10b981' },
          { name: 'Fechado (Ganho)', color: '#059669' },
          { name: 'Descartado', color: '#ef4444' }
        ]
      }
    ],
    customFields: [
      { key: 'company_size', label: 'Tamanho da Empresa', type: 'select', options: '1-10, 11-50, 51-200, 200+', area: 'sales' },
      { key: 'monthly_budget', label: 'Verba Mensal', type: 'select', options: '< 5k, 5k-15k, 15k-50k, 50k+', area: 'sales' },
      { key: 'website_url', label: 'Site da Empresa', type: 'url', area: 'both' }
    ],
    tags: [
      { name: 'Inbound' },
      { name: 'Outbound' },
      { name: 'Indicação' },
      { name: 'Enterprise' }
    ]
  }
];
