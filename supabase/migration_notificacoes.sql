-- Adiciona campo para registrar qual comprador atendeu o pedido
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS atendido_por uuid REFERENCES usuarios(id);

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notificacoes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    pedido_id   uuid REFERENCES pedidos(id) ON DELETE CASCADE,
    tipo        text NOT NULL CHECK (tipo IN ('recebimento', 'divergencia', 'pendencia', 'status')),
    mensagem    text NOT NULL,
    lida        boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notificacoes_usuario_id_idx ON notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS notificacoes_lida_idx ON notificacoes(usuario_id, lida);
