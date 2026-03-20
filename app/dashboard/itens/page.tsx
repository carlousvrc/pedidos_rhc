'use client';

import { Package, Search, Plus, X, Save, ChevronRight } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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

const TIPO_COLORS: Record<string, string> = {
    'B.BRAUN': 'bg-blue-100 text-blue-800',
    'FRALDAS': 'bg-green-100 text-green-800',
    'LIFETEX-SURGITEXTIL': 'bg-orange-100 text-orange-800',
    'MAT. MED. HOSPITALAR': 'bg-slate-100 text-slate-700',
    'MED. ONCO': 'bg-red-100 text-red-800',
    'MED. ONCO CONTR. LIBBS.': 'bg-purple-100 text-purple-800',
    'MEDICAMENTOS': 'bg-teal-100 text-teal-800',
};

const ITEMS_PER_PAGE = 50;

interface Item {
    id: string;
    codigo: string;
    referencia: string;
    nome: string;
    tipo: string;
}

interface NovoItemForm {
    nome: string;
    codigo: string;
    referencia: string;
    tipo: string;
}

function TipoBadge({ tipo }: { tipo: string }) {
    const cls = TIPO_COLORS[tipo] ?? 'bg-slate-100 text-slate-700';
    return (
        <span className={`px-2.5 py-0.5 inline-flex text-[11px] leading-5 font-semibold rounded-full uppercase tracking-wider ${cls}`}>
            {tipo}
        </span>
    );
}

export default function ItensPage() {
    const [itens, setItens] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFiltro, setTipoFiltro] = useState('TODOS');
    const [page, setPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<NovoItemForm>({ nome: '', codigo: '', referencia: '', tipo: '' });

    useEffect(() => {
        async function loadItens() {
            setLoading(true);
            let all: Item[] = [];
            let from = 0;
            const pageSize = 1000;
            while (true) {
                const { data } = await supabase.from('itens').select('*').order('nome').range(from, from + pageSize - 1);
                if (!data || data.length === 0) break;
                all = all.concat(data);
                if (data.length < pageSize) break;
                from += pageSize;
            }
            setItens(all.length ? all : mockItens);
            setLoading(false);
        }
        loadItens();
    }, []);

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return itens.filter(item => {
            const matchTipo = tipoFiltro === 'TODOS' || item.tipo === tipoFiltro;
            const matchSearch =
                !term ||
                item.nome.toLowerCase().includes(term) ||
                String(item.codigo).includes(term) ||
                String(item.referencia).toLowerCase().includes(term);
            return matchTipo && matchSearch;
        });
    }, [itens, searchTerm, tipoFiltro]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    function handleSearch(val: string) { setSearchTerm(val); setPage(1); }
    function handleTipo(val: string) { setTipoFiltro(val); setPage(1); }

    function openModal() {
        setForm({ nome: '', codigo: '', referencia: '', tipo: '' });
        setShowModal(true);
    }

    async function handleSave() {
        if (!form.nome.trim() || !form.codigo.trim()) {
            alert('Nome e Código são obrigatórios.');
            return;
        }
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('itens')
                .insert({ nome: form.nome.trim(), codigo: form.codigo.trim(), referencia: form.referencia.trim(), tipo: form.tipo || null })
                .select()
                .single();
            if (error) throw error;
            setItens(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
            setShowModal(false);
        } catch (err: any) {
            alert(`Erro ao salvar item:\n${err.message || JSON.stringify(err)}`);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-[1400px] mx-auto space-y-5">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                        <a href="/" className="hover:text-[#001A72] transition-colors">Dashboard</a>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-slate-700 font-medium">Itens</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm shrink-0">
                            <Package className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Catálogo de Itens</h1>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {loading ? 'Carregando...' : `${itens.length.toLocaleString('pt-BR')} itens cadastrados`}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {!loading && filtered.length !== itens.length && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg font-medium">
                            {filtered.length.toLocaleString('pt-BR')} encontrado{filtered.length !== 1 ? 's' : ''}
                        </span>
                    )}
                    <button
                        onClick={openModal}
                        className="flex items-center gap-2 px-4 py-2 bg-[#001A72] text-white rounded-lg hover:bg-[#001250] transition-colors shadow-sm text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" /> Novo Item
                    </button>
                </div>
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
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Referência</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                                        Carregando itens...
                                    </td>
                                </tr>
                            ) : paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        Nenhum item encontrado.
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-700">{item.codigo}</td>
                                        <td className="px-6 py-4 text-sm text-slate-900">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-100 p-1.5 rounded-lg shrink-0">
                                                    <Package className="w-4 h-4 text-slate-500" />
                                                </div>
                                                {item.nome}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{item.referencia}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {item.tipo ? <TipoBadge tipo={item.tipo} /> : <span className="text-slate-400 text-sm">—</span>}
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
                            <span className="px-2">{page} / {totalPages}</span>
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

            {/* Modal Novo Item */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800">Novo Item</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Descrição <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.nome}
                                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                                    placeholder="Ex: SORO FISIOLÓGICO 500ML"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] bg-slate-50 focus:bg-white transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Código <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.codigo}
                                        onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                                        placeholder="Ex: 12345"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] bg-slate-50 focus:bg-white transition-all font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Referência</label>
                                    <input
                                        type="text"
                                        value={form.referencia}
                                        onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
                                        placeholder="Ex: 409084"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] bg-slate-50 focus:bg-white transition-all font-mono"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo</label>
                                <select
                                    value={form.tipo}
                                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] bg-slate-50 focus:bg-white transition-all"
                                >
                                    <option value="">Selecione um tipo...</option>
                                    {TIPOS.filter(t => t !== 'TODOS').map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-5 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2 bg-[#001A72] text-white rounded-lg text-sm font-medium hover:bg-[#001250] transition-colors disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Salvando...' : 'Salvar Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
