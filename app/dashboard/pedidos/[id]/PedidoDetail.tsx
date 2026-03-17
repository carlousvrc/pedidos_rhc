'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { mockPedidos, mockPedidosItens, mockItens } from '@/lib/mockData';
import type { Usuario } from '@/lib/auth';
import {
    ChevronRight, Download, Save, Upload, RefreshCw,
    CheckCircle2, Pencil, FileText, X,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PedidoDetailProps {
    id: string;
    currentUser: Usuario | null;
}

interface PedidoItem {
    id: string;
    quantidade: number;
    quantidade_atendida: number;
    quantidade_recebida: number;
    observacao: string;
    itens: { codigo: string; referencia: string; nome: string; tipo?: string };
}

interface Pedido {
    id: string;
    numero_pedido: string;
    status: string;
    created_at: string;
    unidade_id: string;
    usuario_id?: string;
    unidades?: { nome: string };
    usuarios?: { nome: string };
}

type ItemReception = 'recebido' | 'parcial' | 'nao_recebido';

const STEPS = ['Pendente', 'Realizado', 'Recebido'];

// ── Small Components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const cls =
        status === 'Pendente'  ? 'bg-orange-100 text-orange-800' :
        status === 'Realizado' ? 'bg-blue-100 text-[#001A72]' :
        status === 'Recebido'  ? 'bg-green-100 text-green-800' :
        'bg-slate-100 text-slate-700';
    return (
        <span className={`px-2.5 py-0.5 inline-flex text-[11px] leading-5 font-semibold rounded-full ${cls}`}>
            {status}
        </span>
    );
}

function StatusStepper({ status }: { status: string }) {
    const currentIdx = STEPS.indexOf(status);
    return (
        <div className="flex items-center py-4">
            {STEPS.map((step, idx) => {
                const done   = idx < currentIdx;
                const active = idx === currentIdx;
                const circleClass = done || active
                    ? step === 'Pendente'  ? 'bg-orange-500 text-white border-orange-500'
                    : step === 'Realizado' ? 'bg-[#001A72] text-white border-[#001A72]'
                    : 'bg-green-500 text-white border-green-500'
                    : 'bg-white text-slate-400 border-slate-200';
                return (
                    <div key={step} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-1 flex-1">
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${circleClass}`}>
                                {done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                            </div>
                            <span className={`text-xs ${active ? 'font-bold text-slate-800' : done ? 'text-slate-600' : 'text-slate-400'}`}>{step}</span>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-2 ${idx < currentIdx ? 'bg-[#001A72]' : 'bg-slate-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PedidoDetail({ id, currentUser }: PedidoDetailProps) {
    const [pedido,        setPedido]        = useState<Pedido | null>(null);
    const [items,         setItems]         = useState<PedidoItem[]>([]);
    const [loading,       setLoading]       = useState(true);
    const [updating,      setUpdating]      = useState(false);
    const [saving,        setSaving]        = useState(false);

    // PDF upload + preview (before confirming)
    const [processingPdf, setProcessingPdf] = useState(false);
    const [pdfFiles,      setPdfFiles]      = useState<File[]>([]);
    const [pdfError,      setPdfError]      = useState('');
    const [previewBionexo, setPreviewBionexo] = useState<Array<{ codigo: string; quantidade: number }> | null>(null);

    // Solicitante item-level reception
    const [itemConfirmed, setItemConfirmed] = useState<Record<string, boolean>>({});
    const [itemQtyEdit,   setItemQtyEdit]   = useState<Record<string, number>>({});
    const [itemAtendidaEdit, setItemAtendidaEdit] = useState<Record<string, number>>({});

    const fileRef = useRef<HTMLInputElement>(null);
    const role    = currentUser?.role ?? 'solicitante';

    // ── Data loading ─────────────────────────────────────────────────────────

    async function loadData() {
        const { data: supabasePedido, error } = await supabase
            .from('pedidos')
            .select('*, unidades(nome), usuarios(nome)')
            .eq('id', id)
            .single();

        if (supabasePedido && !error) {
            setPedido(supabasePedido as Pedido);
            const { data: supabaseItems } = await supabase
                .from('pedidos_itens')
                .select('id, quantidade, quantidade_atendida, quantidade_recebida, observacao, itens(codigo, referencia, nome, tipo)')
                .eq('pedido_id', id);
            setItems((supabaseItems as unknown as PedidoItem[]) || []);
            setLoading(false);
            return;
        }

        // Fallback mock
        const mockP = mockPedidos.find(p => p.id === id);
        if (mockP) {
            setPedido(mockP as unknown as Pedido);
            const mockI = mockPedidosItens.filter(pi => pi.pedido_id === id);
            setItems(mockI.map(pi => {
                const itemRef = mockItens.find(i => i.id === pi.item_id);
                return {
                    id: pi.id, quantidade: pi.quantidade,
                    quantidade_atendida: pi.quantidade_atendida,
                    quantidade_recebida: pi.quantidade_recebida,
                    observacao: pi.observacao,
                    itens: { codigo: itemRef?.codigo || '', referencia: itemRef?.referencia || '', nome: itemRef?.nome || '', tipo: itemRef?.tipo },
                };
            }));
        }
        setLoading(false);
    }

    useEffect(() => {
        loadData();
        const ch = supabase.channel(`pedido-${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos',       filter: `id=eq.${id}` },           () => { setUpdating(true); loadData().then(() => setTimeout(() => setUpdating(false), 800)); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_itens', filter: `pedido_id=eq.${id}` }, () => { setUpdating(true); loadData().then(() => setTimeout(() => setUpdating(false), 800)); })
            .subscribe();
        return () => { supabase.removeChannel(ch); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Init reception state from DB values when items load
    useEffect(() => {
        if (items.length === 0) return;
        setItemConfirmed(prev => {
            const next = { ...prev };
            for (const item of items) {
                if (next[item.id] === undefined) next[item.id] = item.quantidade_recebida > 0;
            }
            return next;
        });
        setItemQtyEdit(prev => {
            const next = { ...prev };
            for (const item of items) {
                if (next[item.id] === undefined)
                    next[item.id] = item.quantidade_recebida > 0 ? item.quantidade_recebida : item.quantidade_atendida;
            }
            return next;
        });
        setItemAtendidaEdit(prev => {
            const next = { ...prev };
            for (const item of items) {
                if (next[item.id] === undefined) next[item.id] = item.quantidade_atendida;
            }
            return next;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    // ── PDF auto-processing ───────────────────────────────────────────────────

    async function processPdfFiles(files: File[]) {
        if (files.length === 0) return;
        setProcessingPdf(true);
        setPdfError('');
        setPreviewBionexo(null);
        try {
            const mergedMap: Record<string, number> = {};
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                const res  = await fetch('/api/bionexo/convert', { method: 'POST', body: formData });
                const json = await res.json();
                if (!res.ok) throw new Error(`${file.name}: ${json.error || 'Erro ao processar PDF.'}`);
                for (const it of (json.itens as Array<{ codigo: string; quantidade: number }>) ?? []) {
                    mergedMap[it.codigo] = (mergedMap[it.codigo] || 0) + it.quantidade;
                }
            }
            setPreviewBionexo(Object.entries(mergedMap).map(([codigo, quantidade]) => ({ codigo, quantidade })));
        } catch (err: any) {
            setPdfError(err.message || 'Erro ao processar PDF.');
        } finally {
            setProcessingPdf(false);
        }
    }

    function handleFilesChange(files: File[]) {
        setPdfFiles(files);
        setPdfError('');
        setPreviewBionexo(null);
        processPdfFiles(files);
    }

    // ── Preview comparison (before confirming) ────────────────────────────────

    const previewMap = useMemo<Record<string, number>>(() => {
        if (!previewBionexo) return {};
        const m: Record<string, number> = {};
        for (const it of previewBionexo) m[it.codigo] = (m[it.codigo] || 0) + it.quantidade;
        return m;
    }, [previewBionexo]);

    const previewComparison = useMemo(() => {
        if (!previewBionexo || items.length === 0) return null;
        return items.map(item => ({
            ...item,
            preview_atendida: previewMap[item.itens.codigo] ?? 0,
        }));
    }, [previewBionexo, previewMap, items]);

    // ── Confirmar Pedido (comprador saves atendidas + changes status) ─────────

    async function handleConfirmarPedido() {
        if (!previewBionexo) return;
        setProcessingPdf(true);
        try {
            for (const item of items) {
                const quantidade_atendida = previewMap[item.itens.codigo] ?? 0;
                await supabase.from('pedidos_itens').update({ quantidade_atendida }).eq('id', item.id);
            }
            await supabase.from('pedidos').update({ status: 'Realizado' }).eq('id', id);
            await loadData();
            setPdfFiles([]);
            setPreviewBionexo(null);
        } catch (err: any) {
            setPdfError(err.message || 'Erro ao confirmar pedido.');
        } finally {
            setProcessingPdf(false);
        }
    }

    // ── Confirmar Recebimento (solicitante saves reception per item) ──────────

    async function handleSaveRecebimento() {
        if (!pedido) return;
        setSaving(true);
        try {
            for (const item of items) {
                const atendida = itemAtendidaEdit[item.id] ?? item.quantidade_atendida;
                const qty = itemConfirmed[item.id] ? (itemQtyEdit[item.id] ?? 0) : 0;
                await supabase.from('pedidos_itens')
                    .update({ quantidade_atendida: atendida, quantidade_recebida: qty })
                    .eq('id', item.id);
            }
            await supabase.from('pedidos').update({ status: 'Recebido' }).eq('id', id);
            await loadData();
        } catch (err) {
            console.error('Erro ao salvar recebimento:', err);
        } finally {
            setSaving(false);
        }
    }

    async function handleChangeStatus(newStatus: string) {
        await supabase.from('pedidos').update({ status: newStatus }).eq('id', id);
        await loadData();
    }

    // ── CSV export ────────────────────────────────────────────────────────────

    function handleExportCsv() {
        if (!pedido) return;
        const csv = items.map(i => `${i.itens.codigo};${i.quantidade}`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `Pedido_${pedido.numero_pedido}.csv`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    function getSituacao(atendida: number, pedida: number) {
        if (atendida >= pedida) return 'atendido';
        if (atendida > 0)       return 'parcial';
        return 'nao_atendido';
    }

    function getRecebimentoStatus(recebida: number, atendida: number): ItemReception {
        if (recebida >= atendida && atendida > 0) return 'recebido';
        if (recebida > 0) return 'parcial';
        return 'nao_recebido';
    }

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <RefreshCw className="w-8 h-8 text-[#001A72] animate-spin" />
            </div>
        );
    }
    if (!pedido) {
        return <div className="text-red-500 p-8 text-center font-bold bg-white rounded-xl border border-red-100">Pedido #{id} não encontrado.</div>;
    }

    const canComprador  = role === 'comprador' || role === 'admin';
    const canSolicitante = role === 'solicitante' || role === 'admin';
    const canEdit       = currentUser?.permissoes?.modulos?.usuarios === true;
    const status        = pedido.status;

    const allReceptionSet = items.length > 0 && items.every(i => itemConfirmed[i.id] === true);

    return (
        <div className="space-y-6 max-w-[1400px]">

            {/* Breadcrumbs */}
            <div className="flex items-center text-xs text-slate-500 gap-2">
                <Link href="/" className="hover:text-[#001A72] transition-colors">Dashboard</Link>
                <ChevronRight className="w-3 h-3" />
                <span>Pedidos</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-slate-800 font-medium">#{pedido.numero_pedido}</span>
            </div>

            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <h1 className="text-2xl font-bold text-slate-900">Pedido #{pedido.numero_pedido}</h1>
                            <StatusBadge status={status} />
                            {canEdit && (
                                <Link href={`/dashboard/pedidos/${pedido.id}/editar`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                                    <Pencil className="w-3.5 h-3.5" /> Editar
                                </Link>
                            )}
                            {updating && (
                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                    <RefreshCw className="w-3 h-3 animate-spin" /> Atualizando...
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-6 text-sm">
                            <div>
                                <p className="text-slate-500 mb-0.5">Data</p>
                                <p className="font-medium text-slate-900">
                                    {new Date(pedido.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-0.5">Unidade Solicitante</p>
                                <p className="font-medium text-slate-900">{pedido.unidades?.nome || 'N/I'}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-0.5">Solicitante</p>
                                <p className="font-medium text-slate-900">{pedido.usuarios?.nome || '—'}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <StatusStepper status={status} />
            </div>

            {/* ── Área do Comprador ────────────────────────────────────────── */}
            {canComprador && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800">Área do Comprador</h2>
                        {status === 'Realizado' && (
                            <span className="flex items-center gap-1.5 text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5" /> PDF confirmado
                            </span>
                        )}
                    </div>

                    {status === 'Pendente' && (
                        <div className="p-6 space-y-6">
                            {/* Steps row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                {/* Passo 1 — CSV */}
                                <div className="flex flex-col gap-4 p-5 rounded-xl border-2 border-[#001A72]/20 bg-blue-50/40">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#001A72] text-white flex items-center justify-center text-sm font-bold shrink-0">1</div>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">Baixar CSV do Pedido</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Envie para a plataforma de cotação</p>
                                        </div>
                                    </div>
                                    <button onClick={handleExportCsv}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#001A72] text-white text-sm font-medium rounded-lg hover:bg-[#001250] transition-colors">
                                        <Download className="w-4 h-4" /> Baixar CSV
                                    </button>
                                </div>

                                {/* Passo 2 — PDF upload */}
                                <div className="flex flex-col gap-4 p-5 rounded-xl border-2 border-slate-200 bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${pdfFiles.length > 0 ? 'bg-[#001A72] text-white' : 'bg-slate-300 text-white'}`}>2</div>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">Anexar PDF de Resposta</p>
                                            <p className="text-xs text-slate-500 mt-0.5">O PDF será processado automaticamente</p>
                                        </div>
                                    </div>

                                    {/* Drop zone */}
                                    <div
                                        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${pdfFiles.length > 0 ? 'border-[#001A72] bg-blue-50' : 'border-slate-200 hover:border-[#001A72] hover:bg-slate-100'}`}
                                        onClick={() => !processingPdf && fileRef.current?.click()}
                                    >
                                        {processingPdf ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <RefreshCw className="w-5 h-5 text-[#001A72] animate-spin" />
                                                <p className="text-xs text-slate-500">Processando PDF...</p>
                                            </div>
                                        ) : pdfFiles.length > 0 ? (
                                            <div className="space-y-1">
                                                {pdfFiles.map((f, i) => (
                                                    <div key={i} className="flex items-center justify-center gap-1.5">
                                                        <FileText className="w-3.5 h-3.5 text-[#001A72] shrink-0" />
                                                        <p className="text-xs font-medium text-[#001A72] truncate">{f.name}</p>
                                                    </div>
                                                ))}
                                                <p className="text-[11px] text-slate-400 mt-1">{pdfFiles.length} arquivo(s) · clique para trocar</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <Upload className="w-5 h-5 mx-auto mb-1.5 text-slate-300" />
                                                <p className="text-xs text-slate-400">Clique para selecionar PDFs</p>
                                            </div>
                                        )}
                                        <input ref={fileRef} type="file" accept=".pdf" multiple className="hidden"
                                            onChange={e => handleFilesChange(Array.from(e.target.files || []))} />
                                    </div>
                                    {pdfError && <p className="text-xs text-red-600">{pdfError}</p>}
                                </div>
                            </div>

                            {/* Preview da comparação */}
                            {previewComparison && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">Prévia da Comparação</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Revise antes de confirmar</p>
                                        </div>
                                        {/* Summary chips */}
                                        <div className="flex gap-2 flex-wrap justify-end">
                                            {(() => {
                                                const atend   = previewComparison.filter(i => getSituacao(i.preview_atendida, i.quantidade) === 'atendido').length;
                                                const parcial = previewComparison.filter(i => getSituacao(i.preview_atendida, i.quantidade) === 'parcial').length;
                                                const nao     = previewComparison.filter(i => getSituacao(i.preview_atendida, i.quantidade) === 'nao_atendido').length;
                                                return (
                                                    <>
                                                        <span className="px-2 py-0.5 text-[11px] font-semibold bg-green-100 text-green-700 rounded-full">{atend} atendido(s)</span>
                                                        {parcial > 0 && <span className="px-2 py-0.5 text-[11px] font-semibold bg-yellow-100 text-yellow-700 rounded-full">{parcial} parcial(is)</span>}
                                                        {nao     > 0 && <span className="px-2 py-0.5 text-[11px] font-semibold bg-red-100 text-red-600 rounded-full">{nao} não atendido(s)</span>}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto max-h-64">
                                        <table className="min-w-full text-sm divide-y divide-slate-100">
                                            <thead className="bg-slate-50 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Produto</th>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Código</th>
                                                    <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Pedido</th>
                                                    <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Atendido</th>
                                                    <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Dif.</th>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Situação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-50">
                                                {previewComparison.map(item => {
                                                    const sit  = getSituacao(item.preview_atendida, item.quantidade);
                                                    const diff = item.preview_atendida - item.quantidade;
                                                    return (
                                                        <tr key={item.id} className={sit === 'atendido' ? 'bg-green-50/40' : sit === 'parcial' ? 'bg-yellow-50/50' : 'bg-red-50/40'}>
                                                            <td className="px-4 py-2 text-slate-800 font-medium max-w-[200px] truncate">{item.itens.nome}</td>
                                                            <td className="px-4 py-2 text-slate-500 font-mono text-xs">{item.itens.codigo}</td>
                                                            <td className="px-4 py-2 text-right font-semibold text-slate-800">{item.quantidade}</td>
                                                            <td className={`px-4 py-2 text-right font-semibold ${sit === 'atendido' ? 'text-green-700' : sit === 'parcial' ? 'text-yellow-700' : 'text-red-600'}`}>{item.preview_atendida}</td>
                                                            <td className={`px-4 py-2 text-right font-semibold text-xs ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-700' : 'text-slate-400'}`}>{diff > 0 ? `+${diff}` : diff === 0 ? '—' : diff}</td>
                                                            <td className="px-4 py-2">
                                                                {sit === 'atendido'    && <span className="text-[11px] font-semibold text-green-700">✓ Atendido</span>}
                                                                {sit === 'parcial'     && <span className="text-[11px] font-semibold text-yellow-700">~ Parcial</span>}
                                                                {sit === 'nao_atendido'&& <span className="text-[11px] font-semibold text-red-600">✕ Não atendido</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Confirmar Pedido */}
                                    <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                                        <button
                                            onClick={handleConfirmarPedido}
                                            disabled={processingPdf}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-[#001A72] text-white text-sm font-medium rounded-lg hover:bg-[#001250] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            Confirmar Pedido
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {status === 'Realizado' && (
                        <div className="px-6 py-4 text-sm text-slate-600">
                            PDF processado. Aguardando confirmação de recebimento pelo solicitante.
                        </div>
                    )}

                    {/* Manual status change */}
                    <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap gap-2 items-center">
                        <span className="text-xs text-slate-400">Alterar status manualmente:</span>
                        {STEPS.filter(s => s !== status).map(s => (
                            <button key={s} onClick={() => handleChangeStatus(s)}
                                className="text-xs px-3 py-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition-colors">
                                Marcar como {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Tabela de Itens ──────────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Itens do Pedido</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{items.length} item(s)</p>
                    </div>
                </div>

                {/* Comparison summary — shown after PDF is confirmed */}
                {status !== 'Pendente' && items.length > 0 && (() => {
                    const atendidos = items.filter(i => getSituacao(i.quantidade_atendida, i.quantidade) === 'atendido').length;
                    const parciais  = items.filter(i => getSituacao(i.quantidade_atendida, i.quantidade) === 'parcial').length;
                    const naoAtend  = items.filter(i => getSituacao(i.quantidade_atendida, i.quantidade) === 'nao_atendido').length;
                    const totalPed  = items.reduce((s, i) => s + i.quantidade, 0);
                    const totalAt   = items.reduce((s, i) => s + i.quantidade_atendida, 0);
                    const diff      = totalAt - totalPed;
                    return (
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-white rounded-lg border border-slate-100 px-4 py-3">
                                    <p className="text-xs text-slate-500">Total de itens</p>
                                    <p className="text-2xl font-bold text-slate-800 mt-0.5">{items.length}</p>
                                </div>
                                <div className="bg-green-50 rounded-lg border border-green-100 px-4 py-3">
                                    <p className="text-xs text-green-700 font-medium">Atendidos</p>
                                    <p className="text-2xl font-bold text-green-700 mt-0.5">{atendidos}</p>
                                </div>
                                <div className={`rounded-lg border px-4 py-3 ${parciais > 0 ? 'bg-yellow-50 border-yellow-100' : 'bg-white border-slate-100'}`}>
                                    <p className={`text-xs font-medium ${parciais > 0 ? 'text-yellow-700' : 'text-slate-400'}`}>Parcialmente</p>
                                    <p className={`text-2xl font-bold mt-0.5 ${parciais > 0 ? 'text-yellow-700' : 'text-slate-300'}`}>{parciais}</p>
                                </div>
                                <div className={`rounded-lg border px-4 py-3 ${naoAtend > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
                                    <p className={`text-xs font-medium ${naoAtend > 0 ? 'text-red-600' : 'text-slate-400'}`}>Não atendidos</p>
                                    <p className={`text-2xl font-bold mt-0.5 ${naoAtend > 0 ? 'text-red-600' : 'text-slate-300'}`}>{naoAtend}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span>Qtd solicitada: <strong className="text-slate-700">{totalPed}</strong></span>
                                <span>Qtd atendida: <strong className="text-slate-700">{totalAt}</strong></span>
                                <span>Diferença: <strong className={diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-700' : 'text-slate-500'}>{diff > 0 ? `+${diff}` : diff}</strong></span>
                            </div>
                        </div>
                    );
                })()}

                {/* Item table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase w-8">#</th>
                                {status !== 'Pendente' && <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Situação</th>}
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Produto</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Código</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Tipo</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Qtd Pedida</th>
                                {status !== 'Pendente' && (
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Qtd Atendida</th>
                                )}
                                {status === 'Realizado' && canSolicitante && (
                                    <>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Qtd Recebida</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase"></th>
                                    </>
                                )}
                                {status === 'Recebido' && (
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Qtd Recebida</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="px-6 py-10 text-center text-slate-500">Nenhum item encontrado.</td>
                                </tr>
                            ) : items.map((item, idx) => {
                                const atendidaVal = (status === 'Realizado' && canSolicitante)
                                    ? (itemAtendidaEdit[item.id] ?? item.quantidade_atendida)
                                    : item.quantidade_atendida;
                                const situacao  = getSituacao(atendidaVal, item.quantidade);
                                const recebidaVal = itemQtyEdit[item.id] ?? item.quantidade_recebida;
                                const reception = getRecebimentoStatus(recebidaVal, atendidaVal);
                                const confirmed = itemConfirmed[item.id] ?? false;
                                const rowBg = status === 'Realizado'
                                    ? situacao === 'atendido' ? 'bg-green-50/50' : situacao === 'parcial' ? 'bg-yellow-50/60' : 'bg-red-50/50'
                                    : status === 'Recebido'
                                    ? reception === 'recebido' ? 'bg-green-50/50' : reception === 'parcial' ? 'bg-yellow-50/60' : 'bg-red-50/50'
                                    : '';

                                return (
                                    <tr key={item.id} className={`transition-colors hover:brightness-95 ${rowBg}`}>
                                        <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">{idx + 1}</td>

                                        {/* Situação (comprador atendimento) */}
                                        {status !== 'Pendente' && (
                                            <td className="px-4 py-3.5">
                                                {situacao === 'atendido'     && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3" /> Atendido</span>}
                                                {situacao === 'parcial'      && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-yellow-100 text-yellow-700">~ Parcial</span>}
                                                {situacao === 'nao_atendido' && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-red-100 text-red-600">✕ Não atendido</span>}
                                            </td>
                                        )}

                                        <td className="px-4 py-3.5 text-slate-800 font-medium max-w-xs truncate">{item.itens.nome}</td>
                                        <td className="px-4 py-3.5 text-slate-500 font-mono">{item.itens.codigo}</td>
                                        <td className="px-4 py-3.5 text-slate-500">{item.itens.tipo || '—'}</td>
                                        <td className="px-4 py-3.5 text-right font-semibold text-slate-900">{item.quantidade}</td>

                                        {status !== 'Pendente' && (
                                            <td className={`px-4 py-3.5 text-right font-semibold ${situacao === 'atendido' ? 'text-green-700' : situacao === 'parcial' ? 'text-yellow-700' : 'text-red-600'}`}>
                                                {status === 'Realizado' && canSolicitante ? (
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={itemAtendidaEdit[item.id] ?? item.quantidade_atendida}
                                                        onChange={e => setItemAtendidaEdit(p => ({ ...p, [item.id]: parseInt(e.target.value) || 0 }))}
                                                        className="w-20 border border-slate-200 rounded px-2 py-1 text-xs text-right font-semibold focus:outline-none focus:ring-2 focus:ring-[#001A72]"
                                                    />
                                                ) : (
                                                    item.quantidade_atendida
                                                )}
                                            </td>
                                        )}

                                        {/* Recebimento per item — solicitante, status Realizado */}
                                        {status === 'Realizado' && canSolicitante && (
                                            <>
                                                <td className="px-4 py-3.5">
                                                    <input
                                                        type="number" min={0}
                                                        value={itemQtyEdit[item.id] ?? 0}
                                                        onChange={e => {
                                                            setItemQtyEdit(p => ({ ...p, [item.id]: parseInt(e.target.value) || 0 }));
                                                            setItemConfirmed(p => ({ ...p, [item.id]: false }));
                                                        }}
                                                        className="w-20 border border-slate-200 rounded px-2 py-1 text-xs text-right font-semibold focus:outline-none focus:ring-2 focus:ring-[#001A72]"
                                                    />
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    {reception === 'recebido'     && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3" /> Recebido</span>}
                                                    {reception === 'parcial'      && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-yellow-100 text-yellow-700">~ Parcial</span>}
                                                    {reception === 'nao_recebido' && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-red-100 text-red-600">✕ Não recebido</span>}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <button
                                                        onClick={() => setItemConfirmed(p => ({ ...p, [item.id]: !confirmed }))}
                                                        className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${confirmed ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                                    >
                                                        {confirmed ? <><CheckCircle2 className="w-3 h-3 inline mr-1" />Confirmado</> : 'Confirmar'}
                                                    </button>
                                                </td>
                                            </>
                                        )}

                                        {/* Qty received — read-only after Recebido */}
                                        {status === 'Recebido' && (
                                            <td className="px-4 py-3.5 text-right font-semibold text-slate-700">
                                                {item.quantidade_recebida}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Confirmar Recebimento — solicitante, status Realizado */}
            {canSolicitante && status === 'Realizado' && (
                <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-slate-100 px-6 py-4">
                    {!allReceptionSet && (
                        <p className="text-xs text-slate-500">Confirme cada item acima antes de salvar o recebimento.</p>
                    )}
                    {allReceptionSet && <span />}
                    <button
                        onClick={handleSaveRecebimento}
                        disabled={saving || !allReceptionSet}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Salvando...' : 'Confirmar Recebimento'}
                    </button>
                </div>
            )}

        </div>
    );
}
