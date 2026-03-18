import { cookies } from 'next/headers';
import { supabase } from './supabase';
import { mockUsuarios } from './mockData';

export interface Permissoes {
    scope: 'operador' | 'admin';
    modulos: {
        pedidos: boolean;
        historico: boolean;
        itens: boolean;
        relatorios: boolean;
        bionexo: boolean;
        usuarios: boolean;
        transferencias: boolean;
    };
}

export interface Usuario {
    id: string;
    username: string;
    nome: string;
    role: 'admin' | 'comprador' | 'solicitante' | 'aprovador';
    unidade_id: string | null;
    permissoes: Permissoes;
}

const DEFAULT_PERMISSOES: Permissoes = {
    scope: 'operador',
    modulos: {
        pedidos: true,
        historico: true,
        itens: false,
        relatorios: false,
        bionexo: false,
        usuarios: false,
        transferencias: true,
    },
};

function resolvePermissoes(raw: any, role: string): Permissoes {
    if (raw && typeof raw === 'object' && raw.modulos) {
        return raw as Permissoes;
    }
    // Legacy fallback based on role
    if (role === 'admin') {
        return {
            scope: 'admin',
            modulos: { pedidos: true, historico: true, itens: true, relatorios: true, bionexo: true, usuarios: true, transferencias: true },
        };
    }
    if (role === 'comprador') {
        return {
            scope: 'admin',
            modulos: { pedidos: true, historico: true, itens: false, relatorios: true, bionexo: true, usuarios: false, transferencias: true },
        };
    }
    if (role === 'aprovador') {
        return {
            scope: 'admin',
            modulos: { pedidos: true, historico: true, itens: false, relatorios: false, bionexo: false, usuarios: false, transferencias: false },
        };
    }
    return DEFAULT_PERMISSOES;
}

export async function getCurrentUser(): Promise<Usuario | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('rhc_auth_token');

        if (!token?.value) {
            return null;
        }

        const userId = token.value;

        const { data: user, error } = await supabase
            .from('usuarios')
            .select('id, username, nome, role, unidade_id, permissoes')
            .eq('id', userId)
            .single();

        if (!error && user) {
            return {
                id: user.id,
                username: user.username,
                nome: user.nome,
                role: user.role as 'admin' | 'comprador' | 'solicitante' | 'aprovador',
                unidade_id: user.unidade_id ?? null,
                permissoes: resolvePermissoes(user.permissoes, user.role),
            };
        }

        const mockUser = mockUsuarios.find(u => u.id === userId);
        if (mockUser) {
            return {
                id: mockUser.id,
                username: mockUser.username,
                nome: mockUser.nome,
                role: mockUser.role as 'admin' | 'comprador' | 'solicitante',
                unidade_id: mockUser.unidade_id ?? null,
                permissoes: resolvePermissoes(null, mockUser.role),
            };
        }

        return null;
    } catch {
        return null;
    }
}
