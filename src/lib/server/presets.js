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
      { name: '🌟 Exemplo', color: '#fcd34d' },
      { name: 'Comprador' },
      { name: 'Inquilino' },
      { name: 'Proprietário' },
      { name: 'Investidor' }
    ],
    aiContext: "Você é um corretor de imóveis experiente e cordial do Vysify Imóveis. O seu objetivo é acolher os leads interessados, descobrir qual o perfil do imóvel buscado (orçamento, bairros, quartos) e focar sempre em AGENDAR UMA VISITA PRESENCIAL. Seja sempre atencioso e prestativo, nunca pressione o cliente, mas mantenha a conversa fluindo até ter as informações necessárias da ficha.",
    messageTemplates: [
      { name: 'Agendamento de Visita', content: 'Olá! 😊 Vimos seu interesse nos imóveis. Que tal agendarmos uma visita para você conhecer o espaço pessoalmente sem compromisso? Qual o melhor dia e horário para você?' },
      { name: 'Follow-up de Negociação', content: 'Oi! Só passando para saber se você já teve tempo de avaliar nossa última proposta. Estou à disposição se tiver qualquer dúvida!' },
      { name: 'Captação - Descobrir Perfil', content: 'Tudo bem? Para que eu separe as melhores opções, você busca imóveis em qual faixa de valor e quais bairros de preferência?' }
    ],
    demoData: [
      { contactName: 'Juliana Fernandes', dealTitle: 'Apto 3 Quartos - Jardins', amount: 850000, stageIndex: 0 },
      { contactName: 'Roberto Almeida', dealTitle: 'Casa Cond. Fechado', amount: 1200000, stageIndex: 2 },
      { contactName: 'Mariana Costa', dealTitle: 'Terreno Comercial', amount: 450000, stageIndex: 3 }
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
      { name: '🌟 Exemplo', color: '#fcd34d' },
      { name: 'Primeira Consulta' },
      { name: 'Retorno' },
      { name: 'Urgência' },
      { name: 'Particular' }
    ],
    aiContext: "Você é um atendente acolhedor e humanizado de uma clínica médica/odontológica no Vysify. Seu foco é realizar o pré-atendimento com empatia, perguntar sobre o motivo da consulta ou sintomas breves, verificar se possuem plano de saúde, e por fim AGENDAR a consulta confirmando dia e horário.",
    messageTemplates: [
      { name: 'Confirmação de Consulta', content: 'Olá! Passando para confirmar sua consulta amanhã. Podemos confirmar a sua presença? Em caso de imprevisto, por favor nos avise.' },
      { name: 'Boas Vindas / Triagem', content: 'Olá! Seja muito bem-vindo(a) ao nosso atendimento preliminar. Para agilizarmos, poderia me informar o motivo da consulta e se possui convênio médico?' }
    ],
    demoData: [
      { contactName: 'Carlos Mendonça', dealTitle: 'Consulta de Rotina', amount: 350, stageIndex: 0 },
      { contactName: 'Ana Beatriz', dealTitle: 'Retorno Exames', amount: 0, stageIndex: 2 }
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
      { name: '🌟 Exemplo', color: '#fcd34d' },
      { name: 'Inbound' },
      { name: 'Outbound' },
      { name: 'Indicação' },
      { name: 'Enterprise' }
    ],
    aiContext: "Você é um representante comercial de uma Agência de Marketing Digital B2B (Vysify). O objetivo é entender os desafios de crescimento da empresa do lead, perguntar sobre métricas atuais, e agendar uma reunião Discovery-Call com um de nossos executivos. Demonstre autoridade, fale de ROI e conversão.",
    messageTemplates: [
      { name: 'Follow-up de Proposta B2B', content: 'Fala gestor, tudo bom? Já conseguiram avaliar o cronograma e escopo que enviamos? Se sentirem necessidade, podemos fazer uma rápida call para alinhar os últimos pontos.' },
      { name: 'Convite p/ Reunião', content: 'Olá! Analisei as suas redes/site e identifiquei gargalos de conversão que estamos resolvendo para clientes do mesmo setor. Terça ou Quinta teriam 15min para eu apresentar esse plano pronto?' }
    ],
    demoData: [
      { contactName: 'Startup Tech Ltda', dealTitle: 'Gestão de Tráfego 6 Meses', amount: 18000, stageIndex: 1 },
      { contactName: 'Grupo Varejo Sul', dealTitle: 'Rebranding e Site', amount: 35000, stageIndex: 3 }
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
      { name: '🌟 Exemplo', color: '#fcd34d' },
      { name: 'Aniversário' },
      { name: 'Corporativo' },
      { name: 'VIP' },
      { name: 'Casamento' }
    ],
    aiContext: "Você é o concierge e host virtual de um excelente Restaurante e espaço de Eventos. Seu objetivo é ajudar nas reservas de mesa, fornecer o menu/cardápio quando solicitado e captar as informações de orçamentos maiores para eventos fechados.",
    messageTemplates: [
      { name: 'Confirmação de Reserva', content: 'Ótima notícia! Sua mesa já está reservada conosco. Ficamos muito felizes de receber vocês. Qualquer alteração no número de pessoas, nos avise!' },
      { name: 'Envio de Cardápio', content: 'Olá! Segue o link com nosso cardápio atualizado e carta de vinhos: [LINK].' }
    ],
    demoData: [
      { contactName: 'Fernanda Silveira', dealTitle: 'Aniversário 15 Pessoas', amount: 1200, stageIndex: 1 },
      { contactName: 'Corporate S/A', dealTitle: 'Confraternização Final de Ano', amount: 8500, stageIndex: 2 }
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
      { name: '🌟 Exemplo', color: '#fcd34d' },
      { name: 'Afiliado' },
      { name: 'Orgânico' },
      { name: 'Mentoria' },
      { name: 'Desistente' }
    ],
    aiContext: "Você é um especialista em fechamentos e consultoria de vendas de Cursos Digitais/Mentorias. Seu papel é tirar objeções do prospect, detalhar o que o curso entrega e conduzí-los até o checkout para finalizar a inscrição.",
    messageTemplates: [
      { name: 'Recuperação de Abandono', content: 'Opa, vi aqui que você iniciou o preenchimento para se inscrever mas não finalizou. Aconteceu algum probleminha técnico com o cartão ou ficou alguma dúvida sobre o conteúdo?' },
      { name: 'Boas-vindas a Alunos', content: 'Parabéns pela decisão de entrar para o treinamento! 🚀 Seus acessos já foram enviados por e-mail.' }
    ],
    demoData: [
      { contactName: 'Lucas Ferreira', dealTitle: 'Mentoria Elite - Abandono', amount: 1997, stageIndex: 2 },
      { contactName: 'Patrícia Gomes', dealTitle: 'Boleto Gerado - Curso Base', amount: 497, stageIndex: 3 }
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
      { name: '🌟 Exemplo', color: '#fcd34d' },
      { name: 'Residencial' },
      { name: 'Comercial' },
      { name: 'Rural' },
      { name: 'Urgente' }
    ],
    aiContext: "Você é um engenheiro/consultor técnico em Energia Solar. Você sabe explicar sobre Payback, economia na fatura e tipos de inversores. Seu objetivo é coletar a fatura de energia atual do cliente (perguntado o custo R$ médio) e agendar uma visita técnica.",
    messageTemplates: [
      { name: 'Solicitação de Fatura', content: 'Para que nosso engenheiro crie o pré-projeto exato, você poderia me enviar uma foto da sua última conta de luz? Só pra gente dimensionar o tamanho ideal do kit.' },
      { name: 'Follow-up de Financiamento', content: 'Tudo bem? Acabamos de receber a análise de crédito do banco para seu projeto e as taxas estão muito atrativas!' }
    ],
    demoData: [
      { contactName: 'Propriedade Rural XYZ', dealTitle: 'Usina Solo 50kWp', amount: 155000, stageIndex: 2 },
      { contactName: 'Renato Silva', dealTitle: 'Sistema Residencial Telhado', amount: 22000, stageIndex: 1 }
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
      { name: '🌟 Exemplo', color: '#fcd34d' },
      { name: 'Botox' },
      { name: 'Harmonização' },
      { name: 'Limpeza de Pele' },
      { name: 'Lipo' }
    ],
    aiContext: "Você é um consultor de bem-estar de uma renomada clínica de estética. Trate os leads com muita sofisticação, tire as dúvidas iniciais sobre os procedimentos estéticos e foque muito na importância da Consulta de Avaliação (que é essencial antes de orçamentar com precisão).",
    messageTemplates: [
      { name: 'Convite para Avaliação', content: 'Nós amamos a ideia desse procedimento! Mas para garantir o resultado perfeito, precisamos de uma avaliação personalizada com a Doutora. Que dia prefere vir tomar um café conosco e realizar a avaliação?' },
      { name: 'Recomendações Pós', content: 'Como você está se sentindo pós-procedimento? Lembre-se das nossas recomendações de não tomar sol direto nas próximas semanas. Qualquer desconforto nos chame!' }
    ],
    demoData: [
      { contactName: 'Isabela Muniz', dealTitle: 'Harmonização Full Face', amount: 5000, stageIndex: 2 },
      { contactName: 'Clarice Santos', dealTitle: 'Pacote Depilação Laser', amount: 890, stageIndex: 3 }
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
      { name: '🌟 Exemplo', color: '#fcd34d' },
      { name: 'Seminovo' },
      { name: 'Zero KM' },
      { name: 'Financiamento 100%' },
      { name: 'Repasse' }
    ],
    aiContext: "Você é um consultor de vendas automotivas. Desperte a emoção nos clientes que chamarem, fale das qualidades do carro perguntado, tente descobrir se eles têm usado na troca, perguntar qual a estimativa de entrada e agende um Test-Drive imperdível.",
    messageTemplates: [
      { name: 'Chamar p/ Test-Drive', content: 'Carro é igual a sapato né? Precisamos calçar pra ver se serve! Brincadeiras à parte, podemos agendar um test-drive amanhã pra você sentir o carro?' },
      { name: 'Pedido Dados de Avaliação', content: 'Perfeito, recebemos carros como parte do pagamento. Consegue me mandar 3 fotos do seu veículo (frente, traseira e painel) e ano/modelo para nossa equipe já pré-avaliar?' }
    ],
    demoData: [
      { contactName: 'Tiago Leoni', dealTitle: 'Corolla XEI 2023', amount: 135000, stageIndex: 1 },
      { contactName: 'Vitor Martins', dealTitle: 'Jeep Compass Longitude', amount: 165000, stageIndex: 3 }
    ]
  }
];
