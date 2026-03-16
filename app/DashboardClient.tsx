'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FileText, Clock, CheckCircle, Plus, RefreshCw, ShoppingCart } from 'lucide-react';
import type { Usuario } from '@/lib/auth';

interface DashboardClientProps {
    currentUser: Usuario | null;
    initialPedidos: any[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hasRealId = (id?: string | null) => !!id && UUID_RE.test(id);

function getStatusBadge(status: string) {
    switch (status?.toLowerCase()) {
        case 'pendente': return 'bg-orange-100 text-orange-800';
        case 'realizado': return 'bg-blue-100 text-[#001A72]';
        case 'recebido': return 'bg-green-100 text-green-800';
        default: return 'bg-slate-100 text-slate-700';
    }
}


export default function DashboardClient({ currentUser, initialPedidos }: DashboardClientProps) {
    const [pedidos, setPedidos] = useState<any[]>(initialPedidos);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const channel = supabase
            .channel('dashboard-pedidos')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
                setUpdating(true);
                supabase
                    .from('pedidos')
                    .select('id, numero_pedido, status, data_pedido, unidades(nome), usuario_id')
                    .order('data_pedido', { ascending: false })
                    .limit(50)
                    .then(({ data }) => {
                        if (data && data.length > 0) {
                            const scope = currentUser?.permissoes?.scope ?? 'operador';
                            const filtered =
                                scope === 'operador' && hasRealId(currentUser?.id)
                                    ? data.filter((p: any) => p.usuario_id === currentUser!.id)
                                    : data;
                            setPedidos(filtered);
                        }
                        setTimeout(() => setUpdating(false), 800);
                    });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

    const scope = currentUser?.permissoes?.scope ?? 'operador';
    const visiblePedidos =
        scope === 'operador' && hasRealId(currentUser?.id)
            ? pedidos.filter((p: any) => p.usuario_id === currentUser!.id)
            : pedidos;

    const totalPedidos = visiblePedidos.length;
    const pendentes = visiblePedidos.filter((p: any) => p.status?.toLowerCase() === 'pendente').length;
    const realizados = visiblePedidos.filter((p: any) => p.status?.toLowerCase() === 'realizado').length;
    const recebidos = visiblePedidos.filter((p: any) => p.status?.toLowerCase() === 'recebido').length;

    const canCreateOrder = !currentUser || currentUser?.permissoes?.modulos?.pedidos !== false;

    return (
        <div className="max-w-[1400px] mx-auto space-y-8">

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
                    <p className="text-slate-500 mt-1 text-sm">Visão geral e acesso rápido aos pedidos hospitalares.</p>
                </div>
                <div className="flex items-center gap-3">
                    {updating && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Atualizando...
                        </span>
                    )}
                    {canCreateOrder && (
                        <Link
                            href="/dashboard/pedidos/novo"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#001A72] text-white rounded-lg shadow-sm font-medium hover:bg-[#001250] transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Novo Pedido
                        </Link>
                    )}
                </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-blue-50 text-[#001A72] rounded-lg">
                            <ShoppingCart className="w-5 h-5" />
                        </div>
                        <span className="text-3xl font-bold text-slate-900">{totalPedidos}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-700">Total de Pedidos</p>
                    <p className="text-xs text-slate-400 mt-0.5">Todos os registros</p>
                    <div className="mt-3 h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-[#001A72]" style={{ width: '100%' }} />
                    </div>
                </div>

                {/* Pendente */}
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
                        <div
                            className="h-1.5 rounded-full bg-orange-400 transition-all"
                            style={{ width: totalPedidos ? `${(pendentes / totalPedidos) * 100}%` : '0%' }}
                        />
                    </div>
                </div>

                {/* Realizado */}
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
                        <div
                            className="h-1.5 rounded-full bg-[#001A72] transition-all"
                            style={{ width: totalPedidos ? `${(realizados / totalPedidos) * 100}%` : '0%' }}
                        />
                    </div>
                </div>

                {/* Recebido */}
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
                        <div
                            className="h-1.5 rounded-full bg-green-500 transition-all"
                            style={{ width: totalPedidos ? `${(recebidos / totalPedidos) * 100}%` : '0%' }}
                        />
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800">Últimos Pedidos Registrados</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Nº Pedido
                                </th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Unidade
                                </th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Data
                                </th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {visiblePedidos.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        Nenhum pedido encontrado no sistema.
                                    </td>
                                </tr>
                            ) : (
                                visiblePedidos.map((pedido: any) => (
                                    <tr key={pedido.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            <Link href={`/dashboard/pedidos/${pedido.id}`} className="hover:text-[#001A72] flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-slate-400 group-hover:text-[#001A72]" />
                                                #{pedido.numero_pedido}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {pedido.unidades?.nome || 'Não informada'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-0.5 inline-flex text-[11px] leading-5 font-semibold rounded-full capitalize ${getStatusBadge(pedido.status)}`}>
                                                {pedido.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link
                                                href={`/dashboard/pedidos/${pedido.id}`}
                                                className="text-[#001A72] hover:text-[#001250] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                                            >
                                                Visualizar
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
