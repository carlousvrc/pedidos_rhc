-- ==========================================
-- SCRIPT DE INSERÇÃO DE DADOS MOCK (TESTE)
-- ==========================================
-- Execute este script no SQL Editor do seu painel Supabase
-- Ele criará as tabelas caso não existam e inserirá dados de teste
-- para que o fluxo "Novo Pedido" e "Dashboard" funcionem.

-- 1. Criação das tabelas (Caso ainda não existam no seu projeto)
CREATE TABLE IF NOT EXISTS unidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL,
    referencia TEXT,
    nome TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_pedido TEXT NOT NULL,
    status TEXT NOT NULL,
    data_pedido TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unidade_id UUID REFERENCES unidades(id)
);

CREATE TABLE IF NOT EXISTS pedidos_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
    item_id UUID REFERENCES itens(id) ON DELETE CASCADE,
    quantidade INTEGER NOT NULL
);

-- 2. Inserção de Unidades Hospitalares
INSERT INTO unidades (nome) VALUES 
('CTI Adulto'),
('Pronto Socorro'),
('Centro Cirúrgico'),
('Pediatria'),
('Maternidade'),
('Enfermaria 3A'),
('Ambulatório Central')
ON CONFLICT DO NOTHING;

-- 3. Inserção de Itens/Materiais Hospitalares
INSERT INTO itens (codigo, referencia, nome) VALUES 
('1001', 'CX-100', 'Luva de Procedimento Tamanho M (Caixa com 100)'),
('1002', 'CX-100', 'Luva de Procedimento Tamanho G (Caixa com 100)'),
('2001', 'PCT-50', 'Seringa 10ml sem agulha (Pacote com 50)'),
('2002', 'PCT-50', 'Seringa 20ml com agulha (Pacote com 50)'),
('3001', 'UN', 'Cateter Venoso Periférico 20G'),
('3002', 'UN', 'Cateter Venoso Periférico 22G'),
('4001', 'RL', 'Atadura de Crepe 10cm x 1,8m'),
('5001', 'CX-50', 'Máscara Cirúrgica Tripla com Elástico (Caixa com 50)'),
('6001', 'FR-250', 'Álcool Gel 70% 250ml'),
('7001', 'CX-50', 'Avental Descartável Impermeável (Caixa com 50)'),
('8001', 'PCT-10', 'Compressa de Gaze Hidrófila (Pacote com 10)'),
('9001', 'CX-10', 'Fio de Sutura Nylon 3-0 (Caixa com 10)'),
('10001', 'UN', 'Sonda Uretral Nº 12'),
('11001', 'CX-100', 'Agulha Hipodérmica 40x12 (Caixa com 100)'),
('12001', 'FR-500', 'Soro Fisiológico 0,9% 500ml')
ON CONFLICT DO NOTHING;

-- Nota: Os pedidos e itens de pedidos serão gerados naturalmente
-- quando você utilizar a tela "Novo Pedido" no sistema.
