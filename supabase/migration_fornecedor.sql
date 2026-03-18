-- Migration: Add fornecedor column to pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS fornecedor TEXT;
