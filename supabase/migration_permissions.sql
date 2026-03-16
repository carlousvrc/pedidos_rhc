-- Migration: add permissoes JSONB to usuarios
-- permissoes stores module access flags and order scope

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permissoes JSONB DEFAULT '{
  "scope": "operador",
  "modulos": {
    "pedidos": true,
    "historico": true,
    "itens": false,
    "relatorios": false,
    "bionexo": false,
    "usuarios": false
  }
}'::jsonb;

-- Admin users get full access
UPDATE usuarios
SET permissoes = '{
  "scope": "admin",
  "modulos": {
    "pedidos": true,
    "historico": true,
    "itens": true,
    "relatorios": true,
    "bionexo": true,
    "usuarios": true
  }
}'::jsonb
WHERE role = 'admin';

-- Comprador users see all orders + bionexo
UPDATE usuarios
SET permissoes = '{
  "scope": "admin",
  "modulos": {
    "pedidos": true,
    "historico": true,
    "itens": false,
    "relatorios": true,
    "bionexo": true,
    "usuarios": false
  }
}'::jsonb
WHERE role = 'comprador';
