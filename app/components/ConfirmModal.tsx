'use client';

import { Trash2, Package, AlertTriangle } from 'lucide-react';

interface Props {
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'primary' | 'warning';
    confirmLabel?: string;
}

export default function ConfirmModal({ title, description, onConfirm, onCancel, variant = 'danger', confirmLabel }: Props) {
    const label = confirmLabel ?? (variant === 'danger' ? 'Excluir' : 'Confirmar');

    const iconClass =
        variant === 'primary' ? 'bg-blue-50 text-[#001A72]' :
        variant === 'warning' ? 'bg-amber-50 text-amber-600' :
        'bg-red-50 text-red-500';

    const btnClass =
        variant === 'primary' ? 'bg-[#001A72] hover:bg-[#001250]' :
        variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600' :
        'bg-red-500 hover:bg-red-600';

    const icon =
        variant === 'primary' ? <Package className="w-5 h-5" /> :
        variant === 'warning' ? <AlertTriangle className="w-5 h-5" /> :
        <Trash2 className="w-5 h-5" />;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-sm mx-4 overflow-hidden">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-lg shrink-0 ${iconClass}`}>
                            {icon}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">{title}</h3>
                            <p className="text-sm text-slate-500 mt-1">{description}</p>
                        </div>
                    </div>
                </div>
                <div className="px-6 pb-6 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${btnClass}`}
                    >
                        {label}
                    </button>
                </div>
            </div>
        </div>
    );
}
