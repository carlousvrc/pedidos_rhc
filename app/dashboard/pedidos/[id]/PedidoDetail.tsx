'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { mockPedidos, mockPedidosItens, mockItens } from '@/lib/mockData';
import type { Usuario } from '@/lib/auth';
import {
    ChevronRight, Download, Save, Upload, RefreshCw,
    CheckCircle2, Pencil, FileText, X, ArrowRightLeft, Clock,
} from 'lucide-react';
import ConfirmModal from '@/app/components/ConfirmModal';
import 'tom-select/dist/css/tom-select.css';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PedidoDetailProps {
    id: string;
    currentUser: Usuario | null;
}

interface PedidoItem {
    id: string;
    item_id: string;
    quantidade: number;
    quantidade_atendida: number;
    quantidade_recebida: number;
    observacao: string;
    fornecedor?: string;
    itens: { codigo: string; referencia: string; nome: string; tipo?: string };
}

interface Pedido {
    id: string;
    numero_pedido: string;
    status: string;
    created_at: string;
    unidade_id: string;
    usuario_id?: string;
    fornecedor?: string;
    unidades?: { nome: string };
    usuarios?: { nome: string };
}

type ItemReception = 'recebido' | 'parcial' | 'nao_recebido';

interface Remanejamento {
    id: string;
    pedido_item_origem_id: string;
    pedido_destino_id: string;
    item_id: string;
    quantidade: number;
    // Joined data for destination order
    destino_pedido_numero?: string;
    destino_unidade_nome?: string;
    // Joined data for origin order
    origem_pedido_numero?: string;
    origem_unidade_nome?: string;
}

interface PedidoOption {
    id: string;
    numero_pedido: string;
    unidade_nome: string;
}

const STEPS = ['Aguardando Aprovação', 'Pendente', 'Em Cotação', 'Realizado', 'Recebido'];

const REQUIRED_APPROVALS = 1;

// ── Small Components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const cls =
        status === 'Aguardando Aprovação' ? 'bg-yellow-100 text-yellow-800' :
        status === 'Pendente'    ? 'bg-orange-100 text-orange-800' :
        status === 'Em Cotação'  ? 'bg-amber-100 text-amber-800' :
        status === 'Realizado'   ? 'bg-blue-100 text-[#001A72]' :
        status === 'Recebido'    ? 'bg-green-100 text-green-800' :
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
                    ? step === 'Aguardando Aprovação' ? 'bg-yellow-500 text-white border-yellow-500'
                    : step === 'Pendente'    ? 'bg-orange-500 text-white border-orange-500'
                    : step === 'Em Cotação'  ? 'bg-amber-500 text-white border-amber-500'
                    : step === 'Realizado'   ? 'bg-[#001A72] text-white border-[#001A72]'
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
    const [previewBionexo, setPreviewBionexo] = useState<Array<{ codigo: string; quantidade: number; fornecedor: string }> | null>(null);
    const [previewFornecedor, setPreviewFornecedor] = useState('');

    // Solicitante item-level reception
    const [itemConfirmed, setItemConfirmed] = useState<Record<string, boolean>>({});
    const [filterFornecedor, setFilterFornecedor] = useState('');
    const [itemQtyEdit,   setItemQtyEdit]   = useState<Record<string, number>>({});

    // Remanejamentos
    const [remanejamentosOut, setRemanejamentosOut] = useState<Remanejamento[]>([]); // from this order
    const [remanejamentosIn,  setRemanejamentosIn]  = useState<Remanejamento[]>([]); // into this order
    const [remanejModalItem,  setRemanejModalItem]  = useState<PedidoItem | null>(null);
    const [remanejQty,        setRemanejQty]        = useState('');
    const [remanejSelected,   setRemanejSelected]   = useState<PedidoOption | null>(null);
    const [remanejSaving,     setRemanejSaving]     = useState(false);
    const [remanejPedidos,    setRemanejPedidos]    = useState<PedidoOption[]>([]);
    const remanejSelectElRef  = useRef<HTMLSelectElement>(null);
    const remanejTomRef       = useRef<any>(null);

    // Confirmação de ação (modal genérico)
    const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; action: () => void; variant?: 'danger' | 'warning' | 'primary' } | null>(null);

    // Aprovações
    const [aprovacoes, setAprovacoes] = useState<Array<{ id: string; usuario_id: string; usuario_nome?: string; created_at: string }>>([]);

    // Alterações (change log)
    const [alteracoes, setAlteracoes] = useState<Array<{
        id: string; tipo: string; item_nome: string; item_codigo: string;
        valor_anterior: string | null; valor_novo: string | null;
        usuario_nome: string; created_at: string;
    }>>([]);

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
                .select('id, item_id, quantidade, quantidade_atendida, quantidade_recebida, observacao, fornecedor, itens(codigo, referencia, nome, tipo)')
                .eq('pedido_id', id);
            setItems((supabaseItems as unknown as PedidoItem[]) || []);

            // Load remanejamentos OUT (from this order's items → other orders)
            const itemIds = (supabaseItems as any[])?.map((i: any) => i.id) || [];
            if (itemIds.length > 0) {
                const { data: remOut } = await supabase
                    .from('remanejamentos')
                    .select('*')
                    .in('pedido_item_origem_id', itemIds);
                const outEnriched: Remanejamento[] = [];
                for (const r of (remOut || [])) {
                    const { data: destPed } = await supabase.from('pedidos').select('numero_pedido, unidade_id').eq('id', r.pedido_destino_id).single();
                    let destUnidade = '—';
                    if (destPed?.unidade_id) {
                        const { data: u } = await supabase.from('unidades').select('nome').eq('id', destPed.unidade_id).single();
                        if (u) destUnidade = u.nome;
                    }
                    outEnriched.push({ ...r, destino_pedido_numero: destPed?.numero_pedido, destino_unidade_nome: destUnidade });
                }
                setRemanejamentosOut(outEnriched);
            } else {
                setRemanejamentosOut([]);
            }

            // Load remanejamentos IN (from other orders → this order)
            const { data: remIn } = await supabase
                .from('remanejamentos')
                .select('*')
                .eq('pedido_destino_id', id);
            const inEnriched: Remanejamento[] = [];
            for (const r of (remIn || [])) {
                const { data: pi } = await supabase.from('pedidos_itens').select('pedido_id').eq('id', r.pedido_item_origem_id).single();
                let origemNum = '—';
                let origemUnidade = '—';
                if (pi) {
                    const { data: ped } = await supabase.from('pedidos').select('numero_pedido, unidade_id').eq('id', pi.pedido_id).single();
                    if (ped) {
                        origemNum = ped.numero_pedido;
                        const { data: u } = await supabase.from('unidades').select('nome').eq('id', ped.unidade_id).single();
                        if (u) origemUnidade = u.nome;
                    }
                }
                inEnriched.push({ ...r, origem_pedido_numero: origemNum, origem_unidade_nome: origemUnidade });
            }
            setRemanejamentosIn(inEnriched);

            // Load aprovacoes
            const { data: aprs } = await supabase
                .from('aprovacoes')
                .select('id, usuario_id, created_at')
                .eq('pedido_id', id)
                .order('created_at', { ascending: true });
            const aprsEnriched = [];
            for (const a of (aprs || [])) {
                const { data: usr } = await supabase.from('usuarios').select('nome').eq('id', a.usuario_id).single();
                aprsEnriched.push({ ...a, usuario_nome: usr?.nome || '—' });
            }
            setAprovacoes(aprsEnriched);

            // Load alteracoes (change log)
            const { data: alts } = await supabase
                .from('pedido_alteracoes')
                .select('id, tipo, item_nome, item_codigo, valor_anterior, valor_novo, usuario_nome, created_at')
                .eq('pedido_id', id)
                .order('created_at', { ascending: false });
            setAlteracoes(alts || []);

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
                    id: pi.id, item_id: pi.item_id, quantidade: pi.quantidade,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    // ── PDF auto-processing ───────────────────────────────────────────────────

    async function processPdfFiles(files: File[]) {
        if (files.length === 0) return;
        setProcessingPdf(true);
        setPdfError('');
        setPreviewBionexo(null);
        setPreviewFornecedor('');
        try {
            const mergedMap: Record<string, { quantidade: number; fornecedor: string }> = {};
            const fornecedores: Set<string> = new Set();
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                const res  = await fetch('/api/bionexo/convert', { method: 'POST', body: formData });
                const json = await res.json();
                if (!res.ok) throw new Error(`${file.name}: ${json.error || 'Erro ao processar PDF.'}`);
                for (const it of (json.itens as Array<{ codigo: string; quantidade: number; fornecedor: string }>) ?? []) {
                    if (mergedMap[it.codigo]) {
                        mergedMap[it.codigo].quantidade += it.quantidade;
                        if (it.fornecedor && !mergedMap[it.codigo].fornecedor) {
                            mergedMap[it.codigo].fornecedor = it.fornecedor;
                        } else if (it.fornecedor && mergedMap[it.codigo].fornecedor && !mergedMap[it.codigo].fornecedor.includes(it.fornecedor)) {
                            mergedMap[it.codigo].fornecedor += `, ${it.fornecedor}`;
                        }
                    } else {
                        mergedMap[it.codigo] = { quantidade: it.quantidade, fornecedor: it.fornecedor || '' };
                    }
                }
                if (json.fornecedor) fornecedores.add(json.fornecedor);
            }
            setPreviewBionexo(Object.entries(mergedMap).map(([codigo, v]) => ({ codigo, quantidade: v.quantidade, fornecedor: v.fornecedor })));
            setPreviewFornecedor(Array.from(fornecedores).join(', '));
        } catch (err: any) {
            setPdfError(err.message || 'Erro ao processar PDF.');
        } finally {
            setProcessingPdf(false);
        }
    }

    function handleFilesChange(newFiles: File[]) {
        const updated = [...pdfFiles, ...newFiles];
        setPdfFiles(updated);
        setPdfError('');
        setPreviewBionexo(null);
        setPreviewFornecedor('');
        processPdfFiles(updated);
    }

    function handleRemovePdf(index: number) {
        const updated = pdfFiles.filter((_, i) => i !== index);
        setPdfFiles(updated);
        setPdfError('');
        setPreviewBionexo(null);
        setPreviewFornecedor('');
        if (updated.length > 0) {
            processPdfFiles(updated);
        }
    }

    // ── Preview comparison (before confirming) ────────────────────────────────

    const previewMap = useMemo<Record<string, { quantidade: number; fornecedor: string }>>(() => {
        if (!previewBionexo) return {};
        const m: Record<string, { quantidade: number; fornecedor: string }> = {};
        for (const it of previewBionexo) {
            if (m[it.codigo]) {
                m[it.codigo].quantidade += it.quantidade;
            } else {
                m[it.codigo] = { quantidade: it.quantidade, fornecedor: it.fornecedor || '' };
            }
        }
        return m;
    }, [previewBionexo]);

    const previewComparison = useMemo(() => {
        if (!previewBionexo || items.length === 0) return null;
        return items.map(item => ({
            ...item,
            preview_atendida: previewMap[item.itens.codigo]?.quantidade ?? 0,
            preview_fornecedor: previewMap[item.itens.codigo]?.fornecedor ?? '',
        }));
    }, [previewBionexo, previewMap, items]);

    // ── Confirmar Pedido (comprador saves atendidas + changes status) ─────────

    async function handleConfirmarPedido() {
        if (!previewBionexo) return;
        setProcessingPdf(true);
        try {
            for (const item of items) {
                const entry = previewMap[item.itens.codigo];
                const quantidade_atendida = entry?.quantidade ?? 0;
                const fornecedor = entry?.fornecedor || null;
                await supabase.from('pedidos_itens').update({ quantidade_atendida, fornecedor }).eq('id', item.id);
            }
            const updateData: any = { status: 'Realizado' };
            if (previewFornecedor) updateData.fornecedor = previewFornecedor;
            await supabase.from('pedidos').update(updateData).eq('id', id);

            // Propagar quantidade_atendida para itens transferidos (remanejamentos)
            // Quando este pedido é realizado, os itens que serão transferidos
            // para outros pedidos devem ter o quantidade_atendida atualizado no destino
            for (const rem of remanejamentosOut) {
                // Encontrar o item de destino no pedido destino pelo item_id
                const { data: destItem } = await supabase
                    .from('pedidos_itens')
                    .select('id, quantidade_atendida')
                    .eq('pedido_id', rem.pedido_destino_id)
                    .eq('item_id', rem.item_id)
                    .maybeSingle();

                if (destItem) {
                    // Buscar fornecedor do item origem
                    const origemItem = items.find(i => i.id === rem.pedido_item_origem_id);
                    const origemEntry = origemItem ? previewMap[origemItem.itens.codigo] : null;
                    const destFornecedor = origemEntry?.fornecedor || null;

                    await supabase.from('pedidos_itens')
                        .update({
                            quantidade_atendida: rem.quantidade,
                            ...(destFornecedor ? { fornecedor: destFornecedor } : {}),
                        })
                        .eq('id', destItem.id);
                }
            }

            await loadData();
            setPdfFiles([]);
            setPreviewBionexo(null);
            setPreviewFornecedor('');
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
                const qty = itemConfirmed[item.id] ? (itemQtyEdit[item.id] ?? 0) : 0;
                await supabase.from('pedidos_itens')
                    .update({ quantidade_recebida: qty })
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
        const statusOrder = ['Aguardando Aprovação', 'Pendente', 'Em Cotação', 'Realizado', 'Recebido'];
        const currentIdx = statusOrder.indexOf(pedido?.status || '');
        const newIdx = statusOrder.indexOf(newStatus);

        // When going backward to Aguardando Aprovação, clear aprovacoes
        if (newStatus === 'Aguardando Aprovação') {
            await supabase.from('aprovacoes').delete().eq('pedido_id', id);
        }

        // When going backward from Realizado/Recebido to an earlier status,
        // reset quantities so the order can be properly re-processed
        if (currentIdx >= 3 && newIdx < 3) {
            // Reset quantidade_atendida and quantidade_recebida on all items
            const itemIds = items.map(i => i.id);
            for (const itemId of itemIds) {
                await supabase.from('pedidos_itens')
                    .update({ quantidade_atendida: 0, quantidade_recebida: 0 })
                    .eq('id', itemId);
            }
            // Reset quantidade_recebida on all related remanejamentos
            if (itemIds.length > 0) {
                await supabase.from('remanejamentos')
                    .update({ quantidade_recebida: 0 })
                    .in('pedido_item_origem_id', itemIds);
            }
        } else if (currentIdx >= 4 && newIdx === 3) {
            // Going back from Recebido to Realizado — reset only quantidade_recebida
            const itemIds = items.map(i => i.id);
            for (const itemId of itemIds) {
                await supabase.from('pedidos_itens')
                    .update({ quantidade_recebida: 0 })
                    .eq('id', itemId);
            }
            if (itemIds.length > 0) {
                await supabase.from('remanejamentos')
                    .update({ quantidade_recebida: 0 })
                    .in('pedido_item_origem_id', itemIds);
            }
        }

        await supabase.from('pedidos').update({ status: newStatus }).eq('id', id);
        await loadData();
    }

    // ── Aprovação ────────────────────────────────────────────────────────────

    async function handleAprovar() {
        if (!currentUser) return;
        try {
            await supabase.from('aprovacoes').insert({
                pedido_id: id,
                usuario_id: currentUser.id,
            });
            // Check if we now have enough approvals
            const { data: allAprs } = await supabase
                .from('aprovacoes')
                .select('id')
                .eq('pedido_id', id);
            if ((allAprs?.length || 0) >= REQUIRED_APPROVALS) {
                await supabase.from('pedidos').update({ status: 'Pendente' }).eq('id', id);
            }
            await loadData();
        } catch (err) {
            console.error('Erro ao aprovar pedido:', err);
        }
    }

    // ── Remanejamento ──────────────────────────────────────────────────────────

    async function openRemanejModal(item: PedidoItem) {
        setRemanejModalItem(item);
        setRemanejQty(String(item.quantidade));
        setRemanejSelected(null);

        // Load pedidos from other units
        const { data } = await supabase
            .from('pedidos')
            .select('id, numero_pedido, unidade_id')
            .neq('id', id)
            .order('created_at', { ascending: false });
        const options: PedidoOption[] = [];
        for (const p of (data || [])) {
            const { data: u } = await supabase.from('unidades').select('nome').eq('id', p.unidade_id).single();
            options.push({ id: p.id, numero_pedido: p.numero_pedido, unidade_nome: u?.nome || 'N/I' });
        }
        setRemanejPedidos(options);
    }

    function closeRemanejModal() {
        if (remanejTomRef.current) {
            remanejTomRef.current.destroy();
            remanejTomRef.current = null;
        }
        setRemanejModalItem(null);
    }

    // Init TomSelect when modal pedidos are loaded
    useEffect(() => {
        if (!remanejModalItem || remanejPedidos.length === 0 || !remanejSelectElRef.current) return;
        import('tom-select').then(({ default: TomSelect }) => {
            if (remanejTomRef.current) {
                remanejTomRef.current.destroy();
                remanejTomRef.current = null;
            }
            const options = remanejPedidos.map(p => ({
                value: p.id,
                text: `#${p.numero_pedido} — ${p.unidade_nome}`,
                numero: p.numero_pedido,
                unidade: p.unidade_nome,
            }));
            remanejTomRef.current = new TomSelect(remanejSelectElRef.current!, {
                options,
                valueField: 'value',
                labelField: 'text',
                searchField: ['text', 'numero', 'unidade'],
                placeholder: 'Buscar por nº pedido ou unidade...',
                maxOptions: 50,
                maxItems: 1,
                closeAfterSelect: true,
                onItemAdd(value: string) {
                    const found = remanejPedidos.find(p => p.id === value);
                    if (found) setRemanejSelected(found);
                },
                onItemRemove() {
                    setRemanejSelected(null);
                },
                render: {
                    option(data: any) {
                        return `<div class="ts-item-option">
                            <span class="ts-item-name">#${data.numero} — ${data.unidade}</span>
                        </div>`;
                    },
                    item(data: any) {
                        return `<div>#${data.numero} — ${data.unidade}</div>`;
                    },
                },
            });
        });
        return () => {
            if (remanejTomRef.current) {
                remanejTomRef.current.destroy();
                remanejTomRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [remanejPedidos, remanejModalItem]);

    async function handleSaveRemanejamento() {
        const qty = parseInt(remanejQty) || 0;
        if (!remanejModalItem || !remanejSelected || qty <= 0) return;
        setRemanejSaving(true);
        try {
            // Create remanejamento record
            await supabase.from('remanejamentos').insert({
                pedido_item_origem_id: remanejModalItem.id,
                pedido_destino_id: remanejSelected.id,
                item_id: remanejModalItem.item_id,
                quantidade: qty,
            });

            // Add qty to destination order's item
            const { data: destItem } = await supabase
                .from('pedidos_itens')
                .select('id, quantidade')
                .eq('pedido_id', remanejSelected.id)
                .eq('item_id', remanejModalItem.item_id)
                .maybeSingle();

            if (destItem) {
                await supabase.from('pedidos_itens')
                    .update({ quantidade: destItem.quantidade + qty })
                    .eq('id', destItem.id);
            } else {
                await supabase.from('pedidos_itens').insert({
                    pedido_id: remanejSelected.id,
                    item_id: remanejModalItem.item_id,
                    quantidade: qty,
                });
            }

            closeRemanejModal();
            await loadData();
        } catch (err) {
            console.error('Erro ao remanejar:', err);
        } finally {
            setRemanejSaving(false);
        }
    }

    async function handleDeleteRemanejamento(rem: Remanejamento) {
        try {
            // Remove qty from destination order's item
            const { data: destItem } = await supabase
                .from('pedidos_itens')
                .select('id, quantidade')
                .eq('pedido_id', rem.pedido_destino_id)
                .eq('item_id', rem.item_id)
                .maybeSingle();

            if (destItem) {
                const newQty = destItem.quantidade - rem.quantidade;
                if (newQty <= 0) {
                    await supabase.from('pedidos_itens').delete().eq('id', destItem.id);
                } else {
                    await supabase.from('pedidos_itens').update({ quantidade: newQty }).eq('id', destItem.id);
                }
            }

            await supabase.from('remanejamentos').delete().eq('id', rem.id);

            // If no more outgoing remanejamentos, revert to Pendente
            const remainingItemIds = items.map(i => i.id);
            const { data: remainingRems } = await supabase
                .from('remanejamentos')
                .select('id')
                .in('pedido_item_origem_id', remainingItemIds);
            if (!remainingRems || remainingRems.length === 0) {
                if (pedido?.status === 'Em Cotação' || pedido?.status === 'Pendente') {
                    await supabase.from('pedidos').update({ status: 'Pendente' }).eq('id', id);
                }
            }

            await loadData();
        } catch (err) {
            console.error('Erro ao remover remanejamento:', err);
        }
    }

    // ── CSV export ────────────────────────────────────────────────────────────

    async function handleExportCsv() {
        if (!pedido) return;
        const csv = items.map(i => `${i.itens.codigo};${i.quantidade}`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `Pedido_${pedido.numero_pedido}.csv`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);

        // Auto-update status to "Em Cotação" if still Pendente
        if (pedido.status === 'Pendente') {
            await supabase.from('pedidos').update({ status: 'Em Cotação' }).eq('id', id);
            await loadData();
        }
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
    const canEdit       = currentUser?.permissoes?.modulos?.usuarios === true || role === 'aprovador';
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
                            {pedido.fornecedor && (
                                <div>
                                    <p className="text-slate-500 mb-0.5">Fornecedor</p>
                                    <p className="font-medium text-slate-900">{pedido.fornecedor}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <StatusStepper status={status} />
            </div>

            {/* ── Área de Aprovação ────────────────────────────────────────── */}
            {status === 'Aguardando Aprovação' && (
                <div className="bg-white rounded-xl shadow-sm border-2 border-yellow-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-yellow-100 bg-yellow-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-yellow-200 flex items-center justify-center shrink-0">
                                <Clock className="w-5 h-5 text-yellow-800" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-yellow-900">Aguardando Aprovação</h2>
                                <p className="text-xs text-yellow-700 mt-0.5">
                                    Este pedido precisa da aprovação de um responsável para seguir ao comprador.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 space-y-3">
                        {aprovacoes.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Aprovações recebidas:</p>
                                {aprovacoes.map(a => (
                                    <div key={a.id} className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        <span className="font-medium text-slate-800">{a.usuario_nome}</span>
                                        <span className="text-xs text-slate-400">
                                            em {new Date(a.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {(role === 'aprovador' || role === 'admin') && !aprovacoes.some(a => a.usuario_id === currentUser?.id) && (
                            <div className="flex items-center gap-3">
                                <Link
                                    href={`/dashboard/pedidos/${pedido.id}/editar`}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors text-sm"
                                >
                                    <Pencil className="w-4 h-4" />
                                    Editar Itens / Quantidades
                                </Link>
                                <button
                                    onClick={() => setConfirmAction({
                                        title: 'Aprovar este pedido?',
                                        description: 'Ao aprovar, o pedido será encaminhado ao comprador para cotação. Esta ação pode ser revertida alterando o status.',
                                        action: handleAprovar,
                                    })}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Aprovar Pedido
                                </button>
                            </div>
                        )}
                        {(role === 'aprovador' || role === 'admin') && aprovacoes.some(a => a.usuario_id === currentUser?.id) && (
                            <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Você já aprovou este pedido.
                            </p>
                        )}
                        {role === 'solicitante' && (
                            <p className="text-sm text-yellow-700">Aguarde a aprovação dos responsáveis para que o pedido seja encaminhado ao comprador.</p>
                        )}
                    </div>
                </div>
            )}

            {/* ── Alterações feitas no pedido ─────────────────────────────── */}
            {alteracoes.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-orange-100 bg-orange-50 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-orange-200 flex items-center justify-center shrink-0">
                            <Pencil className="w-5 h-5 text-orange-800" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-orange-900">Alterações no Pedido</h2>
                            <p className="text-xs text-orange-700 mt-0.5">Este pedido foi modificado após a criação original.</p>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {alteracoes.map(alt => (
                            <div key={alt.id} className="px-6 py-3 flex items-start gap-3">
                                <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold ${
                                    alt.tipo === 'item_removido' ? 'bg-red-500' :
                                    alt.tipo === 'item_adicionado' ? 'bg-green-500' :
                                    'bg-amber-500'
                                }`}>
                                    {alt.tipo === 'item_removido' ? '−' : alt.tipo === 'item_adicionado' ? '+' : '~'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-800">
                                        {alt.tipo === 'item_removido' && (
                                            <><span className="font-semibold text-red-700">Removido:</span> {alt.item_nome} {alt.item_codigo && <span className="text-slate-400 text-xs">(Cód: {alt.item_codigo})</span>} — era {alt.valor_anterior} un.</>
                                        )}
                                        {alt.tipo === 'item_adicionado' && (
                                            <><span className="font-semibold text-green-700">Adicionado:</span> {alt.item_nome} {alt.item_codigo && <span className="text-slate-400 text-xs">(Cód: {alt.item_codigo})</span>} — {alt.valor_novo} un.</>
                                        )}
                                        {alt.tipo === 'quantidade_alterada' && (
                                            <><span className="font-semibold text-amber-700">Quantidade alterada:</span> {alt.item_nome} {alt.item_codigo && <span className="text-slate-400 text-xs">(Cód: {alt.item_codigo})</span>} — de {alt.valor_anterior} para {alt.valor_novo} un.</>
                                        )}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        por {alt.usuario_nome} em {new Date(alt.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Área do Comprador ────────────────────────────────────────── */}
            {canComprador && status !== 'Aguardando Aprovação' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800">Área do Comprador</h2>
                        {status === 'Em Cotação' && (
                            <span className="flex items-center gap-1.5 text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full">
                                <Clock className="w-3.5 h-3.5" /> Em cotação
                            </span>
                        )}
                        {status === 'Realizado' && (
                            <span className="flex items-center gap-1.5 text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5" /> PDF confirmado
                            </span>
                        )}
                    </div>

                    {(status === 'Pendente' || status === 'Em Cotação') && (
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

                                    {/* Attached files list */}
                                    {pdfFiles.length > 0 && (
                                        <div className="space-y-2">
                                            {pdfFiles.map((f, i) => (
                                                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-[#001A72]/20 rounded-lg">
                                                    <FileText className="w-4 h-4 text-[#001A72] shrink-0" />
                                                    <span className="text-xs font-medium text-[#001A72] truncate flex-1">{f.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePdf(i)}
                                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                                                        title="Remover arquivo"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add more / first upload button */}
                                    <div
                                        className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors border-slate-200 hover:border-[#001A72] hover:bg-slate-100"
                                        onClick={() => !processingPdf && fileRef.current?.click()}
                                    >
                                        {processingPdf ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <RefreshCw className="w-5 h-5 text-[#001A72] animate-spin" />
                                                <p className="text-xs text-slate-500">Processando PDFs...</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <Upload className="w-5 h-5 mx-auto mb-1.5 text-slate-300" />
                                                <p className="text-xs text-slate-400">
                                                    {pdfFiles.length > 0 ? 'Clique para anexar mais PDFs' : 'Clique para selecionar PDFs'}
                                                </p>
                                            </div>
                                        )}
                                        <input ref={fileRef} type="file" accept=".pdf" multiple className="hidden"
                                            onChange={e => {
                                                handleFilesChange(Array.from(e.target.files || []));
                                                e.target.value = '';
                                            }} />
                                    </div>
                                    {pdfError && <p className="text-xs text-red-600">{pdfError}</p>}
                                </div>
                            </div>

                            {/* Preview da comparação */}
                            {previewComparison && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    {previewFornecedor && (
                                        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-500 uppercase">Fornecedor:</span>
                                            <span className="text-sm font-bold text-[#001A72]">{previewFornecedor}</span>
                                        </div>
                                    )}
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
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Fornecedor</th>
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
                                                            <td className="px-4 py-2 text-xs text-slate-600 max-w-[150px] truncate">{(item as any).preview_fornecedor || '—'}</td>
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
                                            onClick={() => setConfirmAction({
                                                title: 'Confirmar pedido como Realizado?',
                                                description: 'As quantidades atendidas do PDF serão salvas e o status mudará para "Realizado". O solicitante será notificado para confirmar o recebimento.',
                                                action: handleConfirmarPedido,
                                            })}
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

                </div>
            )}

            {/* ── Alerta: itens que serão recebidos por outra unidade (origem) ── */}
            {remanejamentosOut.length > 0 && canSolicitante && (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-200 flex items-center justify-center shrink-0">
                            <ArrowRightLeft className="w-5 h-5 text-purple-800" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-purple-900">Itens recebidos por outra unidade</h3>
                            <p className="text-xs text-purple-700 mt-0.5">Os itens abaixo serão recebidos por outra unidade e transferidos para você.</p>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        {remanejamentosOut.map(r => {
                            const itemMatch = items.find(i => i.item_id === r.item_id);
                            return (
                                <div key={r.id} className="flex items-center gap-3 bg-white rounded-lg border border-purple-200 px-4 py-2.5">
                                    <span className="text-sm font-bold text-purple-800 min-w-[50px]">{r.quantidade} un.</span>
                                    <span className="text-sm text-slate-700 font-medium flex-1 truncate">{itemMatch?.itens.nome || '—'}</span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-purple-100 text-purple-700 shrink-0">
                                        via {r.destino_unidade_nome} (#{r.destino_pedido_numero})
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Alerta: itens para transferir para outra unidade (destino) ── */}
            {remanejamentosIn.length > 0 && canSolicitante && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-200 flex items-center justify-center shrink-0">
                            <ArrowRightLeft className="w-5 h-5 text-amber-800" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-amber-900">Itens para transferir</h3>
                            <p className="text-xs text-amber-700 mt-0.5">Ao receber este pedido, transfira os itens abaixo para as unidades indicadas.</p>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        {remanejamentosIn.map(r => {
                            const itemMatch = items.find(i => i.item_id === r.item_id);
                            return (
                                <div key={r.id} className="flex items-center gap-3 bg-white rounded-lg border border-amber-200 px-4 py-2.5">
                                    <span className="text-sm font-bold text-amber-800 min-w-[50px]">{r.quantidade} un.</span>
                                    <span className="text-sm text-slate-700 font-medium flex-1 truncate">{itemMatch?.itens.nome || '—'}</span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-800 shrink-0">
                                        → {r.origem_unidade_nome}
                                    </span>
                                </div>
                            );
                        })}
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

                {/* Filtro por fornecedor */}
                {status !== 'Pendente' && status !== 'Aguardando Aprovação' && (() => {
                    const fornecedores = [...new Set(items.map(i => i.fornecedor).filter(Boolean))] as string[];
                    if (fornecedores.length <= 1) return null;
                    return (
                        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3">
                            <span className="text-xs font-semibold text-slate-500">Filtrar por fornecedor:</span>
                            <select
                                value={filterFornecedor}
                                onChange={e => setFilterFornecedor(e.target.value)}
                                className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A72] focus:bg-white transition-colors"
                            >
                                <option value="">Todos ({items.length})</option>
                                {fornecedores.sort().map(f => (
                                    <option key={f} value={f}>{f} ({items.filter(i => i.fornecedor === f).length})</option>
                                ))}
                            </select>
                            {filterFornecedor && (
                                <button
                                    onClick={() => setFilterFornecedor('')}
                                    className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" /> Limpar
                                </button>
                            )}
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
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Qtd Pedida</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Remanejamento</th>
                                {status !== 'Pendente' && status !== 'Aguardando Aprovação' && (
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Fornecedor</th>
                                )}
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
                            {(() => {
                                const displayItems = filterFornecedor
                                    ? items.filter(i => i.fornecedor === filterFornecedor)
                                    : items;
                                return displayItems.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="px-6 py-10 text-center text-slate-500">
                                        {filterFornecedor ? 'Nenhum item para este fornecedor.' : 'Nenhum item encontrado.'}
                                    </td>
                                </tr>
                            ) : displayItems.map((item, idx) => {
                                const situacao  = getSituacao(item.quantidade_atendida, item.quantidade);
                                const recebidaVal = itemQtyEdit[item.id] ?? item.quantidade_recebida;
                                const reception = getRecebimentoStatus(recebidaVal, item.quantidade_atendida);
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
                                        <td className="px-4 py-3.5 text-right font-semibold text-slate-900">{item.quantidade}</td>

                                        {/* Remanejamento info */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex flex-col gap-1">
                                                {/* Outgoing: item will be received via another unit's order */}
                                                {remanejamentosOut
                                                    .filter(r => r.pedido_item_origem_id === item.id)
                                                    .map(r => (
                                                        <div key={r.id} className="flex items-center gap-1.5">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-purple-100 text-purple-700">
                                                                {r.quantidade} un. via {r.destino_unidade_nome} (#{r.destino_pedido_numero})
                                                            </span>
                                                            {canComprador && (
                                                                <button
                                                                    onClick={() => handleDeleteRemanejamento(r)}
                                                                    className="text-red-400 hover:text-red-600 transition-colors"
                                                                    title="Remover remanejamento"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))
                                                }
                                                {/* Incoming: need to transfer to another unit */}
                                                {remanejamentosIn
                                                    .filter(r => r.item_id === item.item_id)
                                                    .map(r => (
                                                        <span key={r.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-800">
                                                            Transferir {r.quantidade} un. p/ {r.origem_unidade_nome}
                                                        </span>
                                                    ))
                                                }
                                                {/* Item recebido via transferência — mostra quando quantidade_atendida > 0 e pedido ainda Pendente */}
                                                {(status === 'Pendente' || status === 'Aguardando Aprovação') && item.quantidade_atendida > 0 && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-green-100 text-green-700">
                                                        <CheckCircle2 className="w-3 h-3" /> Realizado na origem ({item.quantidade_atendida} un.)
                                                    </span>
                                                )}
                                                {/* Remanejar button for comprador — hide if already remanejado */}
                                                {canComprador && (status === 'Pendente' || status === 'Em Cotação') && remanejamentosOut.filter(r => r.pedido_item_origem_id === item.id).length === 0 && (
                                                    <button
                                                        onClick={() => openRemanejModal(item)}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-purple-600 border border-purple-200 rounded-md hover:bg-purple-50 transition-colors w-fit"
                                                    >
                                                        <ArrowRightLeft className="w-3 h-3" /> Remanejar
                                                    </button>
                                                )}
                                            </div>
                                        </td>

                                        {status !== 'Pendente' && status !== 'Aguardando Aprovação' && (
                                            <td className="px-4 py-3.5 text-xs text-slate-600 max-w-[160px] truncate" title={item.fornecedor || ''}>
                                                {item.fornecedor || '—'}
                                            </td>
                                        )}

                                        {status !== 'Pendente' && (
                                            <td className={`px-4 py-3.5 text-right font-semibold ${situacao === 'atendido' ? 'text-green-700' : situacao === 'parcial' ? 'text-yellow-700' : 'text-red-600'}`}>
                                                {item.quantidade_atendida}
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
                                                <td className="px-4 py-3.5 text-center">
                                                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={confirmed}
                                                            onChange={() => setItemConfirmed(p => ({ ...p, [item.id]: !confirmed }))}
                                                            className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                                        />
                                                        <span className={`text-xs font-semibold ${confirmed ? 'text-green-700' : 'text-slate-400'}`}>
                                                            {confirmed ? 'Confirmado' : 'Confirmar'}
                                                        </span>
                                                    </label>
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
                            });
                            })()}
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
                        onClick={() => setConfirmAction({
                            title: 'Confirmar recebimento do pedido?',
                            description: 'As quantidades recebidas serão salvas e o pedido será marcado como "Recebido".',
                            action: handleSaveRecebimento,
                        })}
                        disabled={saving || !allReceptionSet}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Salvando...' : 'Confirmar Recebimento'}
                    </button>
                </div>
            )}

            {/* ── Alterar Status ──────────────────────────────────────────── */}
            {(canComprador || role === 'aprovador') && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-6 py-4 flex flex-wrap gap-2 items-center">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mr-2">Alterar status:</span>
                        {STEPS.filter(s => s !== status).map(s => {
                            const stepIdx = STEPS.indexOf(s);
                            const currentIdx = STEPS.indexOf(status);
                            const isBack = stepIdx < currentIdx;
                            return (
                                <button
                                    key={s}
                                    onClick={() => setConfirmAction({
                                        title: isBack ? `Retornar para "${s}"?` : `Avançar para "${s}"?`,
                                        description: isBack
                                            ? `O pedido será retornado ao status "${s}". Dados processados em etapas posteriores poderão ser resetados.`
                                            : `O pedido será alterado para o status "${s}".`,
                                        action: () => handleChangeStatus(s),
                                        variant: isBack ? 'danger' : 'warning',
                                    })}
                                    className={`text-xs px-3 py-1.5 border rounded-md transition-colors ${
                                        isBack
                                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {isBack ? '← ' : ''}{s}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Modal Remanejamento ──────────────────────────────────────── */}
            {remanejModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Remanejar Item</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{remanejModalItem.itens.nome}</p>
                            </div>
                            <button onClick={closeRemanejModal} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <style>{`
                            .remanej-ts .ts-control {
                                border: 1px solid #e2e8f0 !important;
                                border-radius: 0.5rem !important;
                                padding: 0.5rem 0.75rem !important;
                                background: #fff !important;
                                font-size: 0.875rem !important;
                                box-shadow: none !important;
                                min-height: 42px !important;
                            }
                            .remanej-ts .ts-control:focus-within {
                                border-color: #001A72 !important;
                                box-shadow: 0 0 0 2px rgba(0,26,114,0.15) !important;
                            }
                            .remanej-ts .ts-dropdown {
                                border: 1px solid #e2e8f0 !important;
                                border-radius: 0.5rem !important;
                                box-shadow: 0 4px 16px rgba(0,0,0,0.10) !important;
                                font-size: 0.875rem !important;
                                margin-top: 4px !important;
                            }
                            .remanej-ts .ts-dropdown .option { padding: 0 !important; }
                            .remanej-ts .ts-dropdown .option.active { background: #f1f5f9 !important; color: inherit !important; }
                            .remanej-ts .ts-item-option { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; }
                            .remanej-ts .ts-item-name { font-weight: 500; color: #1e293b; }
                            .remanej-ts .ts-item-meta { font-size: 0.75rem; color: #94a3b8; }
                            .remanej-ts .ts-control input::placeholder { color: #94a3b8; }
                        `}</style>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Quantidade a remanejar (disponível: {remanejModalItem.quantidade})
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={remanejModalItem.quantidade}
                                    value={remanejQty}
                                    onChange={e => setRemanejQty(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72]"
                                />
                            </div>

                            <div className="remanej-ts">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Pedido destino
                                </label>
                                <select ref={remanejSelectElRef}></select>
                            </div>

                            {remanejSelected && (parseInt(remanejQty) || 0) > 0 && (
                                <div className="bg-amber-50 rounded-lg px-4 py-3 text-xs text-amber-800 space-y-1 border border-amber-200">
                                    <p><strong>{parseInt(remanejQty) || 0}</strong> un. de <strong>{remanejModalItem.itens.nome}</strong></p>
                                    <p>Serão adicionadas ao pedido <strong>#{remanejSelected.numero_pedido}</strong> ({remanejSelected.unidade_nome})</p>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
                            <button onClick={closeRemanejModal}
                                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveRemanejamento}
                                disabled={remanejSaving || !remanejSelected || (parseInt(remanejQty) || 0) <= 0}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {remanejSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                                {remanejSaving ? 'Salvando...' : 'Confirmar Remanejamento'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal de Confirmação de Ação ──────────────────────────── */}
            {confirmAction && (
                <ConfirmModal
                    title={confirmAction.title}
                    description={confirmAction.description}
                    confirmLabel="Confirmar"
                    variant={confirmAction.variant ?? 'warning'}
                    onConfirm={() => {
                        confirmAction.action();
                        setConfirmAction(null);
                    }}
                    onCancel={() => setConfirmAction(null)}
                />
            )}

        </div>
    );
}
