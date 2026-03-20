// ─────────────────────────────────────────────────────────────────────────────
// CONTEÚDO DA DOCUMENTAÇÃO E ASSISTENTE
//
// Edite este arquivo para atualizar a documentação e o assistente de ajuda
// sempre que houver melhorias ou mudanças no sistema.
// ─────────────────────────────────────────────────────────────────────────────

export interface DocStep {
    title: string;
    description: string;
}

export interface DocFaq {
    question: string;
    answer: string;
}

export interface DocSection {
    id: string;
    title: string;
    icon: string;           // nome do ícone lucide
    color: string;          // classe tailwind de cor
    badge?: string;         // label opcional (ex: "Comprador", "Admin")
    shortDescription: string;
    fullDescription: string;
    roles?: string[];       // quem pode usar este módulo
    steps: DocStep[];
    tips: string[];
    faq: DocFaq[];
    urlPatterns: string[];  // padrões de URL para ativar no assistente
}

export const DOC_VERSION = '1.3.0';
export const DOC_UPDATED = '2026-03-19';

export const docSections: DocSection[] = [
    {
        id: 'dashboard',
        title: 'Dashboard',
        icon: 'LayoutDashboard',
        color: 'text-[#001A72] bg-blue-50',
        shortDescription: 'Visão geral do sistema com KPIs, acesso rápido aos módulos e alertas.',
        fullDescription: `O Dashboard é a tela inicial do sistema. Nele você encontra os cartões de status dos pedidos (Total, Pendentes, Em Cotação, Realizados e Recebidos), atalhos rápidos para os principais módulos e alertas de divergências de recebimento para compradores.

O painel é atualizado em tempo real via Supabase Realtime — qualquer alteração feita por outro usuário aparece automaticamente sem precisar recarregar a página.`,
        roles: ['Todos os perfis'],
        steps: [
            { title: 'Acesse o sistema', description: 'Entre com seu e-mail e senha na tela de login. Ao confirmar, você será redirecionado ao Dashboard.' },
            { title: 'Verifique os KPIs', description: 'Os cartões no topo mostram a quantidade de pedidos por status. Passe o mouse para ver o percentual em relação ao total.' },
            { title: 'Alertas de divergência', description: 'Se houver itens recebidos com divergência de apresentação, um painel vermelho aparecerá abaixo dos cartões. Compradores e admins devem revisá-lo diariamente.' },
            { title: 'Acesse um módulo', description: 'Clique em qualquer cartão de acesso rápido (Novo Pedido, Transferências, Relatórios etc.) para navegar diretamente.' },
        ],
        tips: [
            'O sino na barra superior pisca quando há divergências de recebimento registradas.',
            'Pedidos aguardando aprovação não aparecem para compradores.',
            'Clique no número de pedido na tabela para abrir o detalhe completo.',
        ],
        faq: [
            { question: 'Por que não vejo todos os pedidos?', answer: 'Isso depende do seu perfil. Solicitantes veem apenas seus próprios pedidos. Compradores e admins veem todos.' },
            { question: 'O sistema atualiza sozinho?', answer: 'Sim, via tempo real. Mas você pode forçar uma atualização clicando no ícone de refresh no canto superior direito.' },
        ],
        urlPatterns: ['/', '/dashboard'],
    },
    {
        id: 'pedidos',
        title: 'Pedidos',
        icon: 'ShoppingCart',
        color: 'text-[#001A72] bg-blue-50',
        shortDescription: 'Criação, acompanhamento e recebimento de pedidos de materiais.',
        fullDescription: `O módulo de Pedidos é o centro do sistema. Permite criar solicitações de materiais, acompanhar o status em cada etapa do fluxo e confirmar o recebimento físico com nota fiscal.

**Fluxo completo de um pedido:**
1. Solicitante cria o pedido → status "Aguardando Aprovação"
2. Aprovador libera → status "Pendente"
3. Comprador trabalha na cotação → status "Em Cotação"
4. Comprador finaliza o atendimento → status "Realizado"
5. Solicitante confirma recebimento físico → status "Recebido"

**Divergências:** Ao receber, se um item chegou com apresentação diferente do pedido (ex: frasco → comprimido), registre uma observação de divergência. O comprador será notificado automaticamente.`,
        roles: ['Solicitante', 'Aprovador', 'Comprador', 'Admin'],
        steps: [
            { title: 'Criar um novo pedido', description: 'Clique em "Novo Pedido" no Dashboard ou na barra de navegação. Selecione a unidade e adicione os itens desejados com as quantidades.' },
            { title: 'Aguardar aprovação', description: 'O pedido entra com status "Aguardando Aprovação". O aprovador da unidade receberá o aviso e poderá liberar ou recusar.' },
            { title: 'Acompanhar o pedido', description: 'Na tabela do Dashboard, clique no número do pedido para ver o espelho completo com todos os itens, fornecedores e quantidades atendidas.' },
            { title: 'Receber os itens', description: 'Quando o status for "Realizado", o solicitante acessa o pedido e confirma a quantidade recebida de cada item. Informe a quantidade real recebida no campo correspondente.' },
            { title: 'Registrar divergência', description: 'Se algum item chegou diferente do pedido, clique em "Registrar divergência" ao lado do item e descreva a diferença encontrada.' },
            { title: 'Exportar espelho (CSV)', description: 'No detalhe do pedido, use o botão "Exportar CSV" para baixar o espelho do pedido. Itens remanejados são excluídos automaticamente da exportação.' },
        ],
        tips: [
            'Compradores não podem confirmar recebimento — essa ação é exclusiva dos solicitantes e admins.',
            'Use o campo "Observação" ao adicionar um item para incluir informações específicas para o comprador.',
            'O status muda automaticamente para "Recebido" quando todos os itens são confirmados.',
        ],
        faq: [
            { question: 'Posso editar um pedido já enviado?', answer: 'Sim, se você for admin. Acesse o pedido e clique em "Editar Pedido" para alterar itens e quantidades.' },
            { question: 'Como o item é remanejado?', answer: 'O comprador pode remanejar um item de um pedido para outro quando não há estoque suficiente para atender todos. O item passa a aparecer no módulo de Transferências.' },
            { question: 'O que é divergência de recebimento?', answer: 'É quando o material físico recebido tem apresentação diferente do pedido (ex: o pedido era por "frasco" mas chegou em "comprimido"). Deve ser registrado para que o comprador tome as providências necessárias.' },
        ],
        urlPatterns: ['/dashboard/pedidos'],
    },
    {
        id: 'transferencias',
        title: 'Transferências',
        icon: 'ArrowRightLeft',
        color: 'text-purple-700 bg-purple-50',
        shortDescription: 'Itens remanejados entre pedidos de diferentes unidades.',
        fullDescription: `Transferências (ou remanejamentos) ocorrem quando o comprador atende um item de uma unidade utilizando um pedido de outra unidade. Isso é comum quando há sobra em um pedido que pode suprir a necessidade de outro.

**Como funciona:**
- O comprador abre o pedido de origem e realiza o remanejamento indicando o pedido de destino.
- O item aparece no módulo de Transferências.
- A unidade que vai receber o material deve confirmar o recebimento informando a quantidade real recebida.`,
        roles: ['Solicitante', 'Comprador', 'Admin'],
        steps: [
            { title: 'Acessar Transferências', description: 'Clique em "Transferências" na barra de navegação ou no cartão de acesso rápido do Dashboard.' },
            { title: 'Identificar pendências', description: 'Transferências com status "Pendente" (laranja) ainda não foram confirmadas. As "Recebidas" (verde) já estão concluídas.' },
            { title: 'Confirmar recebimento', description: 'Na linha da transferência pendente, ajuste a quantidade recebida se necessário e clique em "Confirmar". O status muda para "Recebido" e o pedido de origem é atualizado.' },
        ],
        tips: [
            'O número de transferências pendentes aparece como badge vermelho no cartão do Dashboard e na barra superior.',
            'Compradores não podem confirmar transferências — apenas solicitantes e admins da unidade de destino.',
            'Clique no número do pedido para abrir o detalhe completo da transferência.',
        ],
        faq: [
            { question: 'Por que vejo transferências de outras unidades?', answer: 'Admins e compradores veem todas as transferências. Solicitantes veem apenas as que envolvem sua unidade.' },
            { question: 'Posso alterar a quantidade recebida?', answer: 'Sim, antes de confirmar você pode ajustar a quantidade para refletir o que foi realmente entregue.' },
        ],
        urlPatterns: ['/dashboard/transferencias'],
    },
    {
        id: 'relatorios',
        title: 'Relatórios',
        icon: 'BarChart3',
        color: 'text-emerald-700 bg-emerald-50',
        shortDescription: 'KPIs, funil de atendimento, alertas e exportação em PDF e Excel.',
        fullDescription: `O módulo de Relatórios oferece uma visão gerencial completa do sistema. Apresenta KPIs de pedidos por status, funil de atendimento (solicitado → atendido → recebido), ranking de itens mais solicitados, distribuição por unidade e alertas de itens não atendidos ou parcialmente atendidos.

**Exportação:** É possível gerar relatórios profissionais em PDF (com a logo do hospital) ou Excel (com abas separadas por categoria). Antes de exportar, um modal permite configurar os filtros de unidade e período.`,
        roles: ['Comprador', 'Admin'],
        steps: [
            { title: 'Acessar Relatórios', description: 'Clique em "Relatórios" na barra de navegação. O módulo é carregado com todos os dados sem filtro.' },
            { title: 'Aplicar filtros', description: 'Use o painel de Filtros para selecionar uma unidade específica e/ou um intervalo de datas. Os KPIs e tabelas se atualizam automaticamente.' },
            { title: 'Revisar alertas', description: 'Na seção "Alertas de Atendimento", verifique itens parcialmente atendidos (aba âmbar) e não atendidos (aba vermelha) em pedidos já realizados.' },
            { title: 'Exportar PDF', description: 'Clique em "PDF" no cabeçalho. Um modal abrirá para confirmar/ajustar os filtros. Clique em "Gerar PDF" para baixar o relatório com logo e dados formatados.' },
            { title: 'Exportar Excel', description: 'Clique em "Excel" e configure os filtros no modal. O arquivo gerado contém múltiplas abas: Resumo Geral, Top Itens, Por Unidade, alertas.' },
        ],
        tips: [
            'Os filtros do modal de exportação são pré-preenchidos com os filtros já aplicados na página.',
            'O Excel gerado tem abas de alertas (Parcialmente Atendidos e Não Atendidos) apenas quando há dados nessas categorias.',
            'A taxa de atendimento considera apenas pedidos com status Realizado ou Recebido.',
        ],
        faq: [
            { question: 'Por que o PDF não tem dados de uma unidade?', answer: 'Verifique se o filtro de unidade está configurado corretamente no modal de exportação. Se não houver pedidos para aquela unidade no período, o relatório ficará vazio.' },
            { question: 'Os alertas consideram todos os pedidos?', answer: 'Não — apenas pedidos com status "Realizado" ou "Recebido", pois nesses casos a compra já foi processada e a falta de atendimento é relevante.' },
        ],
        urlPatterns: ['/dashboard/relatorios'],
    },
    {
        id: 'historico',
        title: 'Histórico',
        icon: 'History',
        color: 'text-slate-700 bg-slate-100',
        shortDescription: 'Consulta e pesquisa de pedidos anteriores com filtros avançados.',
        fullDescription: `O módulo de Histórico permite pesquisar pedidos de qualquer período, filtrar por status, unidade, data e número. É ideal para consultas de pedidos já concluídos sem poluir a visão do Dashboard.`,
        roles: ['Todos os perfis'],
        steps: [
            { title: 'Acessar Histórico', description: 'Clique em "Histórico" na barra de navegação.' },
            { title: 'Pesquisar pedidos', description: 'Use os campos de filtro para buscar por número de pedido, unidade, status ou período de datas.' },
            { title: 'Visualizar detalhe', description: 'Clique no número do pedido para abrir o espelho completo com todos os itens e quantidades.' },
        ],
        tips: [
            'Combine múltiplos filtros para refinar a pesquisa.',
            'Solicitantes veem apenas seus próprios pedidos no histórico.',
        ],
        faq: [
            { question: 'O histórico tem limite de registros?', answer: 'O sistema carrega até 200 pedidos por vez, ordenados do mais recente para o mais antigo.' },
        ],
        urlPatterns: ['/dashboard/historico'],
    },
    {
        id: 'itens',
        title: 'Itens',
        icon: 'Package',
        color: 'text-orange-700 bg-orange-50',
        shortDescription: 'Catálogo de produtos e materiais disponíveis para solicitação.',
        fullDescription: `O módulo de Itens gerencia o catálogo de materiais disponíveis para pedidos. Cada item tem um código único e um nome. Os itens do catálogo são utilizados ao criar novos pedidos.`,
        roles: ['Admin'],
        steps: [
            { title: 'Acessar o catálogo', description: 'Clique em "Itens" na barra de navegação.' },
            { title: 'Pesquisar itens', description: 'Use a barra de pesquisa para filtrar por nome ou código.' },
            { title: 'Adicionar novo item', description: 'Clique em "Novo Item", informe o código e o nome do material e salve.' },
            { title: 'Editar ou remover', description: 'Use os botões de ação na linha do item para editar as informações ou remover do catálogo.' },
        ],
        tips: [
            'O código do item deve ser único no sistema.',
            'Remover um item não exclui os pedidos históricos que o contém.',
        ],
        faq: [
            { question: 'Quem pode adicionar itens?', answer: 'Apenas administradores têm permissão para adicionar, editar ou remover itens do catálogo.' },
        ],
        urlPatterns: ['/dashboard/itens'],
    },
    {
        id: 'usuarios',
        title: 'Usuários',
        icon: 'Users',
        color: 'text-violet-700 bg-violet-50',
        shortDescription: 'Gerenciamento de usuários, perfis e permissões de acesso.',
        fullDescription: `O módulo de Usuários permite ao administrador criar contas, definir perfis e controlar o acesso aos módulos do sistema.

**Perfis disponíveis:**
- **Solicitante:** Cria pedidos, confirma recebimento. Vê apenas seus próprios pedidos.
- **Aprovador:** Aprova ou recusa pedidos da unidade.
- **Comprador:** Processa cotações, realiza remanejamentos e acessa relatórios. Não confirma recebimento.
- **Admin:** Acesso total a todos os módulos e funções.`,
        roles: ['Admin'],
        steps: [
            { title: 'Acessar Usuários', description: 'Clique em "Usuários" na barra de navegação (visível apenas para admins).' },
            { title: 'Criar usuário', description: 'Clique em "Novo Usuário". Preencha nome, e-mail, senha (use o ícone de olho para visualizar), selecione o perfil e a unidade.' },
            { title: 'Definir permissões', description: 'O perfil selecionado determina as permissões automáticas. Após criar, as permissões podem ser ajustadas individualmente.' },
            { title: 'Editar ou desativar', description: 'Na lista de usuários, use os botões de ação para editar dados ou desativar o acesso de um usuário.' },
        ],
        tips: [
            'A senha pode ser visualizada clicando e segurando o ícone de olho no campo de senha.',
            'Cada usuário deve estar associado a uma unidade para que os filtros de escopo funcionem corretamente.',
            'Compradores têm acesso a todos os pedidos, independente da unidade.',
        ],
        faq: [
            { question: 'Posso ter mais de um admin?', answer: 'Sim, não há limite de administradores no sistema.' },
            { question: 'O que acontece se eu remover um usuário?', answer: 'Os pedidos e registros históricos criados por ele são mantidos. Apenas o acesso ao sistema é revogado.' },
        ],
        urlPatterns: ['/dashboard/usuarios'],
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Conteúdo do assistente contextual (por padrão de URL)
// ─────────────────────────────────────────────────────────────────────────────

export interface ContextualGuide {
    urlPattern: string;
    title: string;
    quickTips: string[];
    mainWorkflow: { step: string; action: string }[];
}

export const contextualGuides: ContextualGuide[] = [
    {
        urlPattern: '/',
        title: 'Dashboard — Visão Geral',
        quickTips: [
            'Verifique o painel vermelho de divergências diariamente.',
            'Clique no número do pedido para abrir o espelho completo.',
            'O badge vermelho em Transferências indica pendências de recebimento.',
        ],
        mainWorkflow: [
            { step: '1', action: 'Revise os KPIs de status no topo' },
            { step: '2', action: 'Verifique alertas de divergência (painel vermelho)' },
            { step: '3', action: 'Confira transferências pendentes (badge laranja)' },
            { step: '4', action: 'Clique num pedido para abrir o detalhe' },
        ],
    },
    {
        urlPattern: '/dashboard/pedidos/novo',
        title: 'Criando um Novo Pedido',
        quickTips: [
            'Selecione a unidade antes de adicionar itens.',
            'Use o campo de observação para deixar recados ao comprador.',
            'Você pode adicionar quantos itens precisar antes de enviar.',
        ],
        mainWorkflow: [
            { step: '1', action: 'Selecione a unidade solicitante' },
            { step: '2', action: 'Clique em "Adicionar Item" e busque pelo nome ou código' },
            { step: '3', action: 'Informe a quantidade necessária' },
            { step: '4', action: 'Adicione observações se necessário' },
            { step: '5', action: 'Clique em "Enviar Pedido" para finalizar' },
        ],
    },
    {
        urlPattern: '/dashboard/pedidos/',
        title: 'Detalhe do Pedido',
        quickTips: [
            'Confirme o recebimento item a item, informando a quantidade real.',
            'Use "Registrar divergência" se o material chegou diferente do esperado.',
            'O CSV exportado não inclui itens remanejados.',
        ],
        mainWorkflow: [
            { step: '1', action: 'Verifique o status atual do pedido no topo' },
            { step: '2', action: 'Revise os itens com fornecedor e quantidade atendida' },
            { step: '3', action: 'Se status "Realizado": informe a qtd recebida de cada item' },
            { step: '4', action: 'Registre divergências caso algum item chegou diferente' },
            { step: '5', action: 'Clique em "Confirmar Recebimento" para salvar' },
        ],
    },
    {
        urlPattern: '/dashboard/transferencias',
        title: 'Confirmando Transferências',
        quickTips: [
            'Apenas a unidade de destino confirma o recebimento.',
            'Ajuste a quantidade antes de confirmar se necessário.',
            'Compradores não podem confirmar transferências.',
        ],
        mainWorkflow: [
            { step: '1', action: 'Identifique transferências com status "Pendente"' },
            { step: '2', action: 'Verifique o item, quantidade e unidade de origem' },
            { step: '3', action: 'Ajuste a quantidade recebida se diferente' },
            { step: '4', action: 'Clique em "Confirmar" para registrar o recebimento' },
        ],
    },
    {
        urlPattern: '/dashboard/relatorios',
        title: 'Gerando Relatórios',
        quickTips: [
            'Aplique filtros antes de exportar para um relatório mais preciso.',
            'O modal de exportação permite configurar período e unidade.',
            'O Excel tem múltiplas abas com diferentes visões dos dados.',
        ],
        mainWorkflow: [
            { step: '1', action: 'Selecione unidade e período no painel de Filtros' },
            { step: '2', action: 'Revise os KPIs e alertas na página' },
            { step: '3', action: 'Clique em "PDF" ou "Excel" no canto superior direito' },
            { step: '4', action: 'Ajuste os filtros no modal de exportação' },
            { step: '5', action: 'Clique em "Gerar PDF" ou "Gerar Excel"' },
        ],
    },
    {
        urlPattern: '/dashboard/usuarios',
        title: 'Gerenciando Usuários',
        quickTips: [
            'O perfil define automaticamente as permissões do usuário.',
            'Segure o botão de olho para ver a senha digitada.',
            'Cada usuário deve ser vinculado a uma unidade.',
        ],
        mainWorkflow: [
            { step: '1', action: 'Clique em "Novo Usuário"' },
            { step: '2', action: 'Preencha nome, e-mail e senha' },
            { step: '3', action: 'Selecione o perfil (Solicitante, Comprador, etc.)' },
            { step: '4', action: 'Vincule à unidade correspondente' },
            { step: '5', action: 'Clique em "Salvar"' },
        ],
    },
];
