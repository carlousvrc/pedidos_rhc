import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { FileText, Clock, CheckCircle, Plus } from 'lucide-react';

export const revalidate = 0; // Force dynamic rendering so dashboard is always fresh

export default async function Home() {
  // Fetch orders
  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select(`
      id,
      numero_pedido,
      status,
      data_pedido,
      unidades (nome)
    `)
    .order('data_pedido', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching pedidos:', error);
  }

  const pedidosList = (pedidos as any[]) || [];

  // Summary Metrics
  const totalPedidos = pedidosList.length;
  const pendentes = pedidosList.filter(p => p.status?.toLowerCase() === 'pendente').length;
  const atendidos = pedidosList.filter(p => p.status?.toLowerCase() === 'atendido').length;

  // Helper for Status Badge
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pendente': return 'bg-orange-100 text-orange-800';
      case 'atendido': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-[#001A72]';
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">Visão geral e acesso rápido aos pedidos hospitalares.</p>
        </div>
        <Link
          href="/dashboard/pedidos/novo"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#001A72] text-white rounded-lg shadow-sm font-medium hover:bg-[#001250] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Pedido
        </Link>
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
              <p className="text-slate-500 text-sm font-medium">Aguardando Envio</p>
              <p className="text-3xl font-bold text-slate-900">{pendentes}</p>
            </div>
          </div>
          <div className="bg-orange-50/50 px-5 py-2 border-t border-slate-50">
            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Requer Atenção</span>
          </div>
        </div>

        {/* Atendidos Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Pedidos Atendidos</p>
              <p className="text-3xl font-bold text-slate-900">{atendidos}</p>
            </div>
          </div>
          <div className="bg-green-50/50 px-5 py-2 border-t border-slate-50">
            <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Processados</span>
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
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Nº Pedido
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Unidade
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Data
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {pedidosList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Nenhum pedido encontrado no sistema.
                  </td>
                </tr>
              ) : (
                pedidosList.map((pedido) => (
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
