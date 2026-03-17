'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Usuario } from '@/lib/auth';
import { ArrowRightLeft, RefreshCw, Package, ChevronRight } from 'lucide-react';

interface TransferenciasClientProps {
    currentUser: Usuario;
}

interface TransferenciaItem {
    id: string;
    quantidade: number;
    item_id: string;
    created_at: string;
    item_nome: string;
    item_codigo: string;
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

    useEffect(() => {
        loadTransferencias();
    }, []);

    async function loadTransferencias() {
        setLoading(true);

        const unidadeId = currentUser.unidade_id;
        const role = currentUser.role;
        const showAll = role === 'admin' || role === 'comprador';

        // Fetch all remanejamentos
        const { data: rems } = await supabase
            .from('remanejamentos')
            .select('*')
            .order('created_at', { ascending: false });

        if (!rems || rems.length === 0) {
            setTransferencias([]);
            setLoading(false);
            return;
        }

        // Enrich each remanejamento
        const enriched: TransferenciaItem[] = [];
        for (const r of rems) {
            // Item info
            const { data: item } = await supabase
                .from('itens').select('nome, codigo').eq('id', r.item_id).single();

            // Origin pedido via pedidos_itens
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

            // Destination pedido
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

            // Filter: solicitante sees only their unit (origin or destination)
            if (!showAll && unidadeId) {
                if (origemUnidadeId !== unidadeId && destinoUnidadeId !== unidadeId) continue;
            }

            enriched.push({
                id: r.id,
                quantidade: r.quantidade,
                item_id: r.item_id,
                created_at: r.created_at,
                item_nome: item?.nome || '—',
                item_codigo: item?.codigo || '—',
                origem_unidade_nome: origemUnidade,
                origem_pedido_numero: origemPedNum,
                origem_pedido_id: origemPedId,
                destino_unidade_nome: destinoUnidade,
                destino_pedido_numero: destinoPedNum,
                destino_pedido_id: destinoPedId,
            });
        }

        setTransferencias(enriched);
        setLoading(false);
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
            <div>
                <div className="flex items-center text-xs text-slate-500 gap-2 mb-4">
                    <Link href="/" className="hover:text-[#001A72] transition-colors">Dashboard</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-800 font-medium">Transferências</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <ArrowRightLeft className="w-5 h-5 text-purple-700" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Transferências</h1>
                        <p className="text-sm text-slate-500">Itens remanejados entre pedidos de diferentes unidades</p>
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
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">De (Origem)</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Para (Destino)</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Data</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {transferencias.map(t => (
                                    <tr key={t.id} className="hover:bg-purple-50/40 transition-colors">
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
                                                <span className="text-xs font-semibold text-slate-700">{t.origem_unidade_nome}</span>
                                                <Link href={`/dashboard/pedidos/${t.origem_pedido_id}`}
                                                    className="text-[#001A72] hover:underline text-[11px]">
                                                    Pedido #{t.origem_pedido_numero}
                                                </Link>
                                            </div>
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
                                        <td className="px-4 py-3.5 text-xs text-slate-500">
                                            {new Date(t.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                                        </td>
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
