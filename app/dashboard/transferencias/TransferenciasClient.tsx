'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Usuario } from '@/lib/auth';
import { ArrowRightLeft, RefreshCw, Package, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import ConfirmModal from '@/app/components/ConfirmModal';

interface TransferenciasClientProps {
    currentUser: Usuario;
}

interface TransferenciaItem {
    id: string;
    pedido_item_origem_id: string;
    quantidade: number;
    quantidade_recebida: number;
    destino_recebido: boolean;
    item_id: string;
    created_at: string;
    item_nome: string;
    item_codigo: string;
    origem_unidade_id: string;
    origem_unidade_nome: string;
    origem_pedido_numero: string;
    origem_pedido_id: string;
    destino_unidade_nome: string;
    destino_pedido_numero: string;
    destino_pedido_id: string;
}

export default function TransferenciasClient({ currentUser }: TransferenciasClientProps) {
    const [transferencias, setTransferencias] = useState<TransferenciaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [qtyEdits, setQtyEdits] = useState<Record<string, number>>({});
    const [saving, setSaving] = useState<Record<string, boolean>>({});
    const [confirmPending, setConfirmPending] = useState<TransferenciaItem | null>(null);

    const unidadeId = currentUser.unidade_id;
    const role = currentUser.role;
    const showAll = role === 'admin' || role === 'comprador';

    useEffect(() => {
        loadTransferencias();
    }, []);

    async function loadTransferencias() {
        setLoading(true);

        const { data: rems } = await supabase
            .from('remanejamentos')
            .select('*')
            .order('created_at', { ascending: false });

        if (!rems || rems.length === 0) {
            setTransferencias([]);
            setLoading(false);
            return;
        }

        const enriched: TransferenciaItem[] = [];
        for (const r of rems) {
            const { data: item } = await supabase
                .from('itens').select('nome, codigo').eq('id', r.item_id).single();

            const { data: pi } = await supabase
                .from('pedidos_itens').select('pedido_id').eq('id', r.pedido_item_origem_id).single();

            let origemUnidade = '—', origemPedNum = '—', origemPedId = '', origemUnidadeId = '';
            if (pi) {
                const { data: ped } = await supabase
                    .from('pedidos').select('id, numero_pedido, unidade_id').eq('id', pi.pedido_id).single();
                if (ped) {
                    origemPedNum = ped.numero_pedido;
                    origemPedId = ped.id;
                    origemUnidadeId = ped.unidade_id;
                    const { data: u } = await supabase.from('unidades').select('nome').eq('id', ped.unidade_id).single();
                    if (u) origemUnidade = u.nome;
                }
            }

            const { data: destPed } = await supabase
                .from('pedidos').select('id, numero_pedido, unidade_id').eq('id', r.pedido_destino_id).single();
            let destinoUnidade = '—', destinoPedNum = '—', destinoPedId = '', destinoUnidadeId = '';
            if (destPed) {
                destinoPedNum = destPed.numero_pedido;
                destinoPedId = destPed.id;
                destinoUnidadeId = destPed.unidade_id;
                const { data: u } = await supabase.from('unidades').select('nome').eq('id', destPed.unidade_id).single();
                if (u) destinoUnidade = u.nome;
            }

            const { data: destPedItem } = await supabase
                .from('pedidos_itens')
                .select('quantidade_recebida, quantidade_atendida')
                .eq('pedido_id', r.pedido_destino_id)
                .eq('item_id', r.item_id)
                .maybeSingle();
            const destinoRecebido = destPedItem
                ? destPedItem.quantidade_recebida >= destPedItem.quantidade_atendida && destPedItem.quantidade_atendida > 0
                : false;

            if (!showAll && unidadeId) {
                if (origemUnidadeId !== unidadeId && destinoUnidadeId !== unidadeId) continue;
            }

            enriched.push({
                id: r.id,
                pedido_item_origem_id: r.pedido_item_origem_id,
                quantidade: r.quantidade,
                quantidade_recebida: r.quantidade_recebida ?? 0,
                destino_recebido: destinoRecebido,
                item_id: r.item_id,
                created_at: r.created_at,
                item_nome: item?.nome || '—',
                item_codigo: item?.codigo || '—',
                origem_unidade_id: origemUnidadeId,
                origem_unidade_nome: origemUnidade,
                origem_pedido_numero: origemPedNum,
                origem_pedido_id: origemPedId,
                destino_unidade_nome: destinoUnidade,
                destino_pedido_numero: destinoPedNum,
                destino_pedido_id: destinoPedId,
            });
        }

        setTransferencias(enriched);
        // Init qty edits
        const edits: Record<string, number> = {};
        for (const t of enriched) {
            edits[t.id] = t.quantidade_recebida > 0 ? t.quantidade_recebida : t.quantidade;
        }
        setQtyEdits(edits);
        setLoading(false);
    }

    async function handleConfirmRecebimento(t: TransferenciaItem) {
        const qty = qtyEdits[t.id] ?? 0;
        setSaving(p => ({ ...p, [t.id]: true }));
        try {
            // Update remanejamento quantidade_recebida
            await supabase.from('remanejamentos')
                .update({ quantidade_recebida: qty })
                .eq('id', t.id);

            // Update origin pedido_item quantidade_recebida
            const { data: piOrigem } = await supabase
                .from('pedidos_itens')
                .select('id, quantidade_recebida')
                .eq('id', t.pedido_item_origem_id)
                .single();

            if (piOrigem) {
                await supabase.from('pedidos_itens')
                    .update({ quantidade_atendida: qty, quantidade_recebida: qty })
                    .eq('id', piOrigem.id);
            }

            // Check if all items in origin order are received → update order status
            if (piOrigem) {
                const { data: piData } = await supabase
                    .from('pedidos_itens')
                    .select('pedido_id')
                    .eq('id', t.pedido_item_origem_id)
                    .single();
                if (piData) {
                    const { data: allItems } = await supabase
                        .from('pedidos_itens')
                        .select('quantidade_recebida, quantidade_atendida, quantidade')
                        .eq('pedido_id', piData.pedido_id);
                    const allAtendido = allItems?.every(i => i.quantidade_atendida > 0);
                    const allReceived = allItems?.every(i => i.quantidade_recebida > 0);
                    if (allReceived) {
                        await supabase.from('pedidos')
                            .update({ status: 'Recebido' })
                            .eq('id', piData.pedido_id);
                    } else if (allAtendido) {
                        await supabase.from('pedidos')
                            .update({ status: 'Realizado' })
                            .eq('id', piData.pedido_id);
                    }
                }
            }

            await loadTransferencias();
        } catch (err) {
            console.error('Erro ao confirmar recebimento:', err);
        } finally {
            setSaving(p => ({ ...p, [t.id]: false }));
        }
    }

    // Check if current user can confirm receipt (they are the origin unit — items coming to them)
    function canConfirm(t: TransferenciaItem): boolean {
        if (role === 'admin') return true;
        if (role === 'comprador') return false;
        return unidadeId === t.origem_unidade_id;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <RefreshCw className="w-8 h-8 text-[#001A72] animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto p-4 sm:p-6 space-y-6">
            {confirmPending && (
                <ConfirmModal
                    title="Confirmar recebimento por transferência?"
                    description={`Você confirma o recebimento de ${qtyEdits[confirmPending.id] ?? confirmPending.quantidade} un. de "${confirmPending.item_nome}" transferido por ${confirmPending.destino_unidade_nome}?`}
                    variant="primary"
                    confirmLabel="Confirmar recebimento"
                    onConfirm={() => { handleConfirmRecebimento(confirmPending); setConfirmPending(null); }}
                    onCancel={() => setConfirmPending(null)}
                />
            )}
            <div>
                <div className="flex items-center text-xs text-slate-500 gap-2 mb-4">
                    <Link href="/" className="hover:text-[#001A72] transition-colors">Dashboard</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-800 font-medium">Transferências</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-sm">
                            <ArrowRightLeft className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Transferências</h1>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {transferencias.length > 0
                                    ? `${transferencias.length} transferência${transferencias.length !== 1 ? 's' : ''} · ${transferencias.filter(t => t.quantidade_recebida === 0).length} pendente${transferencias.filter(t => t.quantidade_recebida === 0).length !== 1 ? 's' : ''}`
                                    : 'Itens remanejados entre pedidos de diferentes unidades'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {transferencias.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Nenhuma transferência</p>
                    <p className="text-xs text-slate-400 mt-1">Quando itens forem remanejados entre pedidos, aparecerão aqui.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Item</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Código</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Qtd</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">De (Envia)</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Para (Recebe)</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Qtd Recebida</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Data</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {transferencias.map(t => {
                                    const concluido = t.quantidade_recebida > 0;
                                    const emTransito = !concluido && t.destino_recebido;
                                    const canEdit = canConfirm(t) && !concluido && t.destino_recebido;
                                    const isSaving = saving[t.id] ?? false;

                                    return (
                                        <tr key={t.id} className={`transition-colors ${concluido ? 'bg-green-50/40' : emTransito ? 'bg-blue-50/40' : 'hover:bg-purple-50/40'}`}>
                                            <td className="px-4 py-3.5 text-slate-800 font-medium max-w-[250px] truncate">
                                                {t.item_nome}
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-500 font-mono text-xs">
                                                {t.item_codigo}
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-sm font-bold rounded-lg bg-purple-100 text-purple-800">
                                                    {t.quantidade} un.
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs font-semibold text-slate-700">{t.destino_unidade_nome}</span>
                                                    <Link href={`/dashboard/pedidos/${t.destino_pedido_id}`}
                                                        className="text-[#001A72] hover:underline text-[11px]">
                                                        Pedido #{t.destino_pedido_numero}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs font-semibold text-slate-700">{t.origem_unidade_nome}</span>
                                                    <Link href={`/dashboard/pedidos/${t.origem_pedido_id}`}
                                                        className="text-[#001A72] hover:underline text-[11px]">
                                                        Pedido #{t.origem_pedido_numero}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                {canEdit ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={t.quantidade}
                                                            value={qtyEdits[t.id] ?? t.quantidade}
                                                            onChange={e => setQtyEdits(p => ({ ...p, [t.id]: parseInt(e.target.value) || 0 }))}
                                                            className="w-20 border border-slate-200 rounded px-2 py-1 text-xs text-right font-semibold focus:outline-none focus:ring-2 focus:ring-[#001A72]"
                                                        />
                                                        <button
                                                            onClick={() => setConfirmPending(t)}
                                                            disabled={isSaving}
                                                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                                                        >
                                                            {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                                            Confirmar
                                                        </button>
                                                    </div>
                                                ) : concluido ? (
                                                    <span className="font-semibold text-green-700">{t.quantidade_recebida}</span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {concluido ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-green-100 text-green-700">
                                                        <CheckCircle2 className="w-3 h-3" /> Concluído
                                                    </span>
                                                ) : emTransito ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 text-blue-700">
                                                        <Clock className="w-3 h-3" /> Aguardando transferência
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-orange-100 text-orange-700">
                                                        <Clock className="w-3 h-3" /> Pendente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-xs text-slate-500">
                                                {new Date(t.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
