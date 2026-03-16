'use client';

import { useState } from 'react';
import { X, Package } from 'lucide-react';

const TIPO_COLORS: Record<string, string> = {
    'B.BRAUN': 'bg-blue-100 text-blue-800',
    'FRALDAS': 'bg-green-100 text-green-800',
    'LIFETEX-SURGITEXTIL': 'bg-orange-100 text-orange-800',
    'MAT. MED. HOSPITALAR': 'bg-slate-100 text-slate-700',
    'MED. ONCO': 'bg-red-100 text-red-800',
    'MED. ONCO CONTR. LIBBS.': 'bg-purple-100 text-purple-800',
    'MEDICAMENTOS': 'bg-teal-100 text-teal-800',
};

interface Props {
    item: { id: string; nome: string; codigo: string; referencia?: string; tipo?: string };
    initialQty: number;
    mode: 'add' | 'edit';
    onConfirm: (qty: number) => void;
    onCancel: () => void;
}

export default function ItemAddModal({ item, initialQty, mode, onConfirm, onCancel }: Props) {
    const [qty, setQty] = useState(initialQty);

    const change = (delta: number) => setQty(q => Math.max(1, q + delta));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />

            <div className="relative bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-slate-100">
                    <div className="flex items-start gap-3 flex-1 min-w-0 mr-3">
                        <div className="p-2 bg-blue-50 text-[#001A72] rounded-lg shrink-0 mt-0.5">
                            <Package className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-bold text-slate-800 leading-snug">{item.nome}</h3>
                            {item.tipo && (
                                <span className={`mt-1 inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wide ${TIPO_COLORS[item.tipo] ?? 'bg-slate-100 text-slate-600'}`}>
                                    {item.tipo}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Item info */}
                <div className="px-6 pt-5 pb-4 grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-0.5">Código</p>
                        <p className="text-sm font-semibold text-slate-800">{item.codigo}</p>
                    </div>
                    {item.referencia && (
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-400 mb-0.5">Referência</p>
                            <p className="text-sm font-semibold text-slate-800">{item.referencia}</p>
                        </div>
                    )}
                </div>

                {/* Quantity */}
                <div className="px-6 pb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-3">Quantidade</label>
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden w-fit">
                        <button type="button" onClick={() => change(-1)}
                            className="px-5 py-3 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors font-bold text-lg">−</button>
                        <input
                            type="number" min={1} value={qty}
                            onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setQty(v); }}
                            className="w-20 py-3 text-xl font-bold text-center border-x border-slate-200 focus:outline-none focus:bg-blue-50"
                        />
                        <button type="button" onClick={() => change(1)}
                            className="px-5 py-3 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors font-bold text-lg">+</button>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex justify-end gap-3">
                    <button type="button" onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button type="button" onClick={() => onConfirm(qty)}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#001A72] hover:bg-[#001250] rounded-lg transition-colors">
                        {mode === 'add' ? 'Adicionar ao Pedido' : 'Salvar Quantidade'}
                    </button>
                </div>
            </div>
        </div>
    );
}
