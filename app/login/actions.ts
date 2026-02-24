'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { mockUsuarios } from '@/lib/mockData';

export async function loginUser(prevState: any, formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    if (!username || !password) {
        return { error: 'Por favor, preencha todos os campos.' };
    }

    try {
        // 1. Try checking the database
        const { data: user, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('username', username)
            .single();

        // In a real app we'd use bcrypt.compare(), but for this exercise the seed script
        // has plaintext, or if it doesn't exist, we fallback to mock.
        if (!error && user) {
            if (user.password_hash === password) {
                // Success Database Login
                (await cookies()).set('rhc_auth_token', user.id, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 60 * 60 * 24 * 7, // 1 week
                    path: '/',
                });
                return { success: true };
            } else {
                return { error: 'Credenciais inválidas.' };
            }
        }

        // 2. Fallback to mock data if DB fails or user not found
        const mockUser = mockUsuarios.find(u => u.username === username);
        if (mockUser && mockUser.password_hash === password) {
            // Success Mock Login
            (await cookies()).set('rhc_auth_token', mockUser.id, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: '/',
            });
            return { success: true };
        }

        return { error: 'Credenciais inválidas ou usuário não encontrado.' };

    } catch (err) {
        console.error('Login error:', err);
        return { error: 'Ocorreu um erro interno. Tente novamente mais tarde.' };
    }
}

export async function logoutUser() {
    (await cookies()).delete('rhc_auth_token');
    redirect('/login');
}
