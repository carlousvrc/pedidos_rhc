-- Migration: Remanejamentos entre unidades
-- Tracks when a buyer consolidates items from one unit's order into another unit's order

CREATE TABLE IF NOT EXISTS remanejamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_item_origem_id UUID NOT NULL REFERENCES pedidos_itens(id) ON DELETE CASCADE,
    pedido_destino_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES itens(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups from both sides
CREATE INDEX IF NOT EXISTS idx_remanejamentos_origem ON remanejamentos(pedido_item_origem_id);
CREATE INDEX IF NOT EXISTS idx_remanejamentos_destino ON remanejamentos(pedido_destino_id);
