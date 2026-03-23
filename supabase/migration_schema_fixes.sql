-- ============================================================================
-- Migration: Schema corrections and performance improvements
-- Date: 2026-03-23
-- ============================================================================

-- ── 1. INDEXES DE PERFORMANCE ──────────────────────────────────────────────
-- Colunas frequentemente usadas em WHERE, JOIN e ORDER BY

-- pedidos: filtrado por status, unidade, usuario, e ordenado por created_at
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_unidade_id ON pedidos(unidade_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_id ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at DESC);

-- pedidos_itens: sempre joinado por pedido_id e item_id
CREATE INDEX IF NOT EXISTS idx_pedidos_itens_pedido_id ON pedidos_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_itens_item_id ON pedidos_itens(item_id);

-- aprovacoes: consultado por pedido_id para contagem
CREATE INDEX IF NOT EXISTS idx_aprovacoes_pedido_id ON aprovacoes(pedido_id);

-- pedido_alteracoes: consultado por pedido_id para exibição
CREATE INDEX IF NOT EXISTS idx_pedido_alteracoes_pedido_id ON pedido_alteracoes(pedido_id);

-- notificacoes: consultado por pedido_id
CREATE INDEX IF NOT EXISTS idx_notificacoes_pedido_id ON notificacoes(pedido_id);


-- ── 2. CHECK CONSTRAINT NO STATUS DO PEDIDO ────────────────────────────────
-- Garante que apenas status válidos sejam inseridos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_status_check'
    ) THEN
        ALTER TABLE pedidos ADD CONSTRAINT pedidos_status_check
            CHECK (status IN (
                'Aguardando Aprovação',
                'Pendente',
                'Em Cotação',
                'Realizado',
                'Recebido'
            ));
    END IF;
END $$;


-- ── 3. INDEX EM itens.codigo ────────────────────────────────────────────────
-- O PDF faz match por código — index para acelerar buscas (não unique pois
-- o catálogo possui itens com mesmo código em tipos/referências diferentes)
CREATE INDEX IF NOT EXISTS idx_itens_codigo ON itens(codigo);


-- ── 4. UNIQUE EM numero_pedido ─────────────────────────────────────────────
-- Evita pedidos duplicados com mesmo número
CREATE UNIQUE INDEX IF NOT EXISTS idx_pedidos_numero_unique
    ON pedidos(numero_pedido) WHERE numero_pedido IS NOT NULL;


-- ── 5. CAMPO updated_at EM pedidos ─────────────────────────────────────────
-- Permite rastrear quando um pedido foi alterado pela última vez
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS updated_at
    TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_pedidos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pedidos_updated_at ON pedidos;
CREATE TRIGGER trg_pedidos_updated_at
    BEFORE UPDATE ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION update_pedidos_updated_at();


-- ── 6. CAMPO updated_at EM pedidos_itens ───────────────────────────────────
ALTER TABLE pedidos_itens ADD COLUMN IF NOT EXISTS updated_at
    TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE OR REPLACE FUNCTION update_pedidos_itens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pedidos_itens_updated_at ON pedidos_itens;
CREATE TRIGGER trg_pedidos_itens_updated_at
    BEFORE UPDATE ON pedidos_itens
    FOR EACH ROW
    EXECUTE FUNCTION update_pedidos_itens_updated_at();


-- ── 7. INDEX COMPOSTO PARA QUERIES COMUNS ──────────────────────────────────
-- Otimiza a query do dashboard que filtra por status + unidade
CREATE INDEX IF NOT EXISTS idx_pedidos_status_unidade
    ON pedidos(status, unidade_id);

-- Otimiza queries de remanejamento que buscam por item_id + pedido_destino
CREATE INDEX IF NOT EXISTS idx_remanejamentos_item_destino
    ON remanejamentos(item_id, pedido_destino_id);
