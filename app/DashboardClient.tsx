'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FileText, Clock, CheckCircle, Plus, RefreshCw } from 'lucide-react';
import type { Usuario } from '@/lib/auth';

interface DashboardClientProps {
    currentUser: Usuario | null;
    initialPedidos: any[];
}

function getStatusBadge(status: string) {
    switch (status?.toLowerCase()) {
        case 'pendente': return 'bg-orange-100 text-orange-800';
        case 'realizado': return 'bg-blue-100 text-[#001A72]';
        case 'recebido': return 'bg-green-100 text-green-800';
        default: return 'bg-slate-100 text-slate-700';
    }
}

const STEPS = ['Pendente', 'Realizado', 'Recebido'];

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
                                scope === 'operador' && currentUser
                                    ? data.filter((p: any) => p.usuario_id === currentUser.id)
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
        scope === 'operador' && currentUser
            ? pedidos.filter((p: any) => p.usuario_id === currentUser.id)
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

            {/* Progress Steps */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Fluxo de Pedidos</p>
                <div className="flex items-center gap-0">
                    {STEPS.map((step, idx) => {
                        const count =
                            step === 'Pendente' ? pendentes :
                            step === 'Realizado' ? realizados :
                            recebidos;
                        const colors =
                            step === 'Pendente' ? 'bg-orange-500 text-white' :
                            step === 'Realizado' ? 'bg-[#001A72] text-white' :
                            'bg-green-500 text-white';
                        return (
                            <div key={step} className="flex items-center flex-1">
                                <div className="flex-1 flex flex-col items-center gap-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${colors}`}>
                                        {count}
                                    </div>
                                    <span className="text-xs font-medium text-slate-600">{step}</span>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div className="flex-1 h-0.5 bg-slate-200 mx-2" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Summary Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-5 flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-[#001A72] rounded-lg">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Total de Pedidos</p>
                            <p className="text-3xl font-bold text-slate-900">{totalPedidos}</p>
                        </div>
                    </div>
                    <div className="bg-blue-50/50 px-5 py-2 border-t border-slate-50">
                        <span className="text-[10px] font-bold text-[#001A72] uppercase tracking-wider">Histórico Recente</span>
                    </div>
                </div>

                {/* Pendentes Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-5 flex items-center gap-4">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Aguardando Comprador</p>
                            <p className="text-3xl font-bold text-slate-900">{pendentes}</p>
                        </div>
                    </div>
                    <div className="bg-orange-50/50 px-5 py-2 border-t border-slate-50">
                        <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Pendentes</span>
                    </div>
                </div>

                {/* Recebidos Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-5 flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Pedidos Recebidos</p>
                            <p className="text-3xl font-bold text-slate-900">{recebidos}</p>
                        </div>
                    </div>
                    <div className="bg-green-50/50 px-5 py-2 border-t border-slate-50">
                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Concluídos</span>
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
