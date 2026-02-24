import { supabase } from '@/lib/supabase';
import { ExportCsvButton } from './ExportCsvButton';

export default async function OrderDetailsPage({ params }: { params: { id: string } }) {
    const { id } = params;

    // Fetch the order from Supabase
    const { data: order, error: orderError } = await supabase
        .from('pedidos')
        .select(`
      *,
      unidades (
        nome
      )
    `)
        .eq('id', id)
        .single();

    if (orderError || !order) {
        console.error('Error fetching order:', orderError);
        return <div className="p-8 text-red-500">Erro ao carregar o pedido.</div>;
    }

    // Fetch the items for this order
    const { data: orderItems, error: itemsError } = await supabase
        .from('pedidos_itens')
        .select(`
      id,
      quantidade,
      itens (
        codigo,
        referencia,
        nome
      )
    `)
        .eq('pedido_id', id);

    if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        return <div className="p-8 text-red-500">Erro ao carregar os itens do pedido.</div>;
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

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800 mb-4">Pedido #{order.numero_pedido}</h1>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                        <div>
                            <p className="text-gray-500 mb-1">Status</p>
                            <p className="font-medium text-gray-900 capitalize px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {order.status}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-500 mb-1">Data</p>
                            <p className="font-medium text-gray-900">{formattedDate}</p>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-gray-500 mb-1">Unidade Solicitante</p>
                            <p className="font-medium text-gray-900">{order.unidades?.nome || 'N/I'}</p>
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-medium text-gray-800">Itens Solicitados</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                                    Código
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                    Referência
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Descrição
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                    Qtd Solicitada
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {orderItems.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        Nenhum item encontrado para este pedido.
                                    </td>
                                </tr>
                            ) : (
                                orderItems.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                            {item.itens.codigo}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.itens.referencia}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {item.itens.nome}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-right">
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
