'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, ArrowLeft, Save, Package, Download } from 'lucide-react';
import Link from 'next/link';
import Papa from 'papaparse';
import { mockItens, mockUnidades } from '@/lib/mockData';
import 'tom-select/dist/css/tom-select.css';

function downloadCsv(numeroPedido: string, unidadeNome: string, items: any[]) {
    const rows = items.map(item => ({
        Numero_Pedido: numeroPedido,
        Unidade: unidadeNome,
        Data: new Date().toLocaleDateString('pt-BR'),
        Tipo: item.tipo || '',
        Codigo: item.codigo,
        Referencia: item.referencia,
        Descricao: item.nome,
        Quantidade: item.quantidade,
    }));
    const csv = Papa.unparse(rows, { delimiter: ';', header: true });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pedido_${numeroPedido}_${unidadeNome.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

const TIPOS = [
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

export default function NovoPedidoPage() {
    const router = useRouter();

    const [unidades, setUnidades] = useState<any[]>([]);
    const [itens, setItens] = useState<any[]>([]);

    const [selectedUnidade, setSelectedUnidade] = useState('');
    const [tipoFiltro, setTipoFiltro] = useState('');
    const [selectedItens, setSelectedItens] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectElRef = useRef<HTMLSelectElement>(null);
    const tomSelectRef = useRef<any>(null);
    const selectedIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        selectedIdsRef.current = new Set(selectedItens.map(i => i.id));
    }, [selectedItens]);

    useEffect(() => {
        async function fetchInitialData() {
            const { data: unidadesData } = await supabase.from('unidades').select('*').order('nome');
            setUnidades(unidadesData?.length ? unidadesData : mockUnidades);

            // Busca todos os itens usando paginação (limite padrão do Supabase é 1000)
            let allItens: any[] = [];
            let from = 0;
            const pageSize = 1000;
            while (true) {
                const { data: page } = await supabase.from('itens').select('*').order('nome').range(from, from + pageSize - 1);
                if (!page || page.length === 0) break;
                allItens = allItens.concat(page);
                if (page.length < pageSize) break;
                from += pageSize;
            }
            setItens(allItens.length ? allItens : mockItens);
        }
        fetchInitialData();
    }, []);

    // Init / reinit TomSelect when itens or tipoFiltro changes
    useEffect(() => {
        if (!selectElRef.current || !itens.length) return;

        // Lazy-import TomSelect to avoid SSR issues
        import('tom-select').then(({ default: TomSelect }) => {
            if (tomSelectRef.current) {
                tomSelectRef.current.destroy();
                tomSelectRef.current = null;
            }

            const filteredOptions = tipoFiltro
                ? itens.filter(i => i.tipo === tipoFiltro)
                : itens;

            const options = filteredOptions.map(item => ({
                value: item.id,
                text: item.nome,
                codigo: String(item.codigo ?? ''),
                referencia: String(item.referencia ?? ''),
                tipo: item.tipo ?? '',
            }));

            tomSelectRef.current = new TomSelect(selectElRef.current!, {
                options,
                valueField: 'value',
                labelField: 'text',
                searchField: ['text', 'codigo', 'referencia'],
                placeholder: 'Buscar por descrição, código ou referência...',
                maxOptions: 60,
                closeAfterSelect: true,
                onItemAdd(value: string) {
                    const item = itens.find(i => i.id === value);
                    if (item && !selectedIdsRef.current.has(item.id)) {
                        setSelectedItens(prev => [...prev, { ...item, quantidade: 1 }]);
                    }
                    // Clear selection so the field is ready for next search
                    setTimeout(() => {
                        tomSelectRef.current?.clear();
                        tomSelectRef.current?.clearOptions();
                        tomSelectRef.current?.addOptions(options);
                    }, 0);
                },
                render: {
                    option(data: any) {
                        return `<div class="ts-item-option">
                            <span class="ts-item-name">${data.text}</span>
                            <span class="ts-item-meta">Cód: ${data.codigo} · Ref: ${data.referencia}${data.tipo ? ` · ${data.tipo}` : ''}</span>
                        </div>`;
                    },
                    item(data: any) {
                        return `<div>${data.text}</div>`;
                    },
                },
            });
        });

        return () => {
            tomSelectRef.current?.destroy();
            tomSelectRef.current = null;
        };
    }, [itens, tipoFiltro]);

    const selectedIds = useMemo(() => new Set(selectedItens.map(i => i.id)), [selectedItens]);

    const removeItem = (id: string) => setSelectedItens(prev => prev.filter(i => i.id !== id));

    const updateQuantity = (id: string, qty: number) => {
        if (qty < 1) return;
        setSelectedItens(prev => prev.map(i => i.id === id ? { ...i, quantidade: qty } : i));
    };

    const handleQtyInput = (id: string, value: string) => {
        const qty = parseInt(value);
        if (!isNaN(qty) && qty >= 1) updateQuantity(id, qty);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUnidade || selectedItens.length === 0) {
            alert('Selecione uma unidade e pelo menos um item.');
            return;
        }
        setIsSubmitting(true);
        try {
            const numeroPedido = Math.floor(100000 + Math.random() * 900000).toString();
            const unidadeNome = unidades.find(u => u.id === selectedUnidade)?.nome || selectedUnidade;

            // Generate and download CSV immediately
            downloadCsv(numeroPedido, unidadeNome, selectedItens);

            const { data: newOrder, error: orderError } = await supabase
                .from('pedidos')
                .insert({ numero_pedido: numeroPedido, unidade_id: selectedUnidade, status: 'Pendente' })
                .select()
                .single();
            if (orderError) throw orderError;

            const { error: itemsError } = await supabase
                .from('pedidos_itens')
                .insert(selectedItens.map(item => ({ pedido_id: newOrder.id, item_id: item.id, quantidade: item.quantidade })));
            if (itemsError) throw itemsError;

            router.push(`/dashboard/pedidos/${newOrder.id}`);
        } catch (error: any) {
            console.error('Error submitting order:', error);
            const msg = error?.message || error?.details || error?.hint || JSON.stringify(error);
            alert(`Erro ao salvar o pedido:\n${msg}`);
            setIsSubmitting(false);
        }
    };

    const totalUnidades = selectedItens.reduce((acc, i) => acc + i.quantidade, 0);

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/" className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-500 hover:text-[#001A72] transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Novo Pedido</h1>
                    <p className="text-slate-500 mt-1 text-sm">Crie uma nova solicitação de suprimento hospitalar.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Dados Gerais */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800">Dados Gerais</h2>
                        </div>
                        <div className="p-6">
                            <label htmlFor="unidade" className="block text-sm font-medium text-slate-700 mb-2">
                                Unidade Solicitante <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="unidade"
                                value={selectedUnidade}
                                onChange={(e) => setSelectedUnidade(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] focus:bg-white transition-all"
                            >
                                <option value="">Selecione a unidade...</option>
                                {unidades.map(u => (
                                    <option key={u.id} value={u.id}>{u.nome}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Adicionar Itens */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-800">Adicionar Itens</h2>
                            <p className="text-xs text-slate-500 mt-0.5">{itens.length.toLocaleString('pt-BR')} itens disponíveis no catálogo</p>
                        </div>

                        <div className="p-6 space-y-6">

                            {/* TomSelect + Tipo filter */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1">
                                    <select ref={selectElRef} className="w-full" />
                                </div>

                                <select
                                    value={tipoFiltro}
                                    onChange={(e) => setTipoFiltro(e.target.value)}
                                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] transition-colors"
                                >
                                    <option value="">Todos os tipos</option>
                                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            {/* Selected Items List */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                                    Itens do Pedido
                                    {selectedItens.length > 0 && (
                                        <span className="ml-2 bg-[#001A72] text-white text-xs px-2 py-0.5 rounded-full">
                                            {selectedItens.length}
                                        </span>
                                    )}
                                </h3>

                                {selectedItens.length === 0 ? (
                                    <div className="p-8 border-2 border-dashed border-slate-200 rounded-lg text-center bg-slate-50/50">
                                        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-slate-500">Nenhum item adicionado.</p>
                                        <p className="text-xs text-slate-400 mt-1">Use a busca acima para encontrar e adicionar itens.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedItens.map((item, index) => (
                                            <div key={item.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-white shadow-sm">
                                                <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                                                    <span className="text-xs text-slate-400 font-mono w-5 text-right shrink-0">{index + 1}</span>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate">{item.nome}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-slate-400">Cód: {item.codigo}</span>
                                                            {item.tipo && (
                                                                <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wide ${TIPO_COLORS[item.tipo] ?? 'bg-slate-100 text-slate-600'}`}>
                                                                    {item.tipo}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateQuantity(item.id, item.quantidade - 1)}
                                                            className="px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors font-medium"
                                                        >−</button>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={item.quantidade}
                                                            onChange={(e) => handleQtyInput(item.id, e.target.value)}
                                                            className="w-14 py-1.5 text-sm font-medium text-center border-x border-slate-200 focus:outline-none focus:bg-blue-50"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => updateQuantity(item.id, item.quantidade + 1)}
                                                            className="px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors font-medium"
                                                        >+</button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(item.id)}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Summary */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden sticky top-24">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800">Resumo do Pedido</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Unidade:</span>
                                <span className="font-medium text-slate-800 text-right max-w-[140px] truncate">
                                    {unidades.find(u => u.id === selectedUnidade)?.nome || '—'}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Itens distintos:</span>
                                <span className="font-medium text-slate-800">{selectedItens.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Total de unidades:</span>
                                <span className="font-medium text-slate-800">{totalUnidades}</span>
                            </div>

                            {selectedItens.length > 0 && (
                                <div className="pt-3 mt-1 border-t border-slate-100 space-y-1 max-h-48 overflow-y-auto">
                                    {selectedItens.map(item => (
                                        <div key={item.id} className="flex justify-between text-xs text-slate-500">
                                            <span className="truncate mr-2 max-w-[140px]">{item.nome}</span>
                                            <span className="shrink-0 font-medium text-slate-700">× {item.quantidade}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="pt-4 mt-2 border-t border-slate-100 space-y-2">
                                <button
                                    type="button"
                                    disabled={selectedItens.length === 0 || !selectedUnidade}
                                    onClick={() => {
                                        const num = Math.floor(100000 + Math.random() * 900000).toString();
                                        const nome = unidades.find(u => u.id === selectedUnidade)?.nome || selectedUnidade;
                                        downloadCsv(num, nome, selectedItens);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[#001A72] text-[#001A72] rounded-lg font-medium hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                                >
                                    <Download className="w-4 h-4" />
                                    Baixar CSV
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || selectedItens.length === 0 || !selectedUnidade}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#001A72] text-white rounded-lg font-medium hover:bg-[#001250] transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <span>Salvando...</span>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            Requisitar Pedido
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="h-1.5 w-full bg-orange-500" />
                    </div>
                </div>

            </form>

            <style>{`
                .ts-wrapper {
                    width: 100%;
                }
                .ts-control {
                    border: 1px solid #e2e8f0 !important;
                    border-radius: 0.5rem !important;
                    padding: 0.5rem 0.75rem !important;
                    background: #fff !important;
                    font-size: 0.875rem !important;
                    box-shadow: none !important;
                    min-height: 42px !important;
                }
                .ts-control:focus-within {
                    border-color: #001A72 !important;
                    box-shadow: 0 0 0 2px rgba(0,26,114,0.15) !important;
                }
                .ts-dropdown {
                    border: 1px solid #e2e8f0 !important;
                    border-radius: 0.5rem !important;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.10) !important;
                    font-size: 0.875rem !important;
                    margin-top: 4px !important;
                }
                .ts-dropdown .option {
                    padding: 0 !important;
                }
                .ts-dropdown .option.active {
                    background: #f1f5f9 !important;
                    color: inherit !important;
                }
                .ts-item-option {
                    display: flex;
                    flex-direction: column;
                    padding: 8px 14px;
                }
                .ts-item-name {
                    font-weight: 500;
                    color: #1e293b;
                }
                .ts-item-meta {
                    font-size: 0.75rem;
                    color: #94a3b8;
                    margin-top: 1px;
                }
                .ts-control input::placeholder {
                    color: #94a3b8;
                }
            `}</style>
        </div>
    );
}
