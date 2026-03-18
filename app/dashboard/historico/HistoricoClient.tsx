'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, FileText, Clock, ArrowRight, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ConfirmModal from '@/app/components/ConfirmModal';

interface Pedido {
    id: string;
    numero_pedido: string;
    status: string;
    created_at: string;
    unidades?: { nome: string };
    usuario_id?: string;
}

interface Props {
    pedidos: Pedido[];
    scope: string;
    canDelete?: boolean;
}

const STATUS_TABS = ['Todos', 'Aguardando Aprovação', 'Pendente', 'Realizado', 'Recebido'] as const;

function getStatusBadge(status: string) {
    if (status === 'Aguardando Aprovação') return 'bg-yellow-100 text-yellow-800';
    switch (status?.toLowerCase()) {
        case 'pendente':  return 'bg-orange-100 text-orange-800';
        case 'realizado': return 'bg-blue-100 text-[#001A72]';
        case 'recebido':  return 'bg-green-100 text-green-800';
        default:          return 'bg-slate-100 text-slate-700';
    }
}

function getRowAccent(status: string) {
    if (status === 'Aguardando Aprovação') return 'border-l-4 border-l-yellow-400';
    if (status?.toLowerCase() === 'pendente') return 'border-l-4 border-l-orange-400';
    if (status?.toLowerCase() === 'realizado') return 'border-l-4 border-l-[#001A72]';
    if (status?.toLowerCase() === 'recebido') return 'border-l-4 border-l-green-500';
    return '';
}

export default function HistoricoClient({ pedidos, scope, canDelete }: Props) {
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<typeof STATUS_TABS[number]>('Todos');
    const [lista, setLista] = useState<Pedido[]>(pedidos);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; numero: string } | null>(null);

    async function confirmDelete() {
        if (!deleteTarget) return;
        await supabase.from('pedidos_itens').delete().eq('pedido_id', deleteTarget.id);
        await supabase.from('pedidos').delete().eq('id', deleteTarget.id);
        setLista(prev => prev.filter(p => p.id !== deleteTarget.id));
        setDeleteTarget(null);
    }

    const counts = useMemo(() => ({
        Todos:    lista.length,
        'Aguardando Aprovação': lista.filter(p => p.status === 'Aguardando Aprovação').length,
        Pendente: lista.filter(p => p.status?.toLowerCase() === 'pendente').length,
        Realizado:lista.filter(p => p.status?.toLowerCase() === 'realizado').length,
        Recebido: lista.filter(p => p.status?.toLowerCase() === 'recebido').length,
    }), [lista]);

    const filtered = useMemo(() => {
        const term = search.toLowerCase();
        return lista.filter(p => {
            const matchTab = activeTab === 'Todos' || p.status?.toLowerCase() === activeTab.toLowerCase();
            const matchSearch =
                !term ||
                p.numero_pedido.includes(term) ||
                (p.unidades?.nome ?? '').toLowerCase().includes(term);
            return matchTab && matchSearch;
        });
    }, [lista, search, activeTab]);

    return (
    <>
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
                                            {new Date(pedido.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-0.5 inline-flex text-[11px] leading-5 font-semibold rounded-full capitalize ${getStatusBadge(pedido.status)}`}>
                                                {pedido.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
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
                                                {canDelete && (
                                                    <button
                                                        onClick={() => setDeleteTarget({ id: pedido.id, numero: pedido.numero_pedido })}
                                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                        title="Excluir pedido"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
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

        {deleteTarget && (
            <ConfirmModal
                title="Excluir pedido"
                description={`O pedido #${deleteTarget.numero} será excluído permanentemente. Esta ação não pode ser desfeita.`}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        )}
    </>
    );
}
