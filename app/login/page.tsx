'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { loginUser } from './actions';

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        try {
            const response = await loginUser(null, formData);

            if (response?.error) {
                setError(response.error);
                setIsLoading(false);
            } else if (response?.success) {
                // Redirect on success
                router.push('/');
                router.refresh();
            }
        } catch (err) {
            setError('Ocorreu um erro inesperado.');
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a192f] relative overflow-hidden">

            {/* Background Effects matching the screenshot */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#0a192f]/80 to-[#0a192f] z-0 pointer-events-none"></div>
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2653&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay z-0 pointer-events-none"></div>

            {/* Glassmorphism Card */}
            <div className="relative z-10 w-full max-w-[420px] p-8 md:p-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] shadow-2xl mx-4">

                {/* Logo Area */}
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-white rounded-lg px-3 py-2 mb-6 flex items-center justify-center shadow-sm">
                        <Image
                            src="/logo.png"
                            alt="Hospital Casa Logo"
                            width={140}
                            height={42}
                            priority
                            className="h-10 w-auto object-contain"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Bem-vindo</h1>
                    <p className="text-indigo-200/80 text-sm">Acesse o sistema de pedidos</p>
                </div>

                {/* Login Form */}
                <form action={handleSubmit} className="space-y-5">

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                            <p className="text-red-200 text-sm">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-indigo-100 text-sm font-medium mb-1.5" htmlFor="username">
                            Usuário
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-indigo-300/50" />
                            </div>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-colors"
                                placeholder="Seu usuário"
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-indigo-100 text-sm font-medium mb-1.5" htmlFor="password">
                            Senha
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-indigo-300/50" />
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-colors"
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-base font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a192f] focus:ring-orange-500 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 mt-2"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
                    </button>

                </form>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-indigo-300/40 text-xs">Sistema de Pedidos Internos RHC v1.0</p>
                </div>

            </div>
        </div>
    );
}
