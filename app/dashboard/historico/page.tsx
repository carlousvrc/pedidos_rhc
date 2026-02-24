'use client';

import { History, ArrowLeft, Search, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function HistoricoPage() {
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/" className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-500 hover:text-[#001A72] transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Histórico de Pedidos</h1>
                    <p className="text-slate-500 mt-1 text-sm">Consulte o registro completo de todas as solicitações anteriores.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Search Header */}
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por Nº do Pedido ou Unidade..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] focus:bg-white transition-colors"
                        />
                    </div>
                    <button disabled className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-lg cursor-not-allowed">
                        <Calendar className="w-4 h-4" /> Período
                    </button>
                </div>

                {/* Placeholder List */}
                <div className="p-12 flex flex-col items-center justify-center text-center">
                    <div className="bg-slate-50 text-slate-400 p-4 rounded-full mb-4">
                        <History className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Histórico em Desenvolvimento</h3>
                    <p className="text-slate-500 max-w-sm">
                        A página de busca avançada e filtro temporal para solicitações está sendo implementada nas tabelas baseadas no Supabase.
                    </p>
                </div>
            </div>

        </div>
    );
}
