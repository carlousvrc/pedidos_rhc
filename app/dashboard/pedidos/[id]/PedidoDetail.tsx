'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { mockPedidos, mockPedidosItens, mockItens } from '@/lib/mockData';
import type { Usuario } from '@/lib/auth';
import { ChevronRight, Download, Save, Upload, RefreshCw, CheckCircle2 } from 'lucide-react';
import Papa from 'papaparse';

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
    itens: {
        codigo: string;
        referencia: string;
        nome: string;
        tipo?: string;
    };
}

interface Pedido {
    id: string;
    numero_pedido: string;
    status: string;
    created_at: string;
    unidade_id: string;
    usuario_id?: string;
    unidades?: { nome: string };
}

const STEPS = ['Pendente', 'Realizado', 'Recebido'];

function StatusBadge({ status }: { status: string }) {
    const cls =
        status === 'Pendente' ? 'bg-orange-100 text-orange-800' :
        status === 'Realizado' ? 'bg-blue-100 text-[#001A72]' :
        status === 'Recebido' ? 'bg-green-100 text-green-800' :
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
        <div className="flex items-center gap-0 py-4">
            {STEPS.map((step, idx) => {
                const done = idx < currentIdx;
                const active = idx === currentIdx;
                const stepColor = done || active
                    ? step === 'Pendente' ? 'bg-orange-500 text-white border-orange-500'
                        : step === 'Realizado' ? 'bg-[#001A72] text-white border-[#001A72]'
                        : 'bg-green-500 text-white border-green-500'
                    : 'bg-white text-slate-400 border-slate-200';
                const labelColor = active ? 'font-bold text-slate-800' : done ? 'text-slate-600' : 'text-slate-400';
                return (
                    <div key={step} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-1 flex-1">
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${stepColor}`}>
                                {done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                            </div>
                            <span className={`text-xs ${labelColor}`}>{step}</span>
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

export default function PedidoDetail({ id, currentUser }: PedidoDetailProps) {
    const [pedido, setPedido] = useState<Pedido | null>(null);
    const [items, setItems] = useState<PedidoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [processingPdf, setProcessingPdf] = useState(false);
    const [pdfFiles, setPdfFiles] = useState<File[]>([]);
    const [pdfError, setPdfError] = useState('');
    const [localEdits, setLocalEdits] = useState<Record<string, { quantidade_recebida: number; observacao: string }>>({});
    const fileRef = useRef<HTMLInputElement>(null);

    const role = currentUser?.role ?? 'solicitante';

    async function loadData() {
        // Try Supabase
        const { data: supabasePedido, error: pedidoError } = await supabase
            .from('pedidos')
            .select('*, unidades(nome)')
            .eq('id', id)
            .single();

        if (supabasePedido && !pedidoError) {
            setPedido(supabasePedido as Pedido);

            const { data: supabaseItems } = await supabase
                .from('pedidos_itens')
                .select('id, quantidade, quantidade_atendida, quantidade_recebida, observacao, itens(codigo, referencia, nome, tipo)')
                .eq('pedido_id', id);

            setItems((supabaseItems as unknown as PedidoItem[]) || []);
            setLoading(false);
            return;
        }

        // Fallback to mock
        const mockP = mockPedidos.find(p => p.id === id);
        if (mockP) {
            setPedido(mockP as unknown as Pedido);
            const mockI = mockPedidosItens.filter(pi => pi.pedido_id === id);
            const mapped: PedidoItem[] = mockI.map(pi => {
                const itemRef = mockItens.find(i => i.id === pi.item_id);
                return {
                    id: pi.id,
                    quantidade: pi.quantidade,
                    quantidade_atendida: pi.quantidade_atendida,
                    quantidade_recebida: pi.quantidade_recebida,
                    observacao: pi.observacao,
                    itens: {
                        codigo: itemRef?.codigo || '',
                        referencia: itemRef?.referencia || '',
                        nome: itemRef?.nome || '',
                        tipo: itemRef?.tipo || '',
                    }
                };
            });
            setItems(mapped);
        }
        setLoading(false);
    }

    useEffect(() => {
        loadData();

        const pedidoChannel = supabase
            .channel(`pedido-${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: `id=eq.${id}` }, () => {
                setUpdating(true);
                loadData().then(() => setTimeout(() => setUpdating(false), 800));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_itens', filter: `pedido_id=eq.${id}` }, () => {
                setUpdating(true);
                loadData().then(() => setTimeout(() => setUpdating(false), 800));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(pedidoChannel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Init local edits when items load
    useEffect(() => {
        if (items.length > 0) {
            const edits: Record<string, { quantidade_recebida: number; observacao: string }> = {};
            items.forEach(item => {
                if (!localEdits[item.id]) {
                    edits[item.id] = {
                        quantidade_recebida: item.quantidade_recebida,
                        observacao: item.observacao,
                    };
                }
            });
            if (Object.keys(edits).length > 0) {
                setLocalEdits(prev => ({ ...edits, ...prev }));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    async function handleProcessBionexo() {
        if (pdfFiles.length === 0) {
            setPdfError('Selecione pelo menos um arquivo PDF.');
            return;
        }
        setProcessingPdf(true);
        setPdfError('');

        try {
            // Process all files and merge results (sum quantities per codigo)
            const mergedMap: Record<string, number> = {};

            for (const file of pdfFiles) {
                const formData = new FormData();
                formData.append('file', file);

                const res = await fetch('/api/bionexo/convert', { method: 'POST', body: formData });
                const json = await res.json();

                if (!res.ok) {
                    throw new Error(`${file.name}: ${json.error || 'Erro ao processar PDF.'}`);
                }

                const fileItens: Array<{ codigo: string; quantidade: number }> = json.itens || [];
                for (const it of fileItens) {
                    mergedMap[it.codigo] = (mergedMap[it.codigo] || 0) + it.quantidade;
                }
            }

            const bionexoItens = Object.entries(mergedMap).map(([codigo, quantidade]) => ({ codigo, quantidade }));

            // Match by codigo and update supabase
            const updates = items.map(item => {
                const match = bionexoItens.find(b => b.codigo === item.itens.codigo);
                return {
                    id: item.id,
                    quantidade_atendida: match ? match.quantidade : 0,
                };
            });

            for (const upd of updates) {
                await supabase
                    .from('pedidos_itens')
                    .update({ quantidade_atendida: upd.quantidade_atendida })
                    .eq('id', upd.id);
            }

            // Update pedido status to Realizado
            await supabase.from('pedidos').update({ status: 'Realizado' }).eq('id', id);

            await loadData();
        } catch (err: any) {
            setPdfError(err.message || 'Erro ao processar PDF Bionexo.');
        } finally {
            setProcessingPdf(false);
        }
    }

    async function handleSaveRecebimento() {
        if (!pedido) return;
        setSaving(true);
        try {
            for (const item of items) {
                const edit = localEdits[item.id];
                if (edit) {
                    await supabase
                        .from('pedidos_itens')
                        .update({
                            quantidade_recebida: edit.quantidade_recebida,
                            observacao: edit.observacao,
                        })
                        .eq('id', item.id);
                }
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

    function handleExportCsv() {
        if (!pedido) return;
        const rows = items.map((item, idx) => ({
            '#': idx + 1,
            Produto: item.itens.nome,
            Codigo: item.itens.codigo,
            Tipo: item.itens.tipo || '',
            Qtd_Pedida: item.quantidade,
            Qtd_Atendida: item.quantidade_atendida,
            Diferenca: item.quantidade_atendida - item.quantidade,
            Qtd_Recebida: localEdits[item.id]?.quantidade_recebida ?? item.quantidade_recebida,
            Observacao: localEdits[item.id]?.observacao ?? item.observacao,
        }));
        const csv = Papa.unparse(rows, { delimiter: ';', header: true });
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Pedido_${pedido.numero_pedido}_${pedido.unidades?.nome || 'Unidade'}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function getSituacao(atendida: number, pedida: number): 'atendido' | 'parcial' | 'nao_atendido' {
        if (atendida >= pedida) return 'atendido';
        if (atendida > 0) return 'parcial';
        return 'nao_atendido';
    }

    function getDiffColor(diff: number) {
        if (diff === 0) return 'text-slate-500';
        if (diff > 0) return 'text-green-700';
        return 'text-red-600 font-semibold';
    }

    function getRowHighlight(item: PedidoItem, status: string) {
        if (status === 'Realizado') {
            const s = getSituacao(item.quantidade_atendida, item.quantidade);
            if (s === 'atendido') return 'bg-green-50/50';
            if (s === 'parcial') return 'bg-yellow-50/60';
            return 'bg-red-50/50';
        }
        if (status === 'Recebido') {
            const recebida = localEdits[item.id]?.quantidade_recebida ?? item.quantidade_recebida;
            if (recebida >= item.quantidade) return 'bg-green-50/50';
            if (recebida > 0) return 'bg-yellow-50/60';
            return 'bg-red-50/50';
        }
        return '';
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <RefreshCw className="w-8 h-8 text-[#001A72] animate-spin" />
            </div>
        );
    }

    if (!pedido) {
        return (
            <div className="text-red-500 p-8 text-center font-bold bg-white rounded-xl shadow-sm border border-red-100">
                Pedido #{id} não encontrado.
            </div>
        );
    }

    const canComprador = role === 'comprador' || role === 'admin';
    const canSolicitante = role === 'solicitante' || role === 'admin';
    const status = pedido.status;

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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <h1 className="text-2xl font-bold text-slate-900">Pedido #{pedido.numero_pedido}</h1>
                            <StatusBadge status={status} />
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
                                    {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-0.5">Unidade Solicitante</p>
                                <p className="font-medium text-slate-900">{pedido.unidades?.nome || 'N/I'}</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleExportCsv}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Exportar CSV
                    </button>
                </div>

                {/* Status Stepper */}
                <StatusStepper status={status} />
            </div>

            {/* Comprador Section */}
            {canComprador && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800">Área do Comprador</h2>
                        {status === 'Pendente' && (
                            <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2.5 py-1 rounded-full">
                                Aguardando processamento
                            </span>
                        )}
                        {status === 'Realizado' && (
                            <span className="flex items-center gap-1.5 text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5" /> PDF processado
                            </span>
                        )}
                    </div>

                    {status === 'Pendente' && (
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                {/* Passo 1 */}
                                <div className="flex flex-col gap-4 p-5 rounded-xl border-2 border-[#001A72]/20 bg-blue-50/40">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#001A72] text-white flex items-center justify-center text-sm font-bold shrink-0">1</div>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">Baixar CSV do Pedido</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Envie para a plataforma de cotação</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleExportCsv}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#001A72] text-white text-sm font-medium rounded-lg hover:bg-[#001250] transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Baixar CSV
                                    </button>
                                </div>

                                {/* Passo 2 */}
                                <div className="flex flex-col gap-4 p-5 rounded-xl border-2 border-slate-200 bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${pdfFiles.length > 0 ? 'bg-[#001A72] text-white' : 'bg-slate-300 text-white'}`}>2</div>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">Anexar PDF de Resposta</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Após receber o PDF, anexe e processe</p>
                                        </div>
                                    </div>
                                    <div
                                        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${pdfFiles.length > 0 ? 'border-[#001A72] bg-blue-50' : 'border-slate-200 hover:border-[#001A72] hover:bg-slate-100'}`}
                                        onClick={() => fileRef.current?.click()}
                                    >
                                        <Upload className={`w-5 h-5 mx-auto mb-1.5 ${pdfFiles.length > 0 ? 'text-[#001A72]' : 'text-slate-300'}`} />
                                        {pdfFiles.length > 0 ? (
                                            <div className="space-y-0.5">
                                                {pdfFiles.map((f, i) => (
                                                    <p key={i} className="text-xs font-medium text-[#001A72] truncate">{f.name}</p>
                                                ))}
                                                <p className="text-[11px] text-slate-400 mt-1">{pdfFiles.length} arquivo(s)</p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400">Clique para selecionar PDFs</p>
                                        )}
                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept=".pdf"
                                            multiple
                                            className="hidden"
                                            onChange={e => { setPdfFiles(Array.from(e.target.files || [])); setPdfError(''); }}
                                        />
                                    </div>
                                    {pdfError && <p className="text-xs text-red-600">{pdfError}</p>}
                                    <button
                                        onClick={handleProcessBionexo}
                                        disabled={processingPdf || pdfFiles.length === 0}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {processingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        {processingPdf ? 'Processando...' : 'Processar PDF'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {status === 'Realizado' && (
                        <div className="px-6 py-4 text-sm text-slate-600">
                            PDF processado com sucesso. Aguardando confirmação de recebimento pelo solicitante.
                        </div>
                    )}

                    {/* Status change controls */}
                    <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap gap-2 items-center">
                        <span className="text-xs text-slate-400">Alterar status manualmente:</span>
                        {STEPS.filter(s => s !== status).map(s => (
                            <button
                                key={s}
                                onClick={() => handleChangeStatus(s)}
                                className="text-xs px-3 py-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Marcar como {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Items Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Itens do Pedido</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{items.length} item(s)</p>
                    </div>
                </div>

                {/* Comparison summary — shown after PDF is processed */}
                {status !== 'Pendente' && items.length > 0 && (() => {
                    const atendidos  = items.filter(i => getSituacao(i.quantidade_atendida, i.quantidade) === 'atendido').length;
                    const parciais   = items.filter(i => getSituacao(i.quantidade_atendida, i.quantidade) === 'parcial').length;
                    const naoAtend   = items.filter(i => getSituacao(i.quantidade_atendida, i.quantidade) === 'nao_atendido').length;
                    const totalPed   = items.reduce((s, i) => s + i.quantidade, 0);
                    const totalAtend = items.reduce((s, i) => s + i.quantidade_atendida, 0);
                    const diff       = totalAtend - totalPed;
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
                                <span>Qtd atendida: <strong className="text-slate-700">{totalAtend}</strong></span>
                                <span>Diferença total:
                                    <strong className={diff < 0 ? 'text-red-600 ml-1' : diff > 0 ? 'text-green-700 ml-1' : 'text-slate-500 ml-1'}>
                                        {diff > 0 ? `+${diff}` : diff}
                                    </strong>
                                </span>
                            </div>
                            {(parciais > 0 || naoAtend > 0) && canSolicitante && status === 'Realizado' && (
                                <p className="text-xs text-[#001A72] font-medium bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                    Verifique os itens marcados em amarelo e vermelho abaixo, preencha as quantidades recebidas e confirme o recebimento.
                                </p>
                            )}
                        </div>
                    );
                })()}

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-8">#</th>
                                {status !== 'Pendente' && (
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Situação</th>
                                )}
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Produto</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Qtd Pedida</th>
                                {status !== 'Pendente' && (<>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Qtd Atendida</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Diferença</th>
                                </>)}
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Qtd Recebida</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Observação</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={status !== 'Pendente' ? 10 : 7} className="px-6 py-10 text-center text-slate-500">
                                        Nenhum item encontrado para este pedido.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, idx) => {
                                    const diff = item.quantidade_atendida - item.quantidade;
                                    const situacao = getSituacao(item.quantidade_atendida, item.quantidade);
                                    const editData = localEdits[item.id] ?? { quantidade_recebida: item.quantidade_recebida, observacao: item.observacao };
                                    const canEdit = canSolicitante && status === 'Realizado';
                                    return (
                                        <tr key={item.id} className={`transition-colors hover:brightness-95 ${getRowHighlight(item, status)}`}>
                                            <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">{idx + 1}</td>
                                            {status !== 'Pendente' && (
                                                <td className="px-4 py-3.5">
                                                    {situacao === 'atendido' && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-green-100 text-green-700">
                                                            <CheckCircle2 className="w-3 h-3" /> Atendido
                                                        </span>
                                                    )}
                                                    {situacao === 'parcial' && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-yellow-100 text-yellow-700">
                                                            <span className="w-3 h-3 text-center leading-none">~</span> Parcial
                                                        </span>
                                                    )}
                                                    {situacao === 'nao_atendido' && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-red-100 text-red-700">
                                                            <span className="w-3 h-3 text-center leading-none font-bold">✕</span> Não atendido
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-4 py-3.5 text-slate-800 font-medium max-w-xs truncate">{item.itens.nome}</td>
                                            <td className="px-4 py-3.5 text-slate-500 font-mono">{item.itens.codigo}</td>
                                            <td className="px-4 py-3.5 text-slate-500">{item.itens.tipo || '—'}</td>
                                            <td className="px-4 py-3.5 text-right text-slate-900 font-semibold">{item.quantidade}</td>
                                            {status !== 'Pendente' && (<>
                                                <td className="px-4 py-3.5 text-right font-semibold">
                                                    <span className={
                                                        situacao === 'atendido' ? 'text-green-700' :
                                                        situacao === 'parcial'  ? 'text-yellow-700' :
                                                        'text-red-600'
                                                    }>{item.quantidade_atendida}</span>
                                                </td>
                                                <td className={`px-4 py-3.5 text-right font-semibold ${getDiffColor(diff)}`}>
                                                    {diff > 0 ? `+${diff}` : diff === 0 ? '—' : diff}
                                                </td>
                                            </>)}
                                            <td className="px-4 py-3.5 text-right">
                                                {canEdit ? (
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={editData.quantidade_recebida}
                                                        onChange={e => setLocalEdits(prev => ({
                                                            ...prev,
                                                            [item.id]: { ...prev[item.id], quantidade_recebida: parseInt(e.target.value) || 0 }
                                                        }))}
                                                        className="w-20 text-right border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72]"
                                                    />
                                                ) : (
                                                    <span className="text-slate-600">{item.quantidade_recebida}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {canEdit ? (
                                                    <input
                                                        type="text"
                                                        value={editData.observacao}
                                                        onChange={e => setLocalEdits(prev => ({
                                                            ...prev,
                                                            [item.id]: { ...prev[item.id], observacao: e.target.value }
                                                        }))}
                                                        placeholder="Observação..."
                                                        className="w-full min-w-[160px] border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72]"
                                                    />
                                                ) : (
                                                    <span className="text-slate-500 text-xs">{item.observacao || '—'}</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Save Recebimento Button (solicitante, status===Realizado) */}
            {canSolicitante && status === 'Realizado' && (
                <div className="flex justify-end">
                    <button
                        onClick={handleSaveRecebimento}
                        disabled={saving}
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
