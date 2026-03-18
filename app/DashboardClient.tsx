'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FileText, Clock, CheckCircle, Plus, RefreshCw, ShoppingCart, Search, X, Trash2, ArrowRightLeft, History, BarChart3, Package, Users, FileSpreadsheet, LogOut } from 'lucide-react';
import type { Usuario } from '@/lib/auth';
import ConfirmModal from './components/ConfirmModal';
import { logoutUser } from './login/actions';

interface DashboardClientProps {
    currentUser: Usuario | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hasRealId = (id?: string | null) => !!id && UUID_RE.test(id);

function getStatusBadge(status: string) {
    switch (status) {
        case 'Aguardando Aprovação': return 'bg-yellow-100 text-yellow-800';
        case 'Pendente':   return 'bg-orange-100 text-orange-800';
        case 'Em Cotação': return 'bg-amber-100 text-amber-800';
        case 'Realizado':  return 'bg-blue-100 text-[#001A72]';
        case 'Recebido':   return 'bg-green-100 text-green-800';
        default:           return 'bg-slate-100 text-slate-700';
    }
}

function applyScope(data: any[]) {
    return data;
}

async function fetchPedidos(currentUser: Usuario | null): Promise<any[]> {
    const scope = currentUser?.permissoes?.scope ?? 'operador';

    if (scope === 'operador' && hasRealId(currentUser?.id)) {
        // Fetch user's own orders
        const { data: ownOrders } = await supabase
            .from('pedidos')
            .select('id, numero_pedido, status, created_at, unidades(nome), usuario_id, usuarios(nome)')
            .eq('usuario_id', currentUser!.id)
            .order('created_at', { ascending: false })
            .limit(200);

        // Fetch orders that have remanejamentos targeting this user's unit
        let transferOrders: any[] = [];
        if (currentUser!.unidade_id) {
            // Get pedido_item_origem_ids from remanejamentos where origin unit = user's unit
            const { data: rems } = await supabase
                .from('remanejamentos')
                .select('pedido_item_origem_id');

            if (rems && rems.length > 0) {
                const piIds = rems.map(r => r.pedido_item_origem_id);
                const { data: piData } = await supabase
                    .from('pedidos_itens')
                    .select('pedido_id')
                    .in('id', piIds);

                if (piData && piData.length > 0) {
                    const pedidoIds = [...new Set(piData.map(p => p.pedido_id))];
                    const { data: originOrders } = await supabase
                        .from('pedidos')
                        .select('id, numero_pedido, status, created_at, unidades(nome), usuario_id, usuarios(nome)')
                        .in('id', pedidoIds)
                        .eq('unidade_id', currentUser!.unidade_id);

                    transferOrders = originOrders || [];
                }
            }
        }

        // Merge and deduplicate
        const merged = new Map<string, any>();
        for (const p of [...(ownOrders || []), ...transferOrders]) {
            if (!merged.has(p.id)) merged.set(p.id, p);
        }
        return Array.from(merged.values()).sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    const role = currentUser?.role;
    // Compradores should not see orders awaiting approval
    if (role === 'comprador') {
        const { data, error } = await supabase
            .from('pedidos')
            .select('id, numero_pedido, status, created_at, unidades(nome), usuario_id, usuarios(nome)')
            .neq('status', 'Aguardando Aprovação')
            .order('created_at', { ascending: false })
            .limit(200);
        if (error) console.error('fetchPedidos error:', error.message);
        return data ?? [];
    }

    const { data, error } = await supabase
        .from('pedidos')
        .select('id, numero_pedido, status, created_at, unidades(nome), usuario_id, usuarios(nome)')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) console.error('fetchPedidos error:', error.message);
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
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; numero: string } | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Pending transfers for this user's unit
    const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);

    // Initial fetch
    useEffect(() => {
        setLoading(true);
        fetchPedidos(currentUser).then(data => {
            setPedidos(applyScope(data));
            setLoading(false);
        });
        loadPendingTransfers();
    }, [currentUser]);

    async function loadPendingTransfers() {
        const unidadeId = currentUser?.unidade_id;
        if (!unidadeId) return;

        // Get remanejamentos where origin order belongs to this unit and not yet received
        const { data: rems } = await supabase
            .from('remanejamentos')
            .select('*')
            .eq('quantidade_recebida', 0)
            .order('created_at', { ascending: false });

        if (!rems || rems.length === 0) { setPendingTransfers([]); return; }

        const enriched: any[] = [];
        for (const r of rems) {
            // Get origin pedido's unit
            const { data: pi } = await supabase.from('pedidos_itens').select('pedido_id').eq('id', r.pedido_item_origem_id).single();
            if (!pi) continue;
            const { data: ped } = await supabase.from('pedidos').select('unidade_id, numero_pedido').eq('id', pi.pedido_id).single();
            if (!ped || ped.unidade_id !== unidadeId) continue;

            // Get item info
            const { data: item } = await supabase.from('itens').select('nome, codigo').eq('id', r.item_id).single();

            // Get destination order info
            const { data: destPed } = await supabase.from('pedidos').select('numero_pedido, unidade_id').eq('id', r.pedido_destino_id).single();
            let destUnidade = '—';
            if (destPed) {
                const { data: u } = await supabase.from('unidades').select('nome').eq('id', destPed.unidade_id).single();
                if (u) destUnidade = u.nome;
            }

            enriched.push({
                id: r.id,
                quantidade: r.quantidade,
                item_nome: item?.nome || '—',
                item_codigo: item?.codigo || '—',
                destino_unidade: destUnidade,
                destino_pedido_numero: destPed?.numero_pedido || '—',
            });
        }
        setPendingTransfers(enriched);
    }

    // Real-time subscription
    useEffect(() => {
        const channel = supabase
            .channel('dashboard-pedidos')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
                setUpdating(true);
                fetchPedidos(currentUser).then(data => {
                    setPedidos(applyScope(data));
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
            if (filterStatus && p.status !== filterStatus) return false;
            if (filterData) {
                const pedidoDate = new Date(p.created_at).toISOString().slice(0, 10);
                if (pedidoDate !== filterData) return false;
            }
            return true;
        });
    }, [pedidos, filterNumero, filterUnidade, filterData, filterStatus]);

    const totalPedidos = pedidos.length;
    const aguardandoAprovacao = pedidos.filter((p: any) => p.status === 'Aguardando Aprovação').length;
    const pendentes  = pedidos.filter((p: any) => p.status?.toLowerCase() === 'pendente').length;
    const emCotacao  = pedidos.filter((p: any) => p.status === 'Em Cotação').length;
    const realizados = pedidos.filter((p: any) => p.status?.toLowerCase() === 'realizado').length;
    const recebidos  = pedidos.filter((p: any) => p.status?.toLowerCase() === 'recebido').length;

    const canCreateOrder = !currentUser || currentUser?.permissoes?.modulos?.pedidos !== false;
    const canDelete = currentUser?.permissoes?.modulos?.usuarios === true;
    const hasFilters = filterNumero || filterUnidade || filterData || filterStatus;

    async function confirmDelete() {
        if (!deleteTarget) return;
        await supabase.from('pedidos_itens').delete().eq('pedido_id', deleteTarget.id);
        await supabase.from('pedidos').delete().eq('id', deleteTarget.id);
        setPedidos(prev => prev.filter(p => p.id !== deleteTarget.id));
        setSelected(prev => { const s = new Set(prev); s.delete(deleteTarget.id); return s; });
        setDeleteTarget(null);
    }

    async function confirmBulkDelete() {
        setBulkDeleting(false);
        const ids = Array.from(selected);
        for (const id of ids) {
            await supabase.from('pedidos_itens').delete().eq('pedido_id', id);
            await supabase.from('pedidos').delete().eq('id', id);
        }
        setPedidos(prev => prev.filter(p => !ids.includes(p.id)));
        setSelected(new Set());
    }

    function toggleSelect(id: string) {
        setSelected(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    }

    function toggleSelectAll() {
        if (selected.size === filteredPedidos.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filteredPedidos.map((p: any) => p.id)));
        }
    }

    function clearFilters() {
        setFilterNumero('');
        setFilterUnidade('');
        setFilterData('');
        setFilterStatus('');
    }

    return (
        <>
        {/* Top bar */}
        <div className="bg-[#001A72] shadow-md -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 mb-6 px-4 sm:px-8">
            <div className="max-w-[1400px] mx-auto h-16 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="bg-white rounded-lg px-2 py-1">
                            <img src="/logo.png" alt="Hospital Casa Logo" className="h-9 w-auto object-contain" />
                        </div>
                        <span className="text-base font-bold text-white tracking-tight hidden lg:block">RHC Pedidos</span>
                    </Link>
                    <div className="hidden md:flex items-center gap-0.5 ml-2">
                        {canCreateOrder && (
                            <Link href="/dashboard/pedidos/novo" className="px-3 py-1.5 rounded-md text-xs font-medium text-white/80 hover:bg-[#001250] hover:text-white transition-colors">
                                Novo Pedido
                            </Link>
                        )}
                        {currentUser?.permissoes?.modulos?.historico !== false && (
                            <Link href="/dashboard/historico" className="px-3 py-1.5 rounded-md text-xs font-medium text-white/80 hover:bg-[#001250] hover:text-white transition-colors">
                                Histórico
                            </Link>
                        )}
                        {currentUser?.permissoes?.modulos?.transferencias !== false && (
                            <Link href="/dashboard/transferencias" className="relative px-3 py-1.5 rounded-md text-xs font-medium text-white/80 hover:bg-[#001250] hover:text-white transition-colors">
                                Transferências
                                {pendingTransfers.length > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1 animate-pulse">
                                        {pendingTransfers.length}
                                    </span>
                                )}
                            </Link>
                        )}
                        {currentUser?.permissoes?.modulos?.relatorios && (
                            <Link href="/dashboard/relatorios" className="px-3 py-1.5 rounded-md text-xs font-medium text-white/80 hover:bg-[#001250] hover:text-white transition-colors">
                                Relatórios
                            </Link>
                        )}
                        {currentUser?.permissoes?.modulos?.itens && (
                            <Link href="/dashboard/itens" className="px-3 py-1.5 rounded-md text-xs font-medium text-white/80 hover:bg-[#001250] hover:text-white transition-colors">
                                Itens
                            </Link>
                        )}
                        {currentUser?.permissoes?.modulos?.usuarios && (
                            <Link href="/dashboard/usuarios" className="px-3 py-1.5 rounded-md text-xs font-medium text-white/80 hover:bg-[#001250] hover:text-white transition-colors">
                                Usuários
                            </Link>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {(loading || updating) && (
                        <span className="flex items-center gap-1.5 text-xs text-white/70 px-3 py-1.5 rounded-full">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            {loading ? 'Carregando...' : 'Atualizando...'}
                        </span>
                    )}
                    <form action={logoutUser}>
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-[#001250] hover:text-white rounded-md transition-colors"
                            title="Sair do sistema"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Sair</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <div className="max-w-[1400px] mx-auto space-y-6">

            {/* Status Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-blue-50 text-[#001A72] rounded-lg">
                            <ShoppingCart className="w-5 h-5" />
                        </div>
                        <span className="text-3xl font-bold text-slate-900">{totalPedidos}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-700">Total</p>
                    <p className="text-xs text-slate-400 mt-0.5">Todos os registros</p>
                    <div className="mt-3 h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-[#001A72]" style={{ width: '100%' }} />
                    </div>
                </div>

                {aguardandoAprovacao > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                                <Clock className="w-5 h-5" />
                            </div>
                            <span className="text-3xl font-bold text-slate-900">{aguardandoAprovacao}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-700">Aguardando Aprovação</p>
                        <p className="text-xs text-slate-400 mt-0.5">Pendente de aprovação</p>
                        <div className="mt-3 h-1.5 rounded-full bg-slate-100">
                            <div className="h-1.5 rounded-full bg-yellow-400 transition-all" style={{ width: totalPedidos ? `${(aguardandoAprovacao / totalPedidos) * 100}%` : '0%' }} />
                        </div>
                    </div>
                )}

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
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <Search className="w-5 h-5" />
                        </div>
                        <span className="text-3xl font-bold text-slate-900">{emCotacao}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-700">Em Cotação</p>
                    <p className="text-xs text-slate-400 mt-0.5">Comprador trabalhando</p>
                    <div className="mt-3 h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-amber-400 transition-all" style={{ width: totalPedidos ? `${(emCotacao / totalPedidos) * 100}%` : '0%' }} />
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

            {/* Quick Access Modules */}
            <div className="flex gap-3 overflow-x-auto pb-1">
                {canCreateOrder && (
                    <Link href="/dashboard/pedidos/novo" className="flex-1 min-w-[140px] bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:border-[#001A72]/30 hover:shadow-md transition-all group">
                        <div className="p-2.5 bg-blue-50 text-[#001A72] rounded-lg w-fit group-hover:bg-[#001A72] group-hover:text-white transition-colors">
                            <Plus className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mt-3">Novo Pedido</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Criar solicitação</p>
                    </Link>
                )}
                {currentUser?.permissoes?.modulos?.historico !== false && (
                    <Link href="/dashboard/historico" className="flex-1 min-w-[140px] bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:border-[#001A72]/30 hover:shadow-md transition-all group">
                        <div className="p-2.5 bg-slate-50 text-slate-600 rounded-lg w-fit group-hover:bg-[#001A72] group-hover:text-white transition-colors">
                            <History className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mt-3">Histórico</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Pedidos anteriores</p>
                    </Link>
                )}
                {currentUser?.permissoes?.modulos?.transferencias !== false && (
                    <Link href="/dashboard/transferencias" className="relative flex-1 min-w-[140px] bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:border-purple-300 hover:shadow-md transition-all group">
                        {pendingTransfers.length > 0 && (
                            <span className="absolute top-3 right-3 min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white px-1.5 animate-pulse shadow-sm">
                                {pendingTransfers.length}
                            </span>
                        )}
                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg w-fit group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <ArrowRightLeft className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mt-3">Transferências</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{pendingTransfers.length > 0 ? `${pendingTransfers.length} a receber` : 'Remanejamentos'}</p>
                    </Link>
                )}
                {currentUser?.permissoes?.modulos?.relatorios && (
                    <Link href="/dashboard/relatorios" className="flex-1 min-w-[140px] bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:border-[#001A72]/30 hover:shadow-md transition-all group">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg w-fit group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mt-3">Relatórios</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Dados e análises</p>
                    </Link>
                )}
                {currentUser?.permissoes?.modulos?.itens && (
                    <Link href="/dashboard/itens" className="flex-1 min-w-[140px] bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:border-[#001A72]/30 hover:shadow-md transition-all group">
                        <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg w-fit group-hover:bg-orange-600 group-hover:text-white transition-colors">
                            <Package className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mt-3">Itens</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Catálogo de produtos</p>
                    </Link>
                )}
                {currentUser?.permissoes?.modulos?.usuarios && (
                    <Link href="/dashboard/usuarios" className="flex-1 min-w-[140px] bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:border-[#001A72]/30 hover:shadow-md transition-all group">
                        <div className="p-2.5 bg-violet-50 text-violet-600 rounded-lg w-fit group-hover:bg-violet-600 group-hover:text-white transition-colors">
                            <Users className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mt-3">Usuários</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Gerenciar acessos</p>
                    </Link>
                )}
            </div>

            {/* Pending Transfers */}
            {pendingTransfers.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-amber-200 flex items-center justify-center shrink-0">
                                <ArrowRightLeft className="w-5 h-5 text-amber-800" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-amber-900">Transferências a receber ({pendingTransfers.length})</h3>
                                <p className="text-xs text-amber-700 mt-0.5">Itens remanejados que aguardam confirmação de recebimento</p>
                            </div>
                        </div>
                        <Link href="/dashboard/transferencias"
                            className="text-xs font-semibold text-amber-800 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors">
                            Ver todas
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm divide-y divide-amber-100">
                            <thead className="bg-amber-100/50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-amber-800 uppercase">Item</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-amber-800 uppercase">Código</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-amber-800 uppercase">Qtd</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-amber-800 uppercase">Virá de</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-100/50">
                                {pendingTransfers.map(t => (
                                    <tr key={t.id} className="hover:bg-amber-100/30">
                                        <td className="px-4 py-2.5 text-slate-800 font-medium truncate max-w-[250px]">{t.item_nome}</td>
                                        <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{t.item_codigo}</td>
                                        <td className="px-4 py-2.5 text-right font-bold text-amber-800">{t.quantidade} un.</td>
                                        <td className="px-4 py-2.5">
                                            <span className="text-xs font-semibold text-slate-700">{t.destino_unidade}</span>
                                            <span className="text-[11px] text-slate-400 ml-1">(#{t.destino_pedido_numero})</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
                            <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Em Cotação">Em Cotação</option>
                            <option value="Realizado">Realizado</option>
                            <option value="Recebido">Recebido</option>
                        </select>
                    </div>
                </div>

                {/* Bulk action bar */}
                {canDelete && selected.size > 0 && (
                    <div className="px-6 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
                        <span className="text-sm text-red-700 font-medium">
                            {selected.size} pedido{selected.size !== 1 ? 's' : ''} selecionado{selected.size !== 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-md hover:bg-white transition-colors">
                                Desmarcar
                            </button>
                            <button
                                onClick={() => setBulkDeleting(true)}
                                className="flex items-center gap-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Excluir selecionados
                            </button>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                {canDelete && (
                                    <th className="pl-4 pr-2 py-3.5 w-10">
                                        <input
                                            type="checkbox"
                                            checked={filteredPedidos.length > 0 && selected.size === filteredPedidos.length}
                                            ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < filteredPedidos.length; }}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-slate-300 text-[#001A72] focus:ring-[#001A72] cursor-pointer"
                                        />
                                    </th>
                                )}
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nº Pedido</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Unidade</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Solicitante</th>
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
                                    <td colSpan={canDelete ? (scope !== 'operador' ? 6 : 5) : (scope !== 'operador' ? 5 : 4)} className="px-6 py-12 text-center text-slate-400 text-sm">
                                        Carregando pedidos...
                                    </td>
                                </tr>
                            ) : filteredPedidos.length === 0 ? (
                                <tr>
                                    <td colSpan={canDelete ? (scope !== 'operador' ? 6 : 5) : (scope !== 'operador' ? 5 : 4)} className="px-6 py-12 text-center text-slate-500 text-sm">
                                        {hasFilters ? 'Nenhum pedido encontrado com os filtros aplicados.' : 'Nenhum pedido encontrado.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredPedidos.map((pedido: any) => (
                                    <tr key={pedido.id} className={`hover:bg-slate-50/50 transition-colors group ${selected.has(pedido.id) ? 'bg-red-50/40' : ''}`}>
                                        {canDelete && (
                                            <td className="pl-4 pr-2 py-4 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(pedido.id)}
                                                    onChange={() => toggleSelect(pedido.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-[#001A72] focus:ring-[#001A72] cursor-pointer"
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-slate-400" />
                                                #{pedido.numero_pedido}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {pedido.unidades?.nome || 'Não informada'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {pedido.usuarios?.nome || '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {pedido.created_at ? new Date(pedido.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-0.5 inline-flex text-[11px] leading-5 font-semibold rounded-full capitalize ${getStatusBadge(pedido.status)}`}>
                                                {pedido.status}
                                            </span>
                                        </td>
                                        {scope !== 'operador' && (
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/dashboard/pedidos/${pedido.id}`}
                                                        className="text-[#001A72] hover:text-[#001250] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                                                    >
                                                        Visualizar
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

            {deleteTarget && (
                <ConfirmModal
                    title="Excluir pedido"
                    description={`O pedido #${deleteTarget.numero} será excluído permanentemente. Esta ação não pode ser desfeita.`}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
            {bulkDeleting && (
                <ConfirmModal
                    title={`Excluir ${selected.size} pedido${selected.size !== 1 ? 's' : ''}`}
                    description={`${selected.size} pedido${selected.size !== 1 ? 's' : ''} será${selected.size !== 1 ? 'ão' : ''} excluído${selected.size !== 1 ? 's' : ''} permanentemente. Esta ação não pode ser desfeita.`}
                    onConfirm={confirmBulkDelete}
                    onCancel={() => setBulkDeleting(false)}
                />
            )}
        </div>
        </>
    );
}
