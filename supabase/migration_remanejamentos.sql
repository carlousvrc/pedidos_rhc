-- Migration: Remanejamentos entre unidades
-- Tracks when a buyer consolidates items from one unit's order to arrive at another unit

CREATE TABLE IF NOT EXISTS remanejamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_item_origem_id UUID NOT NULL REFERENCES pedidos_itens(id) ON DELETE CASCADE,
    unidade_destino_id UUID NOT NULL REFERENCES unidades(id),
    item_id UUID NOT NULL REFERENCES itens(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups from both sides
CREATE INDEX IF NOT EXISTS idx_remanejamentos_origem ON remanejamentos(pedido_item_origem_id);
CREATE INDEX IF NOT EXISTS idx_remanejamentos_unidade_destino ON remanejamentos(unidade_destino_id);
