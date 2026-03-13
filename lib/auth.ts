import { cookies } from 'next/headers';
import { supabase } from './supabase';
import { mockUsuarios } from './mockData';

export interface Usuario {
    id: string;
    username: string;
    nome: string;
    role: 'admin' | 'comprador' | 'solicitante';
    unidade_id: string | null;
}

export async function getCurrentUser(): Promise<Usuario | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('rhc_auth_token');

        if (!token?.value) {
            return null;
        }

        const userId = token.value;

        // Try Supabase first
        const { data: user, error } = await supabase
            .from('usuarios')
            .select('id, username, nome, role, unidade_id')
            .eq('id', userId)
            .single();

        if (!error && user) {
            return {
                id: user.id,
                username: user.username,
                nome: user.nome,
                role: user.role as 'admin' | 'comprador' | 'solicitante',
                unidade_id: user.unidade_id ?? null,
            };
        }

        // Fallback to mock data
        const mockUser = mockUsuarios.find(u => u.id === userId);
        if (mockUser) {
            return {
                id: mockUser.id,
                username: mockUser.username,
                nome: mockUser.nome,
                role: mockUser.role as 'admin' | 'comprador' | 'solicitante',
                unidade_id: mockUser.unidade_id ?? null,
            };
        }

        return null;
    } catch {
        return null;
    }
}
