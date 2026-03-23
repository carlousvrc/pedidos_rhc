-- Migration: Add valor_unitario column to pedidos_itens
ALTER TABLE pedidos_itens ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC(12,2) DEFAULT 0;
