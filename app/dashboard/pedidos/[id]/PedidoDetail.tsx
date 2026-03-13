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
    data_pedido: string;
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

    function getAtendidaColor(qtdAtendida: number, qtdPedida: number) {
        if (qtdPedida === 0) return 'text-slate-500';
        if (qtdAtendida >= qtdPedida) return 'text-green-700 font-semibold';
        if (qtdAtendida > 0) return 'text-yellow-700 font-semibold';
        return 'text-red-600 font-semibold';
    }

    function getDiffColor(diff: number) {
        if (diff > 0) return 'text-green-700';
        if (diff < 0) return 'text-red-600';
        return 'text-slate-500';
    }

    function getRowHighlight(item: PedidoItem, status: string) {
        if (status !== 'Recebido') return '';
        const recebida = localEdits[item.id]?.quantidade_recebida ?? item.quantidade_recebida;
        if (recebida >= item.quantidade) return 'bg-green-50/60';
        if (recebida > 0) return 'bg-yellow-50/60';
        return 'bg-red-50/40';
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
                                    {new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
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
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
                    <h2 className="text-lg font-bold text-slate-800">Área do Comprador</h2>

                    {status === 'Pendente' && (
                        <div className="space-y-3">
                            <p className="text-sm text-slate-600">Faça o upload do PDF do Bionexo para processar as quantidades atendidas.</p>
                            <div
                                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#001A72] transition-colors"
                                onClick={() => fileRef.current?.click()}
                            >
                                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                {pdfFiles.length > 0 ? (
                                    <div className="space-y-1">
                                        {pdfFiles.map((f, i) => (
                                            <p key={i} className="text-sm font-medium text-[#001A72]">{f.name}</p>
                                        ))}
                                        <p className="text-xs text-slate-400 mt-2">{pdfFiles.length} arquivo(s) selecionado(s)</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm text-slate-500">Clique para selecionar os PDFs do Bionexo</p>
                                        <p className="text-xs text-slate-400 mt-1">Múltiplos arquivos .pdf permitidos</p>
                                    </>
                                )}
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".pdf"
                                    multiple
                                    className="hidden"
                                    onChange={e => {
                                        setPdfFiles(Array.from(e.target.files || []));
                                        setPdfError('');
                                    }}
                                />
                            </div>
                            {pdfError && <p className="text-sm text-red-600">{pdfError}</p>}
                            <button
                                onClick={handleProcessBionexo}
                                disabled={processingPdf || pdfFiles.length === 0}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#001A72] text-white rounded-lg font-medium hover:bg-[#001250] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {processingPdf ? 'Processando...' : 'Processar Bionexo'}
                            </button>
                        </div>
                    )}

                    {status === 'Realizado' && (
                        <div className="flex items-center gap-3">
                            <p className="text-sm text-slate-600">PDF processado. Aguardando confirmação de recebimento pelo solicitante.</p>
                        </div>
                    )}

                    {/* Status change controls */}
                    <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-2">
                        <span className="text-xs text-slate-500 self-center">Alterar status:</span>
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
                <div className="px-6 py-5 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">Itens do Pedido</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-8">#</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Produto</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Qtd Pedida</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Qtd Atendida</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Diferença</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Qtd Recebida</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Observação</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-10 text-center text-slate-500">
                                        Nenhum item encontrado para este pedido.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, idx) => {
                                    const diff = item.quantidade_atendida - item.quantidade;
                                    const editData = localEdits[item.id] ?? { quantidade_recebida: item.quantidade_recebida, observacao: item.observacao };
                                    const canEdit = canSolicitante && status === 'Realizado';
                                    return (
                                        <tr key={item.id} className={`transition-colors hover:bg-slate-50/50 ${getRowHighlight(item, status)}`}>
                                            <td className="px-4 py-4 text-xs text-slate-400 font-mono">{idx + 1}</td>
                                            <td className="px-4 py-4 text-slate-800 font-medium max-w-xs truncate">{item.itens.nome}</td>
                                            <td className="px-4 py-4 text-slate-500 font-mono">{item.itens.codigo}</td>
                                            <td className="px-4 py-4 text-slate-500">{item.itens.tipo || '—'}</td>
                                            <td className="px-4 py-4 text-right text-slate-900 font-medium">{item.quantidade}</td>
                                            <td className={`px-4 py-4 text-right ${getAtendidaColor(item.quantidade_atendida, item.quantidade)}`}>
                                                {item.quantidade_atendida}
                                            </td>
                                            <td className={`px-4 py-4 text-right ${getDiffColor(diff)}`}>
                                                {diff > 0 ? `+${diff}` : diff}
                                            </td>
                                            <td className="px-4 py-4 text-right">
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
                                            <td className="px-4 py-4">
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
