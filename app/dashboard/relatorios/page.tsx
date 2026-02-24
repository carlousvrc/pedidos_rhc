'use client';

import { FileText, ArrowLeft, Download, Filter, TrendingUp, Package, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { mockPedidos, mockItens } from '@/lib/mockData';

export default function RelatoriosPage() {

    // Quick metrics calculations based on mock data
    const totalPedidos = mockPedidos.length;
    const atendidos = mockPedidos.filter(p => p.status === 'Atendido').length;
    const pendentes = mockPedidos.filter(p => p.status === 'Pendente').length;
    const totalItens = mockItens.length;

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-500 hover:text-[#001A72] transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Relatórios de Consumo</h1>
                        <p className="text-slate-500 mt-1 text-sm">Visualize métricas e consolidados de suprimentos do hospital.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium">
                        <Filter className="w-4 h-4" /> Filtros
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#001A72] text-white rounded-lg hover:bg-[#001250] transition-colors shadow-sm text-sm font-medium">
                        <Download className="w-4 h-4" /> Exportar PDF
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-4">
                        <p className="text-slate-500 font-medium text-sm">Volume Registrado</p>
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{totalPedidos}</p>
                    <p className="text-xs text-slate-400 mt-2">+12% em relação ao mês anterior</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-4">
                        <p className="text-slate-500 font-medium text-sm">Pedidos Entregues</p>
                        <Package className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{atendidos}</p>
                    <p className="text-xs text-slate-400 mt-2">Taxa de sucesso de {(atendidos / totalPedidos * 100).toFixed(0)}%</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-4">
                        <p className="text-slate-500 font-medium text-sm">Gargalos Pendentes</p>
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{pendentes}</p>
                    <p className="text-xs text-orange-500 font-medium mt-2">Requer atenção da logística</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-4">
                        <p className="text-slate-500 font-medium text-sm">Catálogo de Itens</p>
                        <FileText className="w-5 h-5 text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{totalItens}</p>
                    <p className="text-xs text-slate-400 mt-2">Itens distintos cadastrados</p>
                </div>
            </div>

            {/* Main Content Placeholder for Charts */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                <div className="bg-slate-50/50 w-full h-full min-h-[250px] rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                    <TrendingUp className="w-8 h-8 mb-4 opacity-50" />
                    <p className="text-sm font-medium">Os gráficos comparativos serão renderizados aqui usando Chart.js ou Recharts</p>
                    <p className="text-xs mt-1">Dados alimentados diretamente das tabelas de itens e pedidos_itens do Supabase</p>
                </div>
            </div>
        </div>
    );
}
