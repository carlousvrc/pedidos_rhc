'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sistema de Pedidos Hospitalares
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Busque as informações de um pedido específico
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="pedidoId" className="block text-sm font-medium text-gray-700">
                ID do Pedido
              </label>
              <div className="mt-1">
                <input
                  id="pedidoId"
                  name="pedidoId"
                  type="text"
                  required
                  value={pedidoId}
                  onChange={(e) => setPedidoId(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Ex: 123"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Buscar Pedido
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
