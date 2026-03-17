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
    unidade_destino_id: string;
    created_at: string;
    item_nome: string;
    item_codigo: string;
    origem_unidade_nome: string;
    origem_pedido_numero: string;
    origem_pedido_id: string;
}

export default function TransferenciasClient({ currentUser }: TransferenciasClientProps) {
    const [transferencias, setTransferencias] = useState<TransferenciaItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTransferencias();
    }, []);

    async function loadTransferencias() {
        setLoading(true);

        // Get user's unidade_id
        const unidadeId = currentUser.unidade_id;
        if (!unidadeId) {
            // Admin/comprador without unit — show all
            const { data } = await supabase
                .from('remanejamentos')
                .select(`
                    id, quantidade, item_id, unidade_destino_id, created_at,
                    itens(nome, codigo),
                    unidades!remanejamentos_unidade_destino_id_fkey(nome),
                    pedidos_itens!remanejamentos_pedido_item_origem_id_fkey(
                        pedido_id,
                        pedidos(id, numero_pedido, unidades(nome))
                    )
                `)
                .order('created_at', { ascending: false });

            setTransferencias(mapData(data));
            setLoading(false);
            return;
        }

        // Solicitante: only show transfers TO their unit
        const { data } = await supabase
            .from('remanejamentos')
            .select(`
                id, quantidade, item_id, unidade_destino_id, created_at,
                itens(nome, codigo),
                unidades!remanejamentos_unidade_destino_id_fkey(nome),
                pedidos_itens!remanejamentos_pedido_item_origem_id_fkey(
                    pedido_id,
                    pedidos(id, numero_pedido, unidades(nome))
                )
            `)
            .eq('unidade_destino_id', unidadeId)
            .order('created_at', { ascending: false });

        setTransferencias(mapData(data));
        setLoading(false);
    }

    function mapData(data: any[] | null): TransferenciaItem[] {
        if (!data) return [];
        return data.map((r: any) => ({
            id: r.id,
            quantidade: r.quantidade,
            item_id: r.item_id,
            unidade_destino_id: r.unidade_destino_id,
            created_at: r.created_at,
            item_nome: r.itens?.nome || '—',
            item_codigo: r.itens?.codigo || '—',
            origem_unidade_nome: r.pedidos_itens?.pedidos?.unidades?.nome || '—',
            origem_pedido_numero: r.pedidos_itens?.pedidos?.numero_pedido || '—',
            origem_pedido_id: r.pedidos_itens?.pedidos?.id || '',
        }));
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
            {/* Header */}
            <div>
                <div className="flex items-center text-xs text-slate-500 gap-2 mb-4">
                    <Link href="/" className="hover:text-[#001A72] transition-colors">Dashboard</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-800 font-medium">Transferências</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <ArrowRightLeft className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Transferências</h1>
                        <p className="text-sm text-slate-500">
                            {currentUser.unidade_id
                                ? 'Itens que serão recebidos de outras unidades'
                                : 'Todos os remanejamentos entre unidades'
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            {transferencias.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Nenhuma transferência pendente</p>
                    <p className="text-xs text-slate-400 mt-1">Quando itens forem remanejados para sua unidade, aparecerão aqui.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Item</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Código</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Quantidade</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Origem</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Pedido</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Data</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {transferencias.map(t => (
                                    <tr key={t.id} className="hover:bg-amber-50/50 transition-colors">
                                        <td className="px-4 py-3.5 text-slate-800 font-medium max-w-[250px] truncate">
                                            {t.item_nome}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-500 font-mono text-xs">
                                            {t.item_codigo}
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-sm font-bold rounded-lg bg-amber-100 text-amber-800">
                                                {t.quantidade} un.
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-purple-100 text-purple-700">
                                                {t.origem_unidade_nome}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {t.origem_pedido_id ? (
                                                <Link
                                                    href={`/dashboard/pedidos/${t.origem_pedido_id}`}
                                                    className="text-[#001A72] hover:underline font-medium text-xs"
                                                >
                                                    #{t.origem_pedido_numero}
                                                </Link>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
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
