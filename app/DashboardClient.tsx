'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FileText, Clock, CheckCircle, Plus, RefreshCw, ShoppingCart, Search, X } from 'lucide-react';
import type { Usuario } from '@/lib/auth';

interface DashboardClientProps {
    currentUser: Usuario | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hasRealId = (id?: string | null) => !!id && UUID_RE.test(id);

function getStatusBadge(status: string) {
    switch (status?.toLowerCase()) {
        case 'pendente':  return 'bg-orange-100 text-orange-800';
        case 'realizado': return 'bg-blue-100 text-[#001A72]';
        case 'recebido':  return 'bg-green-100 text-green-800';
        default:          return 'bg-slate-100 text-slate-700';
    }
}

function applyScope(data: any[], currentUser: Usuario | null) {
    const scope = currentUser?.permissoes?.scope ?? 'operador';
    if (scope === 'operador' && hasRealId(currentUser?.id)) {
        return data.filter((p: any) => p.usuario_id === currentUser!.id);
    }
    return data;
}

async function fetchPedidos(currentUser: Usuario | null): Promise<any[]> {
    const scope = currentUser?.permissoes?.scope ?? 'operador';
    let query = supabase
        .from('pedidos')
        .select('id, numero_pedido, status, data_pedido, unidades(nome), usuario_id')
        .order('id', { ascending: false })
        .limit(200);

    if (scope === 'operador' && hasRealId(currentUser?.id)) {
        query = query.eq('usuario_id', currentUser!.id);
    }

    const { data, error } = await query;
    if (error) {
        console.error('fetchPedidos error:', JSON.stringify(error));
        alert(`Erro ao carregar pedidos: ${error.message}`);
    }
    return data ?? [];
}

export default function DashboardClient({ currentUser }: DashboardClientProps) {
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const [filterNumero, setFilterNumero] = useState('');
    const [filterUnidade, setFilterUnidade] = useState('');
    const [filterData, setFilterData] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Initial fetch
    useEffect(() => {
        setLoading(true);
        fetchPedidos(currentUser).then(data => {
            setPedidos(applyScope(data, currentUser));
            setLoading(false);
        });
    }, [currentUser]);

    // Real-time subscription
    useEffect(() => {
        const channel = supabase
            .channel('dashboard-pedidos')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
                setUpdating(true);
                fetchPedidos(currentUser).then(data => {
                    setPedidos(applyScope(data, currentUser));
                    setTimeout(() => setUpdating(false), 600);
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentUser]);

    const scope = currentUser?.permissoes?.scope ?? 'operador';

    const unidadesDisponiveis = useMemo(() => {
        const nomes = new Set(pedidos.map((p: any) => p.unidades?.nome).filter(Boolean));
        return Array.from(nomes).sort() as string[];
    }, [pedidos]);

    const filteredPedidos = useMemo(() => {
        return pedidos.filter((p: any) => {
            if (filterNumero && !p.numero_pedido?.includes(filterNumero)) return false;
            if (filterUnidade && p.unidades?.nome !== filterUnidade) return false;
            if (filterStatus && p.status?.toLowerCase() !== filterStatus.toLowerCase()) return false;
            if (filterData) {
                const pedidoDate = new Date(p.data_pedido).toISOString().slice(0, 10);
                if (pedidoDate !== filterData) return false;
            }
            return true;
        });
    }, [pedidos, filterNumero, filterUnidade, filterData, filterStatus]);

    const totalPedidos = pedidos.length;
    const pendentes  = pedidos.filter((p: any) => p.status?.toLowerCase() === 'pendente').length;
    const realizados = pedidos.filter((p: any) => p.status?.toLowerCase() === 'realizado').length;
    const recebidos  = pedidos.filter((p: any) => p.status?.toLowerCase() === 'recebido').length;

    const canCreateOrder = !currentUser || currentUser?.permissoes?.modulos?.pedidos !== false;
    const hasFilters = filterNumero || filterUnidade || filterData || filterStatus;

    function clearFilters() {
        setFilterNumero('');
        setFilterUnidade('');
        setFilterData('');
        setFilterStatus('');
    }

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
                    <p className="text-slate-500 mt-1 text-sm">Visão geral e acesso rápido aos pedidos hospitalares.</p>
                </div>
                <div className="flex items-center gap-3">
                    {(loading || updating) && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            {loading ? 'Carregando...' : 'Atualizando...'}
                        </span>
                    )}
                    {canCreateOrder && (
                        <Link
                            href="/dashboard/pedidos/novo"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#001A72] text-white rounded-lg shadow-sm font-medium hover:bg-[#001250] transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Novo Pedido
                        </Link>
                    )}
                </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-blue-50 text-[#001A72] rounded-lg">
                            <ShoppingCart className="w-5 h-5" />
                        </div>
                        <span className="text-3xl font-bold text-slate-900">{totalPedidos}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-700">Total de Pedidos</p>
                    <p className="text-xs text-slate-400 mt-0.5">Todos os registros</p>
                    <div className="mt-3 h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-[#001A72]" style={{ width: '100%' }} />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-orange-50 text-orange-500 rounded-lg">
                            <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-3xl font-bold text-slate-900">{pendentes}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-700">Pendentes</p>
                    <p className="text-xs text-slate-400 mt-0.5">Aguardando comprador</p>
                    <div className="mt-3 h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-orange-400 transition-all" style={{ width: totalPedidos ? `${(pendentes / totalPedidos) * 100}%` : '0%' }} />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-blue-50 text-[#001A72] rounded-lg">
                            <FileText className="w-5 h-5" />
                        </div>
                        <span className="text-3xl font-bold text-slate-900">{realizados}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-700">Realizados</p>
                    <p className="text-xs text-slate-400 mt-0.5">Processados pelo comprador</p>
                    <div className="mt-3 h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-[#001A72] transition-all" style={{ width: totalPedidos ? `${(realizados / totalPedidos) * 100}%` : '0%' }} />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <span className="text-3xl font-bold text-slate-900">{recebidos}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-700">Recebidos</p>
                    <p className="text-xs text-slate-400 mt-0.5">Confirmados pelo solicitante</p>
                    <div className="mt-3 h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-green-500 transition-all" style={{ width: totalPedidos ? `${(recebidos / totalPedidos) * 100}%` : '0%' }} />
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-slate-800">Pedidos Registrados</h2>
                        {hasFilters && (
                            <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors">
                                <X className="w-3.5 h-3.5" />
                                Limpar filtros
                            </button>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Nº do pedido..."
                                value={filterNumero}
                                onChange={e => setFilterNumero(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A72] focus:bg-white transition-colors"
                            />
                        </div>
                        <select
                            value={filterUnidade}
                            onChange={e => setFilterUnidade(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A72] focus:bg-white transition-colors"
                        >
                            <option value="">Todas as unidades</option>
                            {unidadesDisponiveis.map(u => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>
                        <input
                            type="date"
                            value={filterData}
                            onChange={e => setFilterData(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A72] focus:bg-white transition-colors"
                        />
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A72] focus:bg-white transition-colors"
                        >
                            <option value="">Todos os status</option>
                            <option value="pendente">Pendente</option>
                            <option value="realizado">Realizado</option>
                            <option value="recebido">Recebido</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nº Pedido</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Unidade</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                {scope !== 'operador' && (
                                    <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={scope !== 'operador' ? 5 : 4} className="px-6 py-12 text-center text-slate-400 text-sm">
                                        Carregando pedidos...
                                    </td>
                                </tr>
                            ) : filteredPedidos.length === 0 ? (
                                <tr>
                                    <td colSpan={scope !== 'operador' ? 5 : 4} className="px-6 py-12 text-center text-slate-500 text-sm">
                                        {hasFilters ? 'Nenhum pedido encontrado com os filtros aplicados.' : 'Nenhum pedido encontrado.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredPedidos.map((pedido: any) => (
                                    <tr key={pedido.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-slate-400" />
                                                #{pedido.numero_pedido}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {pedido.unidades?.nome || 'Não informada'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {pedido.data_pedido ? new Date(pedido.data_pedido).toLocaleDateString('pt-BR') : '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-0.5 inline-flex text-[11px] leading-5 font-semibold rounded-full capitalize ${getStatusBadge(pedido.status)}`}>
                                                {pedido.status}
                                            </span>
                                        </td>
                                        {scope !== 'operador' && (
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Link
                                                    href={`/dashboard/pedidos/${pedido.id}`}
                                                    className="text-[#001A72] hover:text-[#001250] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                                                >
                                                    Visualizar
                                                </Link>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && filteredPedidos.length > 0 && (
                    <div className="px-6 py-3 border-t border-slate-50 text-xs text-slate-400">
                        {filteredPedidos.length} pedido{filteredPedidos.length !== 1 ? 's' : ''} exibido{filteredPedidos.length !== 1 ? 's' : ''}
                        {hasFilters && totalPedidos !== filteredPedidos.length && ` (de ${totalPedidos} no total)`}
                    </div>
                )}
            </div>
        </div>
    );
}
