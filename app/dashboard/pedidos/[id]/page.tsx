
import { supabase } from '@/lib/supabase';
import { ExportCsvButton } from './ExportCsvButton';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { mockPedidos, mockPedidosItens, mockItens } from '@/lib/mockData';

export default async function OrderDetailsPage({ params }: { params: { id: string } }) {
    const { id } = params;

    let order: any = null;
    let orderItems: any[] = [];
    let isMock = false;

    // 1. Try Fetching the order from Supabase
    const { data: supabaseOrder, error: orderError } = await supabase
        .from('pedidos')
        .select(`
            *,
            unidades(nome)
        `)
        .eq('id', id)
        .single();

    // If we have a valid order from Supabase, load its items
    if (supabaseOrder && !orderError) {
        order = supabaseOrder;

        // Fetch the items for this order from Supabase
        const { data: supabaseItems } = await supabase
            .from('pedidos_itens')
            .select(`
                id,
                quantidade,
                itens(codigo, referencia, nome)
            `)
            .eq('pedido_id', id);

        orderItems = supabaseItems || [];
    }
    // 2. If Supabase failed (e.g., row not found or network error), fallback to Mock Data
    else {
        const foundMockOrder = mockPedidos.find(p => p.id === id);
        if (foundMockOrder) {
            order = foundMockOrder;
            isMock = true;

            const foundMockItems = mockPedidosItens.filter(pi => pi.pedido_id === id);

            // Map the mock item IDs to their full representations mimicking the join
            orderItems = foundMockItems.map(pi => {
                const itemRef = mockItens.find(i => i.id === pi.item_id);
                return {
                    id: pi.id,
                    quantidade: pi.quantidade,
                    itens: {
                        codigo: itemRef?.codigo || '',
                        referencia: itemRef?.referencia || '',
                        nome: itemRef?.nome || ''
                    }
                };
            });
        } else {
            return <div className="text-red-500 p-8 text-center font-bold bg-white rounded-xl shadow-sm border border-red-100 m-8">Erro ao carregar o pedido. O pedido #{id} não foi encontrado no banco de dados principal nem nos dados locais de teste.</div>;
        }
    }

    const formattedDate = new Date(order.data_pedido).toLocaleDateString('pt-BR');

    // Prepare data for Exporting
    const exportData = orderItems.map((item: any) => ({
        Numero_Pedido: order.numero_pedido,
        Codigo_Item: item.itens.codigo,
        Referencia: item.itens.referencia,
        Descricao: item.itens.nome,
        Quantidade_Solicitada: item.quantidade
    }));

    // Helper for Status color
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pendente': return 'bg-orange-100 text-orange-800';
            case 'atendido': return 'bg-green-100 text-green-800';
            case 'cancelado': return 'bg-red-100 text-red-800';
            default: return 'bg-blue-100 text-[#001A72]'; // Standard brand color
        }
    };

    return (
        <div className="space-y-6 max-w-[1400px]">

            {/* Breadcrumbs */}
            <div className="flex items-center text-xs text-slate-500 gap-2 mb-2">
                <Link href="/" className="hover:text-[#001A72] transition-colors">Dashboard</Link>
                <ChevronRight className="w-3 h-3" />
                <span>Pedidos</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-slate-800 font-medium">#{order.numero_pedido}</span>
            </div>

            {/* Header Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-4">Pedido #{order.numero_pedido}</h1>
                    <div className="flex gap-8 text-sm">
                        <div>
                            <p className="text-slate-500 mb-1">Status</p>
                            <p className={`font - semibold capitalize px - 2.5 py - 0.5 inline - flex text - [11px] leading - 5 rounded - full ${getStatusColor(order.status)} `}>
                                {order.status}
                            </p>
                        </div>
                        <div>
                            <p className="text-slate-500 mb-1">Data</p>
                            <p className="font-medium text-slate-900">{formattedDate}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 mb-1">Unidade Solicitante</p>
                            <p className="font-medium text-slate-900">{order.unidades?.nome || 'N/I'}</p>
                        </div>
                    </div>
                </div>

                {/* Export Button */}
                <div>
                    <ExportCsvButton
                        data={exportData}
                        filename={`Pedido_${order.numero_pedido}_${order.unidades?.nome || 'Unidade'}.csv`}
                    />
                </div>
            </div>

            {/* Items Table Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">Itens Solicitados</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-24">
                                    Código
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-32">
                                    Referência
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Descrição
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-32">
                                    Qtd Solicitada
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {orderItems.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        Nenhum item encontrado para este pedido.
                                    </td>
                                </tr>
                            ) : (
                                orderItems.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                                            {item.itens.codigo}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {item.itens.referencia}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-900">
                                            {item.itens.nome}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium text-right">
                                            {item.quantidade}
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
