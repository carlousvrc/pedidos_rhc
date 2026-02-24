'use client';

import { FileText, ArrowLeft, Download, Filter } from 'lucide-react';
import Link from 'next/link';

export default function RelatoriosPage() {
    return (
        <div className="max-w-[1400px] mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/" className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-500 hover:text-[#001A72] transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Relatórios de Consumo</h1>
                    <p className="text-slate-500 mt-1 text-sm">Visualize métricas e consolidados de suprimentos do hospital.</p>
                </div>
            </div>

            {/* Main Content Placeholder */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
                <div className="bg-blue-50 text-[#001A72] p-4 rounded-full mb-4">
                    <FileText className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Módulo em Desenvolvimento</h2>
                <p className="text-slate-500 max-w-md">
                    Esta tela de relatórios detalhados está sendo preparada para exibir gráficos e exportações consolidadas de consumo por unidade e centro de custo.
                </p>
                <div className="flex gap-4 mt-8">
                    <button disabled className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-lg cursor-not-allowed">
                        <Filter className="w-4 h-4" /> Filtros
                    </button>
                    <button disabled className="flex items-center gap-2 px-4 py-2 bg-[#001A72]/50 text-white rounded-lg cursor-not-allowed">
                        <Download className="w-4 h-4" /> Exportar Planilha
                    </button>
                </div>
            </div>
        </div>
    );
}
