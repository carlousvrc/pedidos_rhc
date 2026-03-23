-- Migration: Notas Fiscais module
-- Requer bucket "notas-fiscais" criado manualmente no Supabase Storage

CREATE TABLE IF NOT EXISTS notas_fiscais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    numero TEXT NOT NULL,
    serie TEXT,
    chave_acesso TEXT,
    data_emissao TIMESTAMP WITH TIME ZONE,
    valor_total NUMERIC(14,2),
    fornecedor_nome TEXT,
    fornecedor_cnpj TEXT,
    pdf_path TEXT,
    xml_path TEXT,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'conferida', 'divergente')),
    uploaded_by UUID REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nf_chave_unique ON notas_fiscais(chave_acesso) WHERE chave_acesso IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_pedido_id ON notas_fiscais(pedido_id);

CREATE TABLE IF NOT EXISTS notas_fiscais_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nota_fiscal_id UUID NOT NULL REFERENCES notas_fiscais(id) ON DELETE CASCADE,
    pedido_item_id UUID REFERENCES pedidos_itens(id),
    codigo TEXT,
    descricao TEXT,
    ncm TEXT,
    cfop TEXT,
    unidade TEXT,
    quantidade NUMERIC(14,4),
    valor_unitario NUMERIC(14,4),
    valor_total NUMERIC(14,2),
    confronto TEXT CHECK (confronto IN ('conforme', 'divergente_qtd', 'divergente_valor', 'nao_encontrado', 'item_extra')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nf_itens_nota_id ON notas_fiscais_itens(nota_fiscal_id);
CREATE INDEX IF NOT EXISTS idx_nf_itens_pedido_item ON notas_fiscais_itens(pedido_item_id);
