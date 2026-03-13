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
                router.push('/');
                router.refresh();
            }
        } catch {
            setError('Ocorreu um erro inesperado.');
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">

            <div className="w-full max-w-[420px] mx-4">

                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-white rounded-xl px-5 py-3 shadow-sm border border-slate-100 mb-6">
                        <Image
                            src="/logo.png"
                            alt="RHC Logo"
                            width={160}
                            height={48}
                            priority
                            className="h-11 w-auto object-contain"
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Bem-vindo</h1>
                    <p className="text-slate-500 text-sm mt-1">Acesse o sistema de pedidos</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <form action={handleSubmit} className="space-y-5">

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-slate-700 text-sm font-medium mb-1.5" htmlFor="username">
                                Usuário
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <User className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] focus:bg-white transition-colors"
                                    placeholder="Seu usuário"
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-700 text-sm font-medium mb-1.5" htmlFor="password">
                                Senha
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] focus:bg-white transition-colors"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg text-sm font-bold text-white bg-[#001A72] hover:bg-[#001250] focus:outline-none focus:ring-2 focus:ring-[#001A72] focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
                        </button>

                    </form>
                </div>

                <p className="text-center text-slate-400 text-xs mt-6">
                    Sistema de Pedidos Internos RHC v1.0
                </p>
            </div>
        </div>
    );
}
