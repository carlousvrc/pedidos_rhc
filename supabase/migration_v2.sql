-- Migration v2: Role-based flow, quantities tracking, and new statuses

-- Add unidade_id to usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS unidade_id UUID REFERENCES unidades(id);

-- Add usuario_id to pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios(id);

-- Extend pedidos_itens with Bionexo and receipt tracking
ALTER TABLE pedidos_itens ADD COLUMN IF NOT EXISTS quantidade_atendida INTEGER DEFAULT 0;
ALTER TABLE pedidos_itens ADD COLUMN IF NOT EXISTS quantidade_recebida INTEGER DEFAULT 0;
ALTER TABLE pedidos_itens ADD COLUMN IF NOT EXISTS observacao TEXT DEFAULT '';

-- Seed comprador user (password: comprador123)
INSERT INTO usuarios (username, password_hash, nome, role)
VALUES ('comprador', 'comprador123', 'Comprador RHC', 'comprador')
ON CONFLICT DO NOTHING;

-- Update existing 'user' roles to 'solicitante'
UPDATE usuarios SET role = 'solicitante' WHERE role = 'user';

-- Update old status values to new ones
UPDATE pedidos SET status = 'Realizado' WHERE status = 'Atendido';
UPDATE pedidos SET status = 'Pendente' WHERE status = 'Cancelado';
