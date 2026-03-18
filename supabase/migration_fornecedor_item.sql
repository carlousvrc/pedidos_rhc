-- Migration: Add fornecedor column to pedidos_itens (per-item supplier)
ALTER TABLE pedidos_itens ADD COLUMN IF NOT EXISTS fornecedor TEXT;
