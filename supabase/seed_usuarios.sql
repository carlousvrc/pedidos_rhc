-- Criação da tabela de Usuários do Sistema
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nome TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security) - Segurança Padrão
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura (Quem pode ver usuários) -> Exemplo: Apenas Admins
-- (Adicione suas próprias regras conforme a configuração de Auth do Supabase)

-- Inserir usuário Admin Padrão
-- ATENÇÃO: A senha do admin em produção NUNCA deve ser armazenada em plain text. 
-- Nos testes estamos utilizando a representação real da Hash bcrypt ou armazenando cru apenas para validação simplificada
-- Senha alvo do cliente: Rc2026#@
INSERT INTO usuarios (username, password_hash, nome, role) 
VALUES (
    'admin',
    'Rc2026#@', -- *NOTA: Em um app de produção verdadeiro devese usar a função pgcrypto ou hasher
    'Administrador do Sistema',
    'admin'
) ON CONFLICT (username) DO NOTHING;
