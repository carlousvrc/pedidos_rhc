'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, FileText, Clock, ArrowRight } from 'lucide-react';

interface Pedido {
    id: string;
    numero_pedido: string;
    status: string;
    data_pedido: string;
    unidades?: { nome: string };
    usuario_id?: string;
}

interface Props {
    pedidos: Pedido[];
    scope: string;
}

const STATUS_TABS = ['Todos', 'Pendente', 'Realizado', 'Recebido'] as const;

function getStatusBadge(status: string) {
    switch (status?.toLowerCase()) {
        case 'pendente':  return 'bg-orange-100 text-orange-800';
        case 'realizado': return 'bg-blue-100 text-[#001A72]';
        case 'recebido':  return 'bg-green-100 text-green-800';
        default:          return 'bg-slate-100 text-slate-700';
    }
}

function getRowAccent(status: string) {
    if (status?.toLowerCase() === 'pendente') return 'border-l-4 border-l-orange-400';
    if (status?.toLowerCase() === 'realizado') return 'border-l-4 border-l-[#001A72]';
    if (status?.toLowerCase() === 'recebido') return 'border-l-4 border-l-green-500';
    return '';
}

export default function HistoricoClient({ pedidos, scope }: Props) {
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<typeof STATUS_TABS[number]>('Todos');

    const counts = useMemo(() => ({
        Todos:    pedidos.length,
        Pendente: pedidos.filter(p => p.status?.toLowerCase() === 'pendente').length,
        Realizado:pedidos.filter(p => p.status?.toLowerCase() === 'realizado').length,
        Recebido: pedidos.filter(p => p.status?.toLowerCase() === 'recebido').length,
    }), [pedidos]);

    const filtered = useMemo(() => {
        const term = search.toLowerCase();
        return pedidos.filter(p => {
            const matchTab = activeTab === 'Todos' || p.status?.toLowerCase() === activeTab.toLowerCase();
            const matchSearch =
                !term ||
                p.numero_pedido.includes(term) ||
                (p.unidades?.nome ?? '').toLowerCase().includes(term);
            return matchTab && matchSearch;
        });
    }, [pedidos, search, activeTab]);

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Histórico de Pedidos</h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        {scope === 'admin'
                            ? 'Todos os pedidos do sistema — visualize, processe o Bionexo e acompanhe o recebimento.'
                            : 'Acompanhe suas solicitações e confirme o recebimento.'}
                    </p>
                </div>
                {scope === 'admin' && counts.Pendente > 0 && (
                    <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2.5 rounded-lg text-sm font-medium">
                        <Clock className="w-4 h-4" />
                        {counts.Pendente} pedido{counts.Pendente > 1 ? 's' : ''} aguardando processamento
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">

                {/* Search + Tabs */}
                <div className="p-5 border-b border-slate-100 space-y-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por Nº do Pedido ou Unidade..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] focus:bg-white transition-colors"
                        />
                    </div>

                    {/* Status tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                        {STATUS_TABS.map(tab => {
                            const count = counts[tab];
                            const isActive = activeTab === tab;
                            const isPendente = tab === 'Pendente' && count > 0 && scope === 'admin';
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                                        isActive
                                            ? 'bg-[#001A72] text-white'
                                            : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    {tab}
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                                        isActive
                                            ? 'bg-white/20 text-white'
                                            : isPendente
                                                ? 'bg-orange-100 text-orange-700'
                                                : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nº Pedido</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Unidade</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-14 text-center text-slate-500 text-sm">
                                        Nenhum pedido encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(pedido => (
                                    <tr key={pedido.id} className={`hover:bg-slate-50/50 transition-colors group ${getRowAccent(pedido.status)}`}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-slate-400 group-hover:text-[#001A72] transition-colors" />
                                                #{pedido.numero_pedido}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {pedido.unidades?.nome || '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-0.5 inline-flex text-[11px] leading-5 font-semibold rounded-full capitalize ${getStatusBadge(pedido.status)}`}>
                                                {pedido.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <Link
                                                href={`/dashboard/pedidos/${pedido.id}`}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                                    pedido.status?.toLowerCase() === 'pendente' && scope === 'admin'
                                                        ? 'bg-[#001A72] text-white hover:bg-[#001250]'
                                                        : 'text-[#001A72] bg-blue-50 hover:bg-blue-100'
                                                }`}
                                            >
                                                {pedido.status?.toLowerCase() === 'pendente' && scope === 'admin'
                                                    ? 'Processar'
                                                    : 'Visualizar'}
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {filtered.length > 0 && (
                    <div className="px-6 py-3 border-t border-slate-50 text-xs text-slate-400">
                        {filtered.length} pedido{filtered.length !== 1 ? 's' : ''} exibido{filtered.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>
        </div>
    );
}
