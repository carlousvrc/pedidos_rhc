'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Trash2, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NovoPedidoPage() {
    const router = useRouter();

    // States for form data
    const [unidades, setUnidades] = useState<any[]>([]);
    const [itens, setItens] = useState<any[]>([]);

    const [selectedUnidade, setSelectedUnidade] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItens, setSelectedItens] = useState<any[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load Data
    useEffect(() => {
        async function fetchInitialData() {
            // Fetch unidades
            const { data: unidadesData } = await supabase
                .from('unidades')
                .select('*')
                .order('nome');
            if (unidadesData) setUnidades(unidadesData);

            // Fetch itens
            const { data: itensData } = await supabase
                .from('itens')
                .select('*')
                .order('nome');
            if (itensData) setItens(itensData);
        }
        fetchInitialData();
    }, []);

    // Filter items based on search
    const filteredItens = itens.filter(item =>
        item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5); // Limit to top 5 for quick select

    // Add item to cart
    const addItem = (item: any) => {
        if (!selectedItens.find(i => i.id === item.id)) {
            setSelectedItens([...selectedItens, { ...item, quantidade: 1 }]);
        }
    };

    // Remove item from cart
    const removeItem = (id: string) => {
        setSelectedItens(selectedItens.filter(i => i.id !== id));
    };

    // Update quantity
    const updateQuantity = (id: string, qty: number) => {
        if (qty < 1) return;
        setSelectedItens(selectedItens.map(i => i.id === id ? { ...i, quantidade: qty } : i));
    };

    // Handle Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUnidade || selectedItens.length === 0) {
            alert('Selecione uma unidade e pelo menos um item.');
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Create the Order (Pedido)
            const numeroPedido = Math.floor(100000 + Math.random() * 900000).toString(); // Simple random generator for example

            const { data: newOrder, error: orderError } = await supabase
                .from('pedidos')
                .insert({
                    numero_pedido: numeroPedido,
                    unidade_id: selectedUnidade,
                    status: 'Pendente',
                    data_pedido: new Date().toISOString()
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Insert Items (Pedidos_Itens)
            const pedidoItensToInsert = selectedItens.map(item => ({
                pedido_id: newOrder.id,
                item_id: item.id,
                quantidade: item.quantidade
            }));

            const { error: itemsError } = await supabase
                .from('pedidos_itens')
                .insert(pedidoItensToInsert);

            if (itemsError) throw itemsError;

            // Success
            router.push(`/dashboard/pedidos/${newOrder.id}`);

        } catch (error) {
            console.error('Error submitting order:', error);
            alert('Erro ao salvar o pedido. Tente novamente.');
            setIsSubmitting(false);
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
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Novo Pedido</h1>
                    <p className="text-slate-500 mt-1 text-sm">Crie uma nova solicitação de suprimento hospitalar.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Form Fields */}
                <div className="lg:col-span-2 space-y-6">

                    {/* General Data Card */}
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

                    {/* Add Items Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-800">Adicionar Itens</h2>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar material por nome ou código..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] transition-colors"
                                />
                            </div>

                            {/* Search Results */}
                            {searchTerm && (
                                <div className="border border-slate-100 rounded-lg overflow-hidden bg-white shadow-sm">
                                    {filteredItens.length > 0 ? (
                                        filteredItens.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800">{item.nome}</p>
                                                    <p className="text-xs text-slate-500">Cód: {item.codigo} | Ref: {item.referencia}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => addItem(item)}
                                                    className="p-1.5 bg-blue-50 text-[#001A72] rounded-md hover:bg-[#001A72] hover:text-white transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-sm text-slate-500">Nenhum item encontrado.</div>
                                    )}
                                </div>
                            )}

                            {/* Selected Items List */}
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-slate-700 mb-3">Itens Selecionados ({selectedItens.length})</h3>
                                {selectedItens.length === 0 ? (
                                    <div className="p-8 border-2 border-dashed border-slate-200 rounded-lg text-center bg-slate-50/50">
                                        <p className="text-sm text-slate-500">Nenhum item adicionado ao pedido ainda.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedItens.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-white shadow-sm ring-1 ring-slate-100">
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-800">{item.nome}</p>
                                                    <p className="text-xs text-slate-500">Cód: {item.codigo}</p>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateQuantity(item.id, item.quantidade - 1)}
                                                            className="px-3 py-1 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
                                                        >-</button>
                                                        <span className="px-3 py-1 text-sm font-medium w-12 text-center border-x border-slate-200">{item.quantidade}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateQuantity(item.id, item.quantidade + 1)}
                                                            className="px-3 py-1 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
                                                        >+</button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(item.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
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

                {/* Right Column: Order Summary & Actions */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden sticky top-24">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800">Resumo do Pedido</h2>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Qtd Itens Distintos:</span>
                                <span className="font-medium text-slate-800">{selectedItens.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Total Solicitado:</span>
                                <span className="font-medium text-slate-800">
                                    {selectedItens.reduce((acc, item) => acc + item.quantidade, 0)} unidades
                                </span>
                            </div>

                            <div className="pt-4 mt-4 border-t border-slate-100">
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
                        {/* Decoration */}
                        <div className="h-1.5 w-full bg-orange-500"></div>
                    </div>
                </div>

            </form>
        </div>
    );
}
