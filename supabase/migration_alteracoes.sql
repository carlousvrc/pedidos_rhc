-- Migration: Change log for orders
CREATE TABLE IF NOT EXISTS pedido_alteracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('item_adicionado', 'item_removido', 'quantidade_alterada')),
    item_nome TEXT NOT NULL,
    item_codigo TEXT NOT NULL DEFAULT '',
    valor_anterior TEXT,
    valor_novo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
