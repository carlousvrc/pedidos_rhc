'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function Home() {
  const [pedidoId, setPedidoId] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pedidoId.trim()) {
      router.push(`/dashboard/pedidos/${pedidoId.trim()}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 mt-1">Visão geral e acesso rápido</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
          <div className="p-6 flex-1">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-orange-500" />
              Buscar Pedido
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="pedidoId" className="block text-sm font-medium text-slate-600 mb-1">
                  ID do Pedido
                </label>
                <input
                  id="pedidoId"
                  name="pedidoId"
                  type="text"
                  required
                  value={pedidoId}
                  onChange={(e) => setPedidoId(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-200 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001A72] focus:border-transparent sm:text-sm"
                  placeholder="Ex: 123"
                />
              </div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#001A72] hover:bg-[#001250] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#001A72] transition-colors"
              >
                Buscar
              </button>
            </form>
          </div>
          <div className="bg-orange-50 px-6 py-2 border-t border-orange-100">
            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Acesso Rápido</span>
          </div>
        </div>
      </div>
    </div>
  );
}
