-- Adiciona campo para observação de divergência no recebimento
ALTER TABLE pedidos_itens ADD COLUMN IF NOT EXISTS observacao_recebimento text;

-- Adiciona campo para item efetivamente recebido (quando diferente do solicitado)
ALTER TABLE pedidos_itens ADD COLUMN IF NOT EXISTS item_recebido_id uuid REFERENCES itens(id);
