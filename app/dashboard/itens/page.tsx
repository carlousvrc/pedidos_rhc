'use client';

import { Package, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { mockItens } from '@/lib/mockData';

const TIPOS = [
    'TODOS',
    'B.BRAUN',
    'FRALDAS',
    'LIFETEX-SURGITEXTIL',
    'MAT. MED. HOSPITALAR',
    'MED. ONCO',
    'MED. ONCO CONTR. LIBBS.',
    'MEDICAMENTOS',
];

const ITEMS_PER_PAGE = 50;

export default function ItensPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFiltro, setTipoFiltro] = useState('TODOS');
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return mockItens.filter(item => {
            const matchTipo = tipoFiltro === 'TODOS' || item.tipo === tipoFiltro;
            const matchSearch =
                !term ||
                item.nome.toLowerCase().includes(term) ||
                item.codigo.includes(term) ||
                item.referencia.toLowerCase().includes(term);
            return matchTipo && matchSearch;
        });
    }, [searchTerm, tipoFiltro]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    function handleSearch(val: string) {
        setSearchTerm(val);
        setPage(1);
    }

    function handleTipo(val: string) {
        setTipoFiltro(val);
        setPage(1);
    }

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Itens</h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        Catálogo de materiais e medicamentos disponíveis para pedido.
                    </p>
                </div>
                <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg font-medium">
                    {filtered.length.toLocaleString('pt-BR')} item(s)
                </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">

                {/* Filters */}
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por descrição, código ou referência..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] focus:bg-white transition-colors"
                        />
                    </div>
                    <select
                        value={tipoFiltro}
                        onChange={(e) => handleTipo(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] focus:bg-white transition-colors"
                    >
                        {TIPOS.map(t => (
                            <option key={t} value={t}>{t === 'TODOS' ? 'Todos os tipos' : t}</option>
                        ))}
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Código
                                </th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Descrição
                                </th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Referência
                                </th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Tipo
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        Nenhum item encontrado.
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-700">
                                            {item.codigo}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-900">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-100 p-1.5 rounded-lg shrink-0">
                                                    <Package className="w-4 h-4 text-slate-500" />
                                                </div>
                                                {item.nome}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                                            {item.referencia}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <TipoBadge tipo={item.tipo} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                        <span>
                            Exibindo {((page - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} de {filtered.length.toLocaleString('pt-BR')}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 rounded-md border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                            >
                                Anterior
                            </button>
                            <span className="px-2">
                                {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 rounded-md border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const TIPO_COLORS: Record<string, string> = {
    'B.BRAUN': 'bg-blue-100 text-blue-800',
    'FRALDAS': 'bg-green-100 text-green-800',
    'LIFETEX-SURGITEXTIL': 'bg-orange-100 text-orange-800',
    'MAT. MED. HOSPITALAR': 'bg-slate-100 text-slate-700',
    'MED. ONCO': 'bg-red-100 text-red-800',
    'MED. ONCO CONTR. LIBBS.': 'bg-purple-100 text-purple-800',
    'MEDICAMENTOS': 'bg-teal-100 text-teal-800',
};

function TipoBadge({ tipo }: { tipo: string }) {
    const cls = TIPO_COLORS[tipo] ?? 'bg-slate-100 text-slate-700';
    return (
        <span className={`px-2.5 py-0.5 inline-flex text-[11px] leading-5 font-semibold rounded-full uppercase tracking-wider ${cls}`}>
            {tipo}
        </span>
    );
}
