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
      { key: 'neighborhood', label: 'Bairro de Interesse', type: 'text', area: 'both' },
      { key: 'financing_status', label: 'Status Financiamento', type: 'select', options: 'Aprovado, Em Análise, Não Solicitado, Pagamento à Vista', area: 'sales' },
      { key: 'monthly_income', label: 'Renda Mensal (Família)', type: 'currency', area: 'sales' }
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
  },
  {
    id: 'restaurant',
    name: 'Restaurante / Eventos',
    description: 'Ideal para restaurantes gerenciarem reservas, orçamentos para eventos e feedback de clientes.',
    icon: 'StarIcon',
    pipelines: [
      {
        name: 'Reservas e Eventos',
        stages: [
          { name: 'Nova Solicitação', color: '#3b82f6' },
          { name: 'Negociando / Orçamento', color: '#f59e0b' },
          { name: 'Reserva Confirmada', color: '#10b981' },
          { name: 'Evento Realizado', color: '#8b5cf6' },
          { name: 'Cancelado', color: '#ef4444' }
        ]
      }
    ],
    customFields: [
      { key: 'party_size', label: 'Número de Pessoas', type: 'number', area: 'both' },
      { key: 'event_date', label: 'Data do Evento', type: 'date', area: 'both' },
      { key: 'dietary_restrictions', label: 'Restrições Alimentares', type: 'text', area: 'support' }
    ],
    tags: [
      { name: 'Aniversário' },
      { name: 'Corporativo' },
      { name: 'VIP' },
      { name: 'Casamento' }
    ]
  },
  {
    id: 'infoproducts',
    name: 'Infoprodutos / Edtech',
    description: 'Focado em vendas de cursos, preenchimento de carrinhos abandonados e suporte a alunos.',
    icon: 'AcademicCapIcon',
    pipelines: [
      {
        name: 'Vendas de Infoprodutos',
        stages: [
          { name: 'Lead Frio', color: '#94a3b8' },
          { name: 'Engajamento', color: '#3b82f6' },
          { name: 'Carrinho Abandonado', color: '#f59e0b' },
          { name: 'Recuperação de Boleto/Pix', color: '#ef4444' },
          { name: 'Fechado (Ganho)', color: '#10b981' },
          { name: 'Perdido', color: '#64748b' }
        ]
      }
    ],
    customFields: [
      { key: 'product_interest', label: 'Produto de Interesse', type: 'text', area: 'both' },
      { key: 'utm_source', label: 'Origem (Tráfego)', type: 'text', area: 'both' },
      { key: 'payment_method', label: 'Método de Pagamento', type: 'select', options: 'Cartão de Crédito, Pix, Boleto', area: 'sales' }
    ],
    tags: [
      { name: 'Afiliado' },
      { name: 'Orgânico' },
      { name: 'Mentoria' },
      { name: 'Desistente' }
    ]
  },
  {
    id: 'solar_energy',
    name: 'Energia Solar / B2B',
    description: 'Gestão de orçamentos e execução de projetos fotovoltaicos residenciais e comerciais.',
    icon: 'SunIcon',
    pipelines: [
      {
        name: 'Projetos Fotovoltaicos',
        stages: [
          { name: 'Novos Leads', color: '#3b82f6' },
          { name: 'Visita Técnica / Medição', color: '#8b5cf6' },
          { name: 'Proposta Apresentada', color: '#f59e0b' },
          { name: 'Aprovação de Crédito', color: '#6366f1' },
          { name: 'Obra em Andamento', color: '#10b981' },
          { name: 'Projeto Concluído', color: '#059669' }
        ]
      }
    ],
    customFields: [
      { key: 'avg_consumption', label: 'Consumo Médio (R$)', type: 'currency', area: 'sales' },
      { key: 'roof_type', label: 'Tipo de Telhado', type: 'text', area: 'both' },
      { key: 'utility_company', label: 'Concessionária', type: 'text', area: 'both' }
    ],
    tags: [
      { name: 'Residencial' },
      { name: 'Comercial' },
      { name: 'Rural' },
      { name: 'Urgente' }
    ]
  },
  {
    id: 'aesthetics',
    name: 'Clínica de Estética / Odonto',
    description: 'Criado para clínicas de estética, harmonização facial, odonto e bem-estar.',
    icon: 'SparklesIcon',
    pipelines: [
      {
        name: 'Tratamentos e Avaliações',
        stages: [
          { name: 'Interessado (WhatsApp)', color: '#3b82f6' },
          { name: 'Avaliação Agendada', color: '#8b5cf6' },
          { name: 'Orçamento Apresentado', color: '#f59e0b' },
          { name: 'Tratamento em Andamento', color: '#10b981' },
          { name: 'Tratamento Concluído', color: '#059669' },
          { name: 'Retorno (Follow-up)', color: '#6366f1' }
        ]
      }
    ],
    customFields: [
      { key: 'desired_procedure', label: 'Procedimento Desejado', type: 'text', area: 'both' },
      { key: 'has_allergies', label: 'Possui Alergias?', type: 'select', options: 'Sim, Não', area: 'support' },
      { key: 'previous_treatments', label: 'Já fez tratamento similar?', type: 'text', area: 'sales' },
      { key: 'appointment_date', label: 'Data da Avaliação', type: 'date', area: 'both' }
    ],
    tags: [
      { name: 'Botox' },
      { name: 'Harmonização' },
      { name: 'Limpeza de Pele' },
      { name: 'Lipo' }
    ]
  },
  {
    id: 'dealership',
    name: 'Concessionária e Veículos',
    description: 'Operação comercial de vendas de carros novos, seminovos e repasses.',
    icon: 'TruckIcon',
    pipelines: [
      {
        name: 'Venda de Veículos',
        stages: [
          { name: 'Lead Internet (Site/Wpp)', color: '#3b82f6' },
          { name: 'Atendimento na Loja', color: '#8b5cf6' },
          { name: 'Test Drive Agendado', color: '#f59e0b' },
          { name: 'Ficha de Financiamento', color: '#6366f1' },
          { name: 'Carro Entregue', color: '#10b981' },
          { name: 'Lead Frio', color: '#ef4444' }
        ]
      }
    ],
    customFields: [
      { key: 'car_model_interest', label: 'Veículo de Interesse', type: 'text', area: 'both' },
      { key: 'has_trade_in', label: 'Carro na Troca?', type: 'select', options: 'Sim, Não', area: 'sales' },
      { key: 'trade_in_details', label: 'Detalhes do Usado (Modelo/Ano)', type: 'text', area: 'sales' },
      { key: 'down_payment', label: 'Valor de Entrada (R$)', type: 'currency', area: 'sales' }
    ],
    tags: [
      { name: 'Seminovo' },
      { name: 'Zero KM' },
      { name: 'Financiamento 100%' },
      { name: 'Repasse' }
    ]
  }
];
