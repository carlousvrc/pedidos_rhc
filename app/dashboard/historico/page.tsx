'use client';

import { History, ArrowLeft, Search, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { mockPedidos } from '@/lib/mockData';

export default function HistoricoPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPedidos = mockPedidos.filter(p =>
        p.numero_pedido.includes(searchTerm) ||
        p.unidades.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pendente': return 'bg-orange-100 text-orange-800';
            case 'atendido': return 'bg-green-100 text-green-800';
            case 'cancelado': return 'bg-red-100 text-red-800';
            default: return 'bg-blue-100 text-[#001A72]';
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/" className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-500 hover:text-[#001A72] transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Histórico de Pedidos</h1>
                    <p className="text-slate-500 mt-1 text-sm">Consulte o registro completo de todas as solicitações anteriores.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Search Header */}
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por Nº do Pedido ou Unidade..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] focus:bg-white transition-colors"
                        />
                    </div>
                    <button disabled className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-lg cursor-not-allowed">
                        <Calendar className="w-4 h-4" /> Período
                    </button>
                </div>

                {/* Data Table */}
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
                            {filteredPedidos.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        Nenhum pedido encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredPedidos.map((pedido) => (
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
