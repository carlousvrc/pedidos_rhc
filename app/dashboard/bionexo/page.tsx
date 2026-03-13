'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Download, RefreshCw, CheckCircle2, Clock, XCircle, AlertCircle, ChevronDown } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusOpcao = 'Pendente' | 'Recebido' | 'Recebido Parcial' | 'Nao Recebido';

interface BionexoItem {
    'Unidade Hospitalar'?: string;
    'Pedido de Cotacao'?: string;
    'Data Emissao'?: string;
    'Fornecedor'?: string;
    'Produto'?: string;
    'Codigo'?: string;
    'Fabricante'?: string;
    'Embalagem'?: string;
    'Preco Unitario (R$)'?: number | null;
    'Quantidade'?: number | null;
    'Unidade'?: string;
    'Valor Total (R$)'?: number | null;
    'Preco Referencia (R$)'?: number | null;
    Status: StatusOpcao;
    _id: string; // internal key
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: StatusOpcao[] = ['Pendente', 'Recebido', 'Recebido Parcial', 'Nao Recebido'];

const STATUS_STYLE: Record<StatusOpcao, string> = {
    'Pendente':         'bg-slate-100 text-slate-600',
    'Recebido':         'bg-green-100 text-green-700',
    'Recebido Parcial': 'bg-yellow-100 text-yellow-700',
    'Nao Recebido':     'bg-red-100 text-red-700',
};

const STATUS_ICON: Record<StatusOpcao, React.ReactNode> = {
    'Pendente':         <Clock className="w-3 h-3" />,
    'Recebido':         <CheckCircle2 className="w-3 h-3" />,
    'Recebido Parcial': <AlertCircle className="w-3 h-3" />,
    'Nao Recebido':     <XCircle className="w-3 h-3" />,
};

const VISIBLE_COLS: { key: keyof BionexoItem; label: string; mono?: boolean; right?: boolean }[] = [
    { key: 'Pedido de Cotacao',    label: 'Pedido',         mono: true },
    { key: 'Data Emissao',         label: 'Emissão' },
    { key: 'Unidade Hospitalar',   label: 'Unidade' },
    { key: 'Fornecedor',           label: 'Fornecedor' },
    { key: 'Produto',              label: 'Produto' },
    { key: 'Codigo',               label: 'Código',         mono: true },
    { key: 'Fabricante',           label: 'Fabricante' },
    { key: 'Embalagem',            label: 'Embalagem' },
    { key: 'Quantidade',           label: 'Qtd',            right: true },
    { key: 'Unidade',              label: 'Un.' },
    { key: 'Preco Unitario (R$)',   label: 'Preço Unit.',   right: true },
    { key: 'Valor Total (R$)',      label: 'Total',         right: true },
    { key: 'Preco Referencia (R$)', label: 'Ref.',          right: true },
];

function fmtBrl(val: number | null | undefined) {
    if (val == null) return '—';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BionexoPage() {
    const [items, setItems]           = useState<BionexoItem[]>([]);
    const [filename, setFilename]     = useState('');
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [filterStatus, setFilterStatus] = useState<StatusOpcao | 'Todos'>('Todos');
    const [filterFornecedor, setFilterFornecedor] = useState('');
    const [exporting, setExporting]   = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Upload & Convert ──────────────────────────────────────────────────────

    const convertPdf = useCallback(async (file: File) => {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            setError('Selecione um arquivo PDF.');
            return;
        }
        setLoading(true);
        setError(null);
        setItems([]);

        const formData = new FormData();
        formData.append('pdf', file);

        try {
            const res = await fetch('/api/bionexo/convert', { method: 'POST', body: formData });
            const json = await res.json();

            if (!res.ok) {
                setError(json.error || 'Erro ao converter PDF.');
                return;
            }

            const mapped: BionexoItem[] = (json.data as any[]).map((row, i) => ({
                ...row,
                Status: 'Pendente' as StatusOpcao,
                _id: `row-${i}`,
            }));

            setItems(mapped);
            setFilename(file.name.replace(/\.pdf$/i, '') + '.xlsx');
        } catch (e: any) {
            setError(e.message || 'Erro de conexão.');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) convertPdf(file);
        e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) convertPdf(file);
    };

    // ── Status ────────────────────────────────────────────────────────────────

    const setStatus = (id: string, status: StatusOpcao) => {
        setItems(prev => prev.map(it => it._id === id ? { ...it, Status: status } : it));
    };

    const setAllStatus = (status: StatusOpcao) => {
        setItems(prev => prev.map(it => ({ ...it, Status: status })));
    };

    // ── Export ────────────────────────────────────────────────────────────────

    const handleExport = async () => {
        if (!items.length) return;
        setExporting(true);
        try {
            const exportData = items.map(({ _id, ...rest }) => rest);
            const res = await fetch('/api/bionexo/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: exportData, filename }),
            });

            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                setError(j.error || 'Erro ao gerar Excel.');
                return;
            }

            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = filename || 'Bionexo_Export.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e: any) {
            setError(e.message || 'Erro ao exportar.');
        } finally {
            setExporting(false);
        }
    };

    // ── Derived ───────────────────────────────────────────────────────────────

    const fornecedores = Array.from(new Set(items.map(i => i.Fornecedor || '').filter(Boolean))).sort();

    const filtered = items.filter(it => {
        const matchStatus = filterStatus === 'Todos' || it.Status === filterStatus;
        const matchForn   = !filterFornecedor || it.Fornecedor === filterFornecedor;
        return matchStatus && matchForn;
    });

    const counts = {
        total:           items.length,
        recebido:        items.filter(i => i.Status === 'Recebido').length,
        recebidoParcial: items.filter(i => i.Status === 'Recebido Parcial').length,
        naoRecebido:     items.filter(i => i.Status === 'Nao Recebido').length,
        pendente:        items.filter(i => i.Status === 'Pendente').length,
    };

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="max-w-[1600px] mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Conversor Bionexo</h1>
                    <p className="text-slate-500 mt-1 text-sm">Importe o PDF de cotação do Bionexo, acompanhe o recebimento e exporte o Excel.</p>
                </div>
                {items.length > 0 && (
                    <div className="flex items-center gap-2">
                        <select
                            onChange={e => setAllStatus(e.target.value as StatusOpcao)}
                            defaultValue=""
                            className="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#001A72]"
                        >
                            <option value="" disabled>Marcar todos como...</option>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2 bg-[#001A72] text-white text-sm font-medium rounded-lg hover:bg-[#001250] transition-colors disabled:opacity-60"
                        >
                            {exporting
                                ? <RefreshCw className="w-4 h-4 animate-spin" />
                                : <Download className="w-4 h-4" />}
                            Exportar Excel
                        </button>
                    </div>
                )}
            </div>

            {/* Upload */}
            {items.length === 0 && (
                <div
                    className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${isDragging ? 'border-[#001A72] bg-blue-50' : 'border-slate-200 bg-white hover:border-[#001A72] hover:bg-slate-50'}`}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                    {loading ? (
                        <div className="flex flex-col items-center gap-3">
                            <RefreshCw className="w-10 h-10 text-[#001A72] animate-spin" />
                            <p className="text-slate-600 font-medium">Processando PDF...</p>
                            <p className="text-slate-400 text-sm">Isso pode levar alguns segundos</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <div className="bg-slate-100 p-4 rounded-full">
                                <Upload className="w-8 h-8 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-slate-700 font-medium">Arraste o PDF aqui ou clique para selecionar</p>
                                <p className="text-slate-400 text-sm mt-1">Relatório de cotação exportado do Bionexo (.pdf)</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-700 font-medium text-sm">{error}</p>
                        {error.includes('indisponível') && (
                            <p className="text-red-500 text-xs mt-1">
                                Inicie o backend: <code className="bg-red-100 px-1 rounded">cd bionexo_api && python app.py</code>
                            </p>
                        )}
                    </div>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Stats + Filters */}
            {items.length > 0 && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                            { label: 'Total',            value: counts.total,           color: 'bg-slate-100 text-slate-700' },
                            { label: 'Recebido',         value: counts.recebido,        color: 'bg-green-100 text-green-700' },
                            { label: 'Recebido Parcial', value: counts.recebidoParcial, color: 'bg-yellow-100 text-yellow-700' },
                            { label: 'Não Recebido',     value: counts.naoRecebido,     color: 'bg-red-100 text-red-700' },
                            { label: 'Pendente',         value: counts.pendente,        color: 'bg-slate-100 text-slate-500' },
                        ].map(card => (
                            <div key={card.label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
                                <p className="text-xs text-slate-500">{card.label}</p>
                                <p className={`text-2xl font-bold mt-0.5 ${card.color.split(' ')[1]}`}>{card.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Filters + reset */}
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value as any)}
                            className="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#001A72]"
                        >
                            <option value="Todos">Todos os status</option>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {fornecedores.length > 1 && (
                            <select
                                value={filterFornecedor}
                                onChange={e => setFilterFornecedor(e.target.value)}
                                className="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#001A72]"
                            >
                                <option value="">Todos os fornecedores</option>
                                {fornecedores.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        )}
                        <span className="text-sm text-slate-400 ml-auto">
                            {filtered.length} de {items.length} itens
                        </span>
                        <button
                            onClick={() => { setItems([]); setFilename(''); setFilterStatus('Todos'); setFilterFornecedor(''); }}
                            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Novo arquivo
                        </button>
                    </div>
                </>
            )}

            {/* Table */}
            {filtered.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-sm">
                            <thead className="bg-[#001A72]">
                                <tr>
                                    {VISIBLE_COLS.map(col => (
                                        <th
                                            key={col.key}
                                            className={`px-4 py-3 text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap ${col.right ? 'text-right' : 'text-left'}`}
                                        >
                                            {col.label}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-xs font-bold text-white uppercase tracking-wider text-left whitespace-nowrap">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map((item, idx) => (
                                    <tr
                                        key={item._id}
                                        className={`transition-colors ${
                                            item.Status === 'Recebido'         ? 'bg-green-50/40' :
                                            item.Status === 'Recebido Parcial' ? 'bg-yellow-50/40' :
                                            item.Status === 'Nao Recebido'     ? 'bg-red-50/40' :
                                            idx % 2 === 0                      ? 'bg-white' : 'bg-slate-50/50'
                                        }`}
                                    >
                                        {VISIBLE_COLS.map(col => {
                                            const val = item[col.key];
                                            const isCurrency = col.key.includes('R$');
                                            return (
                                                <td
                                                    key={col.key}
                                                    className={`px-4 py-3 whitespace-nowrap max-w-[260px] truncate ${col.right ? 'text-right' : ''} ${col.mono ? 'font-mono' : ''} text-slate-700`}
                                                    title={String(val ?? '')}
                                                >
                                                    {isCurrency
                                                        ? fmtBrl(val as number)
                                                        : val != null && val !== '' ? String(val) : <span className="text-slate-300">—</span>
                                                    }
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-3">
                                            <StatusSelect
                                                value={item.Status}
                                                onChange={s => setStatus(item._id, s)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty state after filter */}
            {items.length > 0 && filtered.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-100 p-10 text-center text-slate-500 text-sm">
                    Nenhum item corresponde aos filtros selecionados.
                </div>
            )}
        </div>
    );
}

// ─── StatusSelect ──────────────────────────────────────────────────────────────

function StatusSelect({ value, onChange }: { value: StatusOpcao; onChange: (s: StatusOpcao) => void }) {
    return (
        <div className="relative inline-block">
            <select
                value={value}
                onChange={e => onChange(e.target.value as StatusOpcao)}
                className={`appearance-none pl-7 pr-7 py-1 text-xs font-semibold rounded-full cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-[#001A72] transition-colors ${STATUS_STYLE[value]}`}
            >
                {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
                {STATUS_ICON[value]}
            </span>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50" />
        </div>
    );
}
