'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
    ChevronRight, RefreshCw, ShoppingCart, Package, CheckCircle2,
    Clock, TrendingUp, AlertTriangle, BarChart3, ArrowRightLeft,
} from 'lucide-react';

interface Pedido {
    id: string;
    status: string;
    created_at: string;
    unidade_id: string;
    unidade_nome?: string;
}

interface PedidoItem {
    id: string;
    pedido_id: string;
    item_id: string;
    quantidade: number;
    quantidade_atendida: number;
    quantidade_recebida: number;
    item_nome?: string;
    item_codigo?: string;
}

interface Unidade {
    id: string;
    nome: string;
}

export default function RelatoriosPage() {
    const [loading, setLoading] = useState(true);
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [pedidoItens, setPedidoItens] = useState<PedidoItem[]>([]);
    const [totalRemanejamentos, setTotalRemanejamentos] = useState(0);
    const [totalQtdRemanejada, setTotalQtdRemanejada] = useState(0);
    const [unidades, setUnidades] = useState<Unidade[]>([]);

    const [filterUnidade, setFilterUnidade] = useState('');
    const [filterDe, setFilterDe] = useState('');
    const [filterAte, setFilterAte] = useState('');

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setLoading(true);
        const [{ data: peds }, { data: uns }, { data: rems }] = await Promise.all([
            supabase.from('pedidos').select('id, status, created_at, unidade_id').order('created_at', { ascending: false }),
            supabase.from('unidades').select('id, nome').order('nome'),
            supabase.from('remanejamentos').select('id, quantidade'),
        ]);

        const unidadeMap = new Map((uns || []).map(u => [u.id, u.nome]));
        setPedidos((peds || []).map(p => ({ ...p, unidade_nome: unidadeMap.get(p.unidade_id) || '—' })));
        setUnidades(uns || []);
        setTotalRemanejamentos((rems || []).length);
        setTotalQtdRemanejada((rems || []).reduce((s, r) => s + r.quantidade, 0));

        const { data: pis } = await supabase
            .from('pedidos_itens')
            .select('id, pedido_id, item_id, quantidade, quantidade_atendida, quantidade_recebida, itens(nome, codigo)');
        setPedidoItens((pis || []).map((pi: any) => ({
            ...pi, item_nome: pi.itens?.nome || '—', item_codigo: pi.itens?.codigo || '—',
        })));
        setLoading(false);
    }

    const filteredPedidos = useMemo(() => pedidos.filter(p => {
        if (filterUnidade && p.unidade_id !== filterUnidade) return false;
        const d = new Date(p.created_at).toISOString().slice(0, 10);
        if (filterDe && d < filterDe) return false;
        if (filterAte && d > filterAte) return false;
        return true;
    }), [pedidos, filterUnidade, filterDe, filterAte]);

    const filteredIds = useMemo(() => new Set(filteredPedidos.map(p => p.id)), [filteredPedidos]);
    const filteredItens = useMemo(() => pedidoItens.filter(pi => filteredIds.has(pi.pedido_id)), [pedidoItens, filteredIds]);

    const totalPedidos = filteredPedidos.length;
    const pendentes = filteredPedidos.filter(p => p.status === 'Pendente').length;
    const emCotacao = filteredPedidos.filter(p => p.status === 'Em Cotação').length;
    const realizados = filteredPedidos.filter(p => p.status === 'Realizado').length;
    const recebidos = filteredPedidos.filter(p => p.status === 'Recebido').length;

    const totalItensQtd = filteredItens.reduce((s, i) => s + i.quantidade, 0);
    const totalAtendida = filteredItens.reduce((s, i) => s + i.quantidade_atendida, 0);
    const totalRecebida = filteredItens.reduce((s, i) => s + i.quantidade_recebida, 0);
    const taxaAtendimento = totalItensQtd > 0 ? Math.round((totalAtendida / totalItensQtd) * 100) : 0;
    const taxaRecebimento = totalAtendida > 0 ? Math.round((totalRecebida / totalAtendida) * 100) : 0;

    const topItens = useMemo(() => {
        const map = new Map<string, { nome: string; codigo: string; qtd: number }>();
        for (const pi of filteredItens) {
            const ex = map.get(pi.item_id);
            if (ex) ex.qtd += pi.quantidade;
            else map.set(pi.item_id, { nome: pi.item_nome || '—', codigo: pi.item_codigo || '—', qtd: pi.quantidade });
        }
        return Array.from(map.values()).sort((a, b) => b.qtd - a.qtd).slice(0, 10);
    }, [filteredItens]);

    const pedidosPorUnidade = useMemo(() => {
        const map = new Map<string, number>();
        for (const p of filteredPedidos) map.set(p.unidade_nome || '—', (map.get(p.unidade_nome || '—') || 0) + 1);
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    }, [filteredPedidos]);

    const itensNaoAtendidos = useMemo(() => {
        const ids = new Set(filteredPedidos.filter(p => p.status === 'Realizado' || p.status === 'Recebido').map(p => p.id));
        return filteredItens.filter(pi => ids.has(pi.pedido_id) && pi.quantidade_atendida === 0);
    }, [filteredItens, filteredPedidos]);

    if (loading) {
        return <div className="flex items-center justify-center py-24"><RefreshCw className="w-8 h-8 text-[#001A72] animate-spin" /></div>;
    }

    const maxTop = topItens[0]?.qtd || 1;

    return (
        <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6">
            <div className="flex items-center text-xs text-slate-500 gap-2 mb-2">
                <Link href="/" className="hover:text-[#001A72] transition-colors">Dashboard</Link>
                <ChevronRight className="w-3 h-3" />
                <span className="text-slate-800 font-medium">Relatórios</span>
            </div>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
                    <p className="text-sm text-slate-500">KPIs e análises para tomada de decisão</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Unidade</label>
                        <select value={filterUnidade} onChange={e => setFilterUnidade(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A72]">
                            <option value="">Todas as unidades</option>
                            {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">De</label>
                        <input type="date" value={filterDe} onChange={e => setFilterDe(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A72]" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Até</label>
                        <input type="date" value={filterAte} onChange={e => setFilterAte(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A72]" />
                    </div>
                </div>
            </div>

            {/* KPIs — Status */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                    { label: 'Total', value: totalPedidos, icon: ShoppingCart, color: 'text-[#001A72]' },
                    { label: 'Pendentes', value: pendentes, icon: Clock, color: 'text-orange-500' },
                    { label: 'Em Cotação', value: emCotacao, icon: TrendingUp, color: 'text-amber-500' },
                    { label: 'Realizados', value: realizados, icon: Package, color: 'text-[#001A72]' },
                    { label: 'Recebidos', value: recebidos, icon: CheckCircle2, color: 'text-green-600' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <Icon className={`w-4 h-4 ${color}`} />
                            <span className="text-2xl font-bold text-slate-900">{value}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-600">{label}</p>
                    </div>
                ))}
            </div>

            {/* KPIs — Quantidades e Taxas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <p className="text-xs text-slate-500 font-medium">Qtd Total Solicitada</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{totalItensQtd.toLocaleString('pt-BR')}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Unidades de itens</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <p className="text-xs text-slate-500 font-medium">Taxa de Atendimento</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{taxaAtendimento}%</p>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-[#001A72] transition-all" style={{ width: `${taxaAtendimento}%` }} />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <p className="text-xs text-slate-500 font-medium">Taxa de Recebimento</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{taxaRecebimento}%</p>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${taxaRecebimento}%` }} />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <div className="flex items-center gap-1.5 mb-1">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600" />
                        <p className="text-xs text-slate-500 font-medium">Remanejamentos</p>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{totalRemanejamentos}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{totalQtdRemanejada.toLocaleString('pt-BR')} un. transferidas</p>
                </div>
            </div>

            {/* Two columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top 10 Itens */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800">Top 10 Itens Mais Solicitados</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {topItens.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-slate-400">Sem dados no período</p>
                        ) : topItens.map((item, idx) => (
                            <div key={idx} className="px-5 py-3 flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-400 w-5 text-right">{idx + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{item.nome}</p>
                                    <p className="text-[11px] text-slate-400">{item.codigo}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="w-24 h-2 rounded-full bg-slate-100">
                                        <div className="h-2 rounded-full bg-[#001A72]" style={{ width: `${(item.qtd / maxTop) * 100}%` }} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 w-16 text-right">{item.qtd.toLocaleString('pt-BR')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pedidos por Unidade */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800">Pedidos por Unidade</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {pedidosPorUnidade.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-slate-400">Sem dados no período</p>
                        ) : pedidosPorUnidade.map(([nome, qtd], idx) => (
                            <div key={idx} className="px-5 py-3 flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{nome}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="w-24 h-2 rounded-full bg-slate-100">
                                        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(qtd / (pedidosPorUnidade[0][1] || 1)) * 100}%` }} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 w-10 text-right">{qtd}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Itens não atendidos */}
            {itensNaoAtendidos.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <h3 className="text-sm font-bold text-red-800">Itens Não Atendidos ({itensNaoAtendidos.length})</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm divide-y divide-slate-100">
                            <thead className="bg-red-50/50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Item</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Código</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Qtd Pedida</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {itensNaoAtendidos.slice(0, 20).map(pi => (
                                    <tr key={pi.id} className="hover:bg-red-50/30">
                                        <td className="px-4 py-2 text-slate-800 font-medium truncate max-w-[250px]">{pi.item_nome}</td>
                                        <td className="px-4 py-2 text-slate-500 font-mono text-xs">{pi.item_codigo}</td>
                                        <td className="px-4 py-2 text-right font-semibold text-red-600">{pi.quantidade}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
