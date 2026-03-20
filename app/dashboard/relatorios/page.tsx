'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { exportPDF, exportExcel, type RelatorioData } from '@/lib/exportRelatorio';
import {
    ChevronRight, RefreshCw, ShoppingCart, Package, CheckCircle2,
    Clock, TrendingUp, AlertTriangle, BarChart3, ArrowRightLeft,
    Building2, Activity, XCircle, AlertCircle, Boxes,
    FileDown, FileSpreadsheet, Loader2,
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
    fornecedor?: string;
    item_nome?: string;
    item_codigo?: string;
    observacao_recebimento?: string;
    item_recebido_id?: string | null;
    item_recebido_nome?: string;
    item_recebido_codigo?: string;
}

interface PedidoDivergencia {
    pedido_numero: string;
    unidade_nome: string;
    item_solicitado_nome: string;
    item_solicitado_codigo: string;
    item_recebido_nome: string;
    item_recebido_codigo: string;
    observacao: string;
    quantidade_recebida: number;
}

interface Unidade {
    id: string;
    nome: string;
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        'Pendente': 'bg-orange-100 text-orange-700 border-orange-200',
        'Em Cotação': 'bg-amber-100 text-amber-700 border-amber-200',
        'Realizado': 'bg-blue-100 text-blue-700 border-blue-200',
        'Recebido': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            {status}
        </span>
    );
}

function ProgressBar({ value, max, color = 'bg-[#001A72]', height = 'h-2' }: { value: number; max: number; color?: string; height?: string }) {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    return (
        <div className={`w-full ${height} rounded-full bg-slate-100 overflow-hidden`}>
            <div className={`${height} rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
    );
}

export default function RelatoriosPage() {
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [pedidoItens, setPedidoItens] = useState<PedidoItem[]>([]);
    const [totalRemanejamentos, setTotalRemanejamentos] = useState(0);
    const [totalQtdRemanejada, setTotalQtdRemanejada] = useState(0);
    const [unidades, setUnidades] = useState<Unidade[]>([]);
    const [filterUnidade, setFilterUnidade] = useState('');
    const [filterDe, setFilterDe] = useState('');
    const [filterAte, setFilterAte] = useState('');
    const [alertTab, setAlertTab] = useState<'parcial' | 'nao'>('parcial');
    const [exportingPDF, setExportingPDF] = useState(false);
    const [exportingXLS, setExportingXLS] = useState(false);
    const [itensDivergentes, setItensDivergentes] = useState<PedidoDivergencia[]>([]);

    // Modal de exportação
    const [exportModal, setExportModal] = useState<'pdf' | 'excel' | null>(null);
    const [modalUnidade, setModalUnidade] = useState('');
    const [modalDe, setModalDe] = useState('');
    const [modalAte, setModalAte] = useState('');

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
            .select('id, pedido_id, item_id, quantidade, quantidade_atendida, quantidade_recebida, fornecedor, observacao_recebimento, item_recebido_id, itens!item_id(nome, codigo), item_recebido:itens!item_recebido_id(nome, codigo)');
        setPedidoItens((pis || []).map((pi: any) => ({
            ...pi,
            item_nome: pi.itens?.nome || '—',
            item_codigo: pi.itens?.codigo || '—',
            item_recebido_nome: (pi.item_recebido as any)?.nome || '—',
            item_recebido_codigo: (pi.item_recebido as any)?.codigo || '—',
        })));

        // Load divergências: items with observacao_recebimento and item_recebido_id set
        const { data: divData } = await supabase
            .from('pedidos_itens')
            .select('id, observacao_recebimento, quantidade_recebida, pedido_id, item_id, item_recebido_id, itens!item_id(nome, codigo), item_recebido:itens!item_recebido_id(nome, codigo), pedidos(numero_pedido, unidades(nome))')
            .not('observacao_recebimento', 'is', null)
            .neq('observacao_recebimento', '')
            .not('item_recebido_id', 'is', null);

        setItensDivergentes((divData || []).map((d: any) => ({
            pedido_numero: d.pedidos?.numero_pedido || '—',
            unidade_nome: d.pedidos?.unidades?.nome || '—',
            item_solicitado_nome: d.itens?.nome || '—',
            item_solicitado_codigo: d.itens?.codigo || '—',
            item_recebido_nome: d.item_recebido?.nome || '—',
            item_recebido_codigo: d.item_recebido?.codigo || '—',
            observacao: d.observacao_recebimento || '',
            quantidade_recebida: d.quantidade_recebida || 0,
        })));

        setLastUpdated(new Date());
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

    const alertIds = useMemo(() =>
        new Set(filteredPedidos.filter(p => p.status === 'Realizado' || p.status === 'Recebido').map(p => p.id)),
        [filteredPedidos]);

    const itensNaoAtendidos = useMemo(() =>
        filteredItens.filter(pi => alertIds.has(pi.pedido_id) && pi.quantidade_atendida === 0),
        [filteredItens, alertIds]);

    const itensParcialmenteAtendidos = useMemo(() =>
        filteredItens.filter(pi => alertIds.has(pi.pedido_id) && pi.quantidade_atendida > 0 && pi.quantidade_atendida < pi.quantidade),
        [filteredItens, alertIds]);

    const hasAlerts = itensNaoAtendidos.length > 0 || itensParcialmenteAtendidos.length > 0;
    const activeAlertList = alertTab === 'parcial' ? itensParcialmenteAtendidos : itensNaoAtendidos;

    function buildRelatorioData(): RelatorioData {
        const unidadeNome = unidades.find(u => u.id === filterUnidade)?.nome || '';
        return {
            filtroUnidade: unidadeNome,
            filtroDe: filterDe,
            filtroAte: filterAte,
            totalPedidos,
            pendentes,
            emCotacao,
            realizados,
            recebidos,
            totalItensQtd,
            totalAtendida,
            totalRecebida,
            taxaAtendimento,
            taxaRecebimento,
            totalRemanejamentos,
            totalQtdRemanejada,
            topItens,
            pedidosPorUnidade,
            itensParcialmenteAtendidos: itensParcialmenteAtendidos.map(pi => ({
                item_nome: pi.item_nome || '—',
                item_codigo: pi.item_codigo || '—',
                fornecedor: pi.fornecedor,
                pedido_id: pi.pedido_id,
                quantidade: pi.quantidade,
                quantidade_atendida: pi.quantidade_atendida,
            })),
            itensNaoAtendidos: itensNaoAtendidos.map(pi => ({
                item_nome: pi.item_nome || '—',
                item_codigo: pi.item_codigo || '—',
                fornecedor: pi.fornecedor,
                pedido_id: pi.pedido_id,
                quantidade: pi.quantidade,
                quantidade_atendida: pi.quantidade_atendida,
            })),
            itensDivergentes,
        };
    }

    function openExportModal(type: 'pdf' | 'excel') {
        // Pre-fill modal with the current page filters
        setModalUnidade(filterUnidade);
        setModalDe(filterDe);
        setModalAte(filterAte);
        setExportModal(type);
    }

    async function handleModalExport() {
        // Build data using the modal's filter selections
        const unidadeNome = unidades.find(u => u.id === modalUnidade)?.nome || '';

        const filteredP = pedidos.filter(p => {
            if (modalUnidade && p.unidade_id !== modalUnidade) return false;
            const d = new Date(p.created_at).toISOString().slice(0, 10);
            if (modalDe && d < modalDe) return false;
            if (modalAte && d > modalAte) return false;
            return true;
        });
        const filteredIds = new Set(filteredP.map(p => p.id));
        const filteredI = pedidoItens.filter(pi => filteredIds.has(pi.pedido_id));

        const tot = filteredP.length;
        const pend = filteredP.filter(p => p.status === 'Pendente').length;
        const cot  = filteredP.filter(p => p.status === 'Em Cotação').length;
        const real = filteredP.filter(p => p.status === 'Realizado').length;
        const rec  = filteredP.filter(p => p.status === 'Recebido').length;

        const totQtd   = filteredI.reduce((s, i) => s + i.quantidade, 0);
        const totAtend = filteredI.reduce((s, i) => s + i.quantidade_atendida, 0);
        const totRec   = filteredI.reduce((s, i) => s + i.quantidade_recebida, 0);
        const txAtend  = totQtd > 0 ? Math.round((totAtend / totQtd) * 100) : 0;
        const txRec    = totAtend > 0 ? Math.round((totRec / totAtend) * 100) : 0;

        const alertPedIds = new Set(filteredP.filter(p => p.status === 'Realizado' || p.status === 'Recebido').map(p => p.id));
        const naoAtend    = filteredI.filter(pi => alertPedIds.has(pi.pedido_id) && pi.quantidade_atendida === 0);
        const parcAtend   = filteredI.filter(pi => alertPedIds.has(pi.pedido_id) && pi.quantidade_atendida > 0 && pi.quantidade_atendida < pi.quantidade);

        const topMap = new Map<string, { nome: string; codigo: string; qtd: number }>();
        for (const pi of filteredI) {
            const ex = topMap.get(pi.item_id);
            if (ex) ex.qtd += pi.quantidade;
            else topMap.set(pi.item_id, { nome: pi.item_nome || '—', codigo: pi.item_codigo || '—', qtd: pi.quantidade });
        }
        const top10 = Array.from(topMap.values()).sort((a, b) => b.qtd - a.qtd).slice(0, 10);

        const unitMap = new Map<string, number>();
        for (const p of filteredP) unitMap.set(p.unidade_nome || '—', (unitMap.get(p.unidade_nome || '—') || 0) + 1);
        const porUnidade = Array.from(unitMap.entries()).sort((a, b) => b[1] - a[1]);

        const relData: RelatorioData = {
            filtroUnidade: unidadeNome,
            filtroDe: modalDe,
            filtroAte: modalAte,
            totalPedidos: tot,
            pendentes: pend,
            emCotacao: cot,
            realizados: real,
            recebidos: rec,
            totalItensQtd: totQtd,
            totalAtendida: totAtend,
            totalRecebida: totRec,
            taxaAtendimento: txAtend,
            taxaRecebimento: txRec,
            totalRemanejamentos,
            totalQtdRemanejada,
            topItens: top10,
            pedidosPorUnidade: porUnidade,
            itensParcialmenteAtendidos: parcAtend.map(pi => ({
                item_nome: pi.item_nome || '—', item_codigo: pi.item_codigo || '—',
                fornecedor: pi.fornecedor, pedido_id: pi.pedido_id,
                quantidade: pi.quantidade, quantidade_atendida: pi.quantidade_atendida,
            })),
            itensNaoAtendidos: naoAtend.map(pi => ({
                item_nome: pi.item_nome || '—', item_codigo: pi.item_codigo || '—',
                fornecedor: pi.fornecedor, pedido_id: pi.pedido_id,
                quantidade: pi.quantidade, quantidade_atendida: pi.quantidade_atendida,
            })),
            itensDivergentes,
        };

        if (exportModal === 'pdf') {
            setExportingPDF(true);
            setExportModal(null);
            try { await exportPDF(relData); } finally { setExportingPDF(false); }
        } else {
            setExportingXLS(true);
            setExportModal(null);
            try { await exportExcel(relData); } finally { setExportingXLS(false); }
        }
    }

    const statusConfig = [
        { label: 'Pendente', count: pendentes, color: 'bg-orange-400', text: 'text-orange-600', light: 'bg-orange-50', icon: Clock },
        { label: 'Em Cotação', count: emCotacao, color: 'bg-amber-400', text: 'text-amber-600', light: 'bg-amber-50', icon: TrendingUp },
        { label: 'Realizado', count: realizados, color: 'bg-[#001A72]', text: 'text-[#001A72]', light: 'bg-blue-50', icon: Package },
        { label: 'Recebido', count: recebidos, color: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50', icon: CheckCircle2 },
    ];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
                <RefreshCw className="w-8 h-8 text-[#001A72] animate-spin" />
                <p className="text-sm text-slate-400">Carregando relatório...</p>
            </div>
        );
    }

    return (
        <>
        <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-5">

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center text-xs text-slate-400 gap-1.5 mb-2">
                        <Link href="/" className="hover:text-[#001A72] transition-colors">Dashboard</Link>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-slate-700 font-medium">Relatórios</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#001A72] flex items-center justify-center shadow-sm">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 leading-tight">Relatórios & KPIs</h1>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Análise de desempenho de pedidos e atendimentos
                                {lastUpdated && (
                                    <span className="ml-2 text-slate-300">· Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadData}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                        <RefreshCw className="w-3.5 h-3.5" />
                        Atualizar
                    </button>
                    <button
                        onClick={() => openExportModal('excel')}
                        disabled={exportingXLS || loading}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 hover:border-emerald-300 transition-all shadow-sm disabled:opacity-50"
                        title="Exportar relatório em Excel (.xlsx)"
                    >
                        {exportingXLS
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <FileSpreadsheet className="w-3.5 h-3.5" />}
                        Excel
                    </button>
                    <button
                        onClick={() => openExportModal('pdf')}
                        disabled={exportingPDF || loading}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-[#001A72] border border-[#001A72] rounded-lg hover:bg-[#001250] transition-all shadow-sm disabled:opacity-50"
                        title="Exportar relatório em PDF"
                    >
                        {exportingPDF
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <FileDown className="w-3.5 h-3.5" />}
                        PDF
                    </button>
                </div>
            </div>

            {/* ── Filtros ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filtros</span>
                    {(filterUnidade || filterDe || filterAte) && (
                        <button onClick={() => { setFilterUnidade(''); setFilterDe(''); setFilterAte(''); }}
                            className="ml-auto text-[11px] text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Limpar filtros
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">Unidade</label>
                        <select value={filterUnidade} onChange={e => setFilterUnidade(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A72]/30 focus:border-[#001A72]">
                            <option value="">Todas as unidades</option>
                            {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">De</label>
                        <input type="date" value={filterDe} onChange={e => setFilterDe(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A72]/30 focus:border-[#001A72]" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">Até</label>
                        <input type="date" value={filterAte} onChange={e => setFilterAte(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A72]/30 focus:border-[#001A72]" />
                    </div>
                </div>
            </div>

            {/* ── KPIs Principais ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="col-span-2 sm:col-span-3 lg:col-span-1 bg-[#001A72] rounded-xl p-5 shadow-sm text-white">
                    <div className="flex items-center justify-between mb-3">
                        <ShoppingCart className="w-5 h-5 text-blue-300" />
                        <span className="text-[11px] font-semibold text-blue-300 uppercase tracking-wide">Total</span>
                    </div>
                    <p className="text-4xl font-bold">{totalPedidos}</p>
                    <p className="text-xs text-blue-300 mt-1">pedidos no período</p>
                    <div className="mt-4 flex gap-1">
                        {statusConfig.map(s => (
                            <div key={s.label} className="h-1 rounded-full bg-white/20 flex-1 overflow-hidden">
                                <div className="h-1 rounded-full bg-white/70" style={{ width: `${totalPedidos ? (s.count / totalPedidos) * 100 : 0}%` }} />
                            </div>
                        ))}
                    </div>
                </div>

                {statusConfig.map(({ label, count, color, text, light, icon: Icon }) => (
                    <div key={label} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-8 h-8 rounded-lg ${light} flex items-center justify-center`}>
                                <Icon className={`w-4 h-4 ${text}`} />
                            </div>
                            <span className={`text-2xl font-bold ${text}`}>{count}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500">{label}</p>
                        <div className="mt-2">
                            <ProgressBar value={count} max={totalPedidos} color={color} />
                            <p className="text-[10px] text-slate-400 mt-1 text-right">
                                {totalPedidos > 0 ? Math.round((count / totalPedidos) * 100) : 0}% do total
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Funil de Atendimento + Remanejamentos ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-4 h-4 text-[#001A72]" />
                        <h3 className="text-sm font-bold text-slate-800">Funil de Atendimento</h3>
                        <span className="ml-auto text-[11px] text-slate-400">Unidades solicitadas</span>
                    </div>
                    <div className="space-y-4">
                        {[
                            { label: 'Solicitado', value: totalItensQtd, pct: 100, color: 'bg-[#001A72]', desc: 'Total de unidades pedidas' },
                            { label: 'Atendido', value: totalAtendida, pct: taxaAtendimento, color: 'bg-blue-400', desc: `${taxaAtendimento}% do solicitado` },
                            { label: 'Recebido', value: totalRecebida, pct: taxaRecebimento, color: 'bg-emerald-500', desc: `${taxaRecebimento}% do atendido` },
                        ].map((step, i) => (
                            <div key={step.label}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 flex items-center justify-center">{i + 1}</span>
                                        <span className="text-sm font-semibold text-slate-700">{step.label}</span>
                                        <span className="text-xs text-slate-400">{step.desc}</span>
                                    </div>
                                    <span className="text-base font-bold text-slate-900">{step.value.toLocaleString('pt-BR')}</span>
                                </div>
                                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                                    <div className={`h-3 rounded-full ${step.color} transition-all duration-700`} style={{ width: `${step.pct}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 rounded-lg px-4 py-3">
                            <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-wide">Taxa de Atendimento</p>
                            <p className="text-2xl font-bold text-[#001A72] mt-0.5">{taxaAtendimento}%</p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg px-4 py-3">
                            <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wide">Taxa de Recebimento</p>
                            <p className="text-2xl font-bold text-emerald-700 mt-0.5">{taxaRecebimento}%</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <ArrowRightLeft className="w-4 h-4 text-purple-600" />
                            <h3 className="text-sm font-bold text-slate-800">Remanejamentos</h3>
                        </div>
                        <div className="flex flex-col gap-4">
                            <div className="bg-purple-50 rounded-xl p-4 text-center">
                                <p className="text-4xl font-bold text-purple-700">{totalRemanejamentos}</p>
                                <p className="text-xs text-purple-500 mt-1 font-medium">transferências realizadas</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4 text-center">
                                <p className="text-3xl font-bold text-slate-700">{totalQtdRemanejada.toLocaleString('pt-BR')}</p>
                                <p className="text-xs text-slate-400 mt-1 font-medium">unidades transferidas</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-[11px] text-slate-400 text-center">
                            Média de {totalRemanejamentos > 0 ? (totalQtdRemanejada / totalRemanejamentos).toFixed(1) : 0} un./transferência
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Top Itens + Pedidos por Unidade ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top 10 Itens */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-[#001A72]" />
                        <h3 className="text-sm font-bold text-slate-800">Top 10 Itens Mais Solicitados</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {topItens.length === 0 ? (
                            <p className="px-5 py-10 text-center text-sm text-slate-400">Sem dados no período</p>
                        ) : topItens.map((item, idx) => (
                            <div key={idx} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/70 transition-colors">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${idx === 0 ? 'bg-[#001A72] text-white' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                                    {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate leading-tight">{item.nome}</p>
                                    <p className="text-[11px] text-slate-400 font-mono">{item.codigo}</p>
                                </div>
                                <div className="shrink-0 flex items-center gap-2 w-32">
                                    <ProgressBar value={item.qtd} max={topItens[0]?.qtd || 1} color="bg-[#001A72]" height="h-1.5" />
                                    <span className="text-sm font-bold text-slate-700 w-12 text-right">{item.qtd.toLocaleString('pt-BR')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pedidos por Unidade */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#001A72]" />
                        <h3 className="text-sm font-bold text-slate-800">Pedidos por Unidade</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {pedidosPorUnidade.length === 0 ? (
                            <p className="px-5 py-10 text-center text-sm text-slate-400">Sem dados no período</p>
                        ) : pedidosPorUnidade.map(([nome, qtd], idx) => (
                            <div key={idx} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/70 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{nome}</p>
                                    <div className="mt-1.5">
                                        <ProgressBar value={qtd} max={pedidosPorUnidade[0][1] || 1} color="bg-emerald-500" height="h-1.5" />
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <span className="text-sm font-bold text-slate-800">{qtd}</span>
                                    <p className="text-[10px] text-slate-400">{totalPedidos > 0 ? Math.round((qtd / totalPedidos) * 100) : 0}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Alertas de Atendimento ── */}
            {hasAlerts && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Header com tabs */}
                    <div className="px-5 pt-4 border-b border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertCircle className="w-4 h-4 text-slate-500" />
                            <h3 className="text-sm font-bold text-slate-800">Alertas de Atendimento</h3>
                            <span className="ml-auto text-[11px] text-slate-400">
                                pedidos com status Realizado ou Recebido
                            </span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setAlertTab('parcial')}
                                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${alertTab === 'parcial'
                                    ? 'border-amber-500 text-amber-700 bg-amber-50'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Parcialmente Atendidos
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${alertTab === 'parcial' ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                                    {itensParcialmenteAtendidos.length}
                                </span>
                            </button>
                            <button
                                onClick={() => setAlertTab('nao')}
                                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${alertTab === 'nao'
                                    ? 'border-red-500 text-red-700 bg-red-50'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                <XCircle className="w-3.5 h-3.5" />
                                Não Atendidos
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${alertTab === 'nao' ? 'bg-red-200 text-red-800' : 'bg-slate-100 text-slate-500'}`}>
                                    {itensNaoAtendidos.length}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Tabela */}
                    {activeAlertList.length === 0 ? (
                        <div className="py-12 text-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">Nenhum item nesta categoria</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className={`${alertTab === 'parcial' ? 'bg-amber-50/60' : 'bg-red-50/60'}`}>
                                        <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">Item</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">Código</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">Fornecedor</th>
                                        <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide">Pedido</th>
                                        {alertTab === 'parcial' && (
                                            <>
                                                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide">Atendido</th>
                                                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide">Pendente</th>
                                                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide w-32">Progresso</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {activeAlertList.slice(0, 20).map(pi => {
                                        const pct = pi.quantidade > 0 ? Math.round((pi.quantidade_atendida / pi.quantidade) * 100) : 0;
                                        return (
                                            <tr key={pi.id} className={`hover:${alertTab === 'parcial' ? 'bg-amber-50/30' : 'bg-red-50/30'} transition-colors`}>
                                                <td className="px-5 py-3 font-medium text-slate-800 max-w-[240px]">
                                                    <p className="truncate">{pi.item_nome}</p>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-500">{pi.item_codigo}</td>
                                                <td className="px-4 py-3 text-xs text-slate-500">
                                                    {pi.fornecedor
                                                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">{pi.fornecedor}</span>
                                                        : <span className="text-slate-300">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-slate-700">{pi.quantidade}</td>
                                                {alertTab === 'parcial' && (
                                                    <>
                                                        <td className="px-4 py-3 text-right font-semibold text-amber-600">{pi.quantidade_atendida}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-red-500">{pi.quantidade - pi.quantidade_atendida}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2 justify-end">
                                                                <ProgressBar value={pi.quantidade_atendida} max={pi.quantidade} color="bg-amber-400" height="h-2" />
                                                                <span className="text-[11px] font-bold text-amber-600 w-8 text-right">{pct}%</span>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {activeAlertList.length > 20 && (
                                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                                    <p className="text-xs text-slate-400 text-center">
                                        Exibindo 20 de {activeAlertList.length} registros
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            {/* ── Divergências de Recebimento ── */}
            {itensDivergentes.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-bold text-slate-800">Divergências de Recebimento</h3>
                        <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                            {itensDivergentes.length}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm divide-y divide-slate-100">
                            <thead className="bg-amber-50/60">
                                <tr>
                                    <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">Pedido</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">Unidade</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">Item Solicitado</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">Item Recebido</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide">Qtd Rec.</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">Observação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {itensDivergentes.slice(0, 20).map((d, idx) => (
                                    <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                                        <td className="px-5 py-3 text-xs font-semibold text-[#001A72]">#{d.pedido_numero}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{d.unidade_nome}</td>
                                        <td className="px-4 py-3 max-w-[200px]">
                                            <p className="text-xs font-medium text-slate-800 truncate">{d.item_solicitado_nome}</p>
                                            <p className="text-[10px] text-slate-400 font-mono">{d.item_solicitado_codigo}</p>
                                        </td>
                                        <td className="px-4 py-3 max-w-[200px]">
                                            <p className="text-xs font-medium text-blue-800 truncate">{d.item_recebido_nome}</p>
                                            <p className="text-[10px] text-blue-400 font-mono">{d.item_recebido_codigo}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-slate-700 text-xs">{d.quantidade_recebida}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg max-w-[280px]">
                                                <AlertTriangle className="w-3 h-3 shrink-0 text-amber-500" />
                                                {d.observacao}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {itensDivergentes.length > 20 && (
                            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                                <p className="text-xs text-slate-400 text-center">
                                    Exibindo 20 de {itensDivergentes.length} registros
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* ── Modal de Exportação ── */}

        {exportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Overlay */}
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setExportModal(null)} />

                {/* Dialog */}
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                    {/* Header */}
                    <div className="bg-[#001A72] px-6 py-5 flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                            {exportModal === 'pdf'
                                ? <FileDown className="w-5 h-5 text-white" />
                                : <FileSpreadsheet className="w-5 h-5 text-white" />}
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white">
                                Exportar Relatório — {exportModal === 'pdf' ? 'PDF' : 'Excel'}
                            </h2>
                            <p className="text-xs text-blue-300 mt-0.5">Selecione os filtros antes de gerar o arquivo</p>
                        </div>
                        <button onClick={() => setExportModal(null)} className="ml-auto p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-5 space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Unidade</label>
                            <select
                                value={modalUnidade}
                                onChange={e => setModalUnidade(e.target.value)}
                                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A72]/30 focus:border-[#001A72] transition-all"
                            >
                                <option value="">Todas as unidades</option>
                                {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Período — De</label>
                                <input
                                    type="date"
                                    value={modalDe}
                                    onChange={e => setModalDe(e.target.value)}
                                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A72]/30 focus:border-[#001A72] transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Período — Até</label>
                                <input
                                    type="date"
                                    value={modalAte}
                                    onChange={e => setModalAte(e.target.value)}
                                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A72]/30 focus:border-[#001A72] transition-all"
                                />
                            </div>
                        </div>

                        {/* Preview de escopo */}
                        <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Escopo do relatório</p>
                            <p className="text-xs text-slate-600">
                                <span className="font-semibold">Unidade:</span>{' '}
                                {modalUnidade ? unidades.find(u => u.id === modalUnidade)?.nome : 'Todas'}
                            </p>
                            <p className="text-xs text-slate-600 mt-0.5">
                                <span className="font-semibold">Período:</span>{' '}
                                {modalDe || modalAte
                                    ? `${modalDe ? new Date(modalDe + 'T00:00:00').toLocaleDateString('pt-BR') : 'início'} até ${modalAte ? new Date(modalAte + 'T00:00:00').toLocaleDateString('pt-BR') : 'hoje'}`
                                    : 'Todo o histórico'}
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 pb-5 flex items-center justify-end gap-3">
                        <button
                            onClick={() => setExportModal(null)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleModalExport}
                            className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all shadow-sm ${
                                exportModal === 'pdf'
                                    ? 'bg-[#001A72] hover:bg-[#001250]'
                                    : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                        >
                            {exportModal === 'pdf'
                                ? <><FileDown className="w-4 h-4" /> Gerar PDF</>
                                : <><FileSpreadsheet className="w-4 h-4" /> Gerar Excel</>}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
