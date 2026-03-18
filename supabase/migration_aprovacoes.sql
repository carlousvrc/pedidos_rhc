-- Migration: Approval workflow
-- Adds aprovacoes table and aprovador role

-- 1. Drop and recreate the role constraint to include 'aprovador'
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_role_check
    CHECK (role IN ('admin', 'user', 'solicitante', 'comprador', 'aprovador'));

-- 2. Create aprovacoes table
CREATE TABLE IF NOT EXISTS aprovacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pedido_id, usuario_id)
);
