'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Download, RefreshCw, CheckCircle2, Clock, XCircle, AlertCircle, ChevronDown, FileText, Loader2 } from 'lucide-react';

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
    _id: string;
    _source: string; // nome do arquivo de origem
}

interface FileProgress {
    name: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    count?: number;
    error?: string;
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
    { key: 'Pedido de Cotacao',     label: 'Pedido',       mono: true },
    { key: 'Data Emissao',          label: 'Emissão' },
    { key: 'Unidade Hospitalar',    label: 'Unidade' },
    { key: 'Fornecedor',            label: 'Fornecedor' },
    { key: 'Produto',               label: 'Produto' },
    { key: 'Codigo',                label: 'Código',       mono: true },
    { key: 'Fabricante',            label: 'Fabricante' },
    { key: 'Embalagem',             label: 'Embalagem' },
    { key: 'Quantidade',            label: 'Qtd',          right: true },
    { key: 'Unidade',               label: 'Un.' },
    { key: 'Preco Unitario (R$)',    label: 'Preço Unit.',  right: true },
    { key: 'Valor Total (R$)',       label: 'Total',        right: true },
    { key: 'Preco Referencia (R$)',  label: 'Ref.',         right: true },
];

function fmtBrl(val: number | null | undefined) {
    if (val == null) return '—';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BionexoPage() {
    const [items, setItems]               = useState<BionexoItem[]>([]);
    const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging]     = useState(false);
    const [error, setError]               = useState<string | null>(null);

    const [filterStatus, setFilterStatus]       = useState<StatusOpcao | 'Todos'>('Todos');
    const [filterFornecedor, setFilterFornecedor] = useState('');
    const [filterSource, setFilterSource]       = useState('');
    const [exporting, setExporting]             = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── File processing ───────────────────────────────────────────────────────

    const processFiles = useCallback(async (files: File[]) => {
        const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
        if (!pdfs.length) { setError('Selecione pelo menos um arquivo PDF.'); return; }

        setIsProcessing(true);
        setError(null);
        setItems([]);

        const progress: FileProgress[] = pdfs.map(f => ({ name: f.name, status: 'pending' }));
        setFileProgress(progress);

        const allItems: BionexoItem[] = [];
        let globalIdx = 0;

        for (let i = 0; i < pdfs.length; i++) {
            const file = pdfs[i];

            // mark as processing
            setFileProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'processing' } : p));

            const formData = new FormData();
            formData.append('pdf', file);

            try {
                const res  = await fetch('/api/bionexo/convert', { method: 'POST', body: formData });
                const json = await res.json();

                if (!res.ok) {
                    setFileProgress(prev => prev.map((p, idx) =>
                        idx === i ? { ...p, status: 'error', error: json.error || 'Erro ao converter' } : p
                    ));
                    continue;
                }

                const mapped: BionexoItem[] = (json.data as any[]).map(row => ({
                    ...row,
                    Status:  'Pendente' as StatusOpcao,
                    _id:     `r${globalIdx++}`,
                    _source: file.name,
                }));

                allItems.push(...mapped);

                setFileProgress(prev => prev.map((p, idx) =>
                    idx === i ? { ...p, status: 'done', count: mapped.length } : p
                ));
            } catch (e: any) {
                const msg = e?.message || 'Erro de conexão';
                setFileProgress(prev => prev.map((p, idx) =>
                    idx === i ? { ...p, status: 'error', error: msg } : p
                ));
                if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
                    setError('Serviço Bionexo indisponível. Verifique se o backend está rodando.');
                    break;
                }
            }
        }

        setItems(allItems);
        setIsProcessing(false);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) processFiles(Array.from(e.target.files));
        e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) processFiles(Array.from(e.dataTransfer.files));
    };

    const handleReset = () => {
        setItems([]);
        setFileProgress([]);
        setError(null);
        setFilterStatus('Todos');
        setFilterFornecedor('');
        setFilterSource('');
    };

    // ── Status ────────────────────────────────────────────────────────────────

    const setStatus = (id: string, status: StatusOpcao) =>
        setItems(prev => prev.map(it => it._id === id ? { ...it, Status: status } : it));

    const setAllStatus = (status: StatusOpcao) =>
        setItems(prev => prev.map(it => ({ ...it, Status: status })));

    // ── Export ────────────────────────────────────────────────────────────────

    const handleExport = async () => {
        if (!items.length) return;
        setExporting(true);
        try {
            const exportData = items.map(({ _id, _source, ...rest }) => rest);
            const sources    = Array.from(new Set(items.map(i => i._source)));
            const filename   = sources.length === 1
                ? sources[0].replace(/\.pdf$/i, '') + '.xlsx'
                : 'Consolidado_Bionexo.xlsx';

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
            a.href = url; a.download = filename;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e: any) {
            setError(e.message || 'Erro ao exportar.');
        } finally {
            setExporting(false);
        }
    };

    // ── Derived ───────────────────────────────────────────────────────────────

    const sources      = Array.from(new Set(items.map(i => i._source))).sort();
    const fornecedores = Array.from(new Set(items.map(i => i.Fornecedor || '').filter(Boolean))).sort();

    const filtered = items.filter(it => {
        const matchStatus = filterStatus === 'Todos' || it.Status === filterStatus;
        const matchForn   = !filterFornecedor || it.Fornecedor === filterFornecedor;
        const matchSource = !filterSource || it._source === filterSource;
        return matchStatus && matchForn && matchSource;
    });

    const counts = {
        total:           items.length,
        recebido:        items.filter(i => i.Status === 'Recebido').length,
        recebidoParcial: items.filter(i => i.Status === 'Recebido Parcial').length,
        naoRecebido:     items.filter(i => i.Status === 'Nao Recebido').length,
        pendente:        items.filter(i => i.Status === 'Pendente').length,
    };

    const showUpload  = items.length === 0 && !isProcessing;
    const showResults = items.length > 0;

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="max-w-[1600px] mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Conversor Bionexo</h1>
                    <p className="text-slate-500 mt-1 text-sm">Importe um ou mais PDFs de cotação, acompanhe o recebimento e exporte o Excel.</p>
                </div>
                {showResults && (
                    <div className="flex items-center gap-2 flex-wrap">
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
                            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {sources.length > 1 ? 'Exportar Consolidado' : 'Exportar Excel'}
                        </button>
                    </div>
                )}
            </div>

            {/* Upload area — visible when no results yet */}
            {showUpload && (
                <div
                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${isDragging ? 'border-[#001A72] bg-blue-50' : 'border-slate-200 bg-white hover:border-[#001A72] hover:bg-slate-50'}`}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input ref={fileInputRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleFileChange} />
                    <div className="flex flex-col items-center gap-3">
                        <div className="bg-slate-100 p-4 rounded-full">
                            <Upload className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                            <p className="text-slate-700 font-medium">Arraste os PDFs aqui ou clique para selecionar</p>
                            <p className="text-slate-400 text-sm mt-1">Suporta múltiplos arquivos — relatórios de cotação exportados do Bionexo (.pdf)</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Processing progress */}
            {(isProcessing || (fileProgress.length > 0 && items.length === 0 && !showUpload)) && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                        <Loader2 className="w-5 h-5 text-[#001A72] animate-spin" />
                        <h2 className="font-semibold text-slate-700">
                            Processando {fileProgress.length} arquivo{fileProgress.length > 1 ? 's' : ''}...
                        </h2>
                    </div>
                    {fileProgress.map((fp, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                            <FileProgressIcon status={fp.status} />
                            <span className="text-sm text-slate-700 flex-1 truncate">{fp.name}</span>
                            {fp.status === 'done'  && <span className="text-xs text-green-600 font-medium shrink-0">{fp.count} itens</span>}
                            {fp.status === 'error' && <span className="text-xs text-red-500 shrink-0">{fp.error}</span>}
                        </div>
                    ))}
                </div>
            )}

            {/* File progress summary (after processing, above table) */}
            {showResults && fileProgress.length > 1 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">
                            {fileProgress.length} arquivos processados
                        </span>
                        <button onClick={handleReset} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                            <RefreshCw className="w-3 h-3" /> Nova seleção
                        </button>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {fileProgress.map((fp, i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                                <FileProgressIcon status={fp.status} />
                                <span className="text-sm text-slate-600 flex-1 truncate">{fp.name}</span>
                                {fp.status === 'done'  && <span className="text-xs text-green-600 font-medium">{fp.count} itens</span>}
                                {fp.status === 'error' && <span className="text-xs text-red-500">{fp.error}</span>}
                            </div>
                        ))}
                    </div>
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

            {/* Stats Cards */}
            {showResults && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                        { label: 'Total',            value: counts.total,           cls: 'text-slate-700' },
                        { label: 'Recebido',         value: counts.recebido,        cls: 'text-green-700' },
                        { label: 'Recebido Parcial', value: counts.recebidoParcial, cls: 'text-yellow-600' },
                        { label: 'Não Recebido',     value: counts.naoRecebido,     cls: 'text-red-600' },
                        { label: 'Pendente',         value: counts.pendente,        cls: 'text-slate-400' },
                    ].map(card => (
                        <div key={card.label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
                            <p className="text-xs text-slate-500">{card.label}</p>
                            <p className={`text-2xl font-bold mt-0.5 ${card.cls}`}>{card.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            {showResults && (
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value as any)}
                        className="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#001A72]"
                    >
                        <option value="Todos">Todos os status</option>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    {sources.length > 1 && (
                        <select
                            value={filterSource}
                            onChange={e => setFilterSource(e.target.value)}
                            className="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#001A72]"
                        >
                            <option value="">Todos os arquivos</option>
                            {sources.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    )}

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

                    {fileProgress.length === 1 && (
                        <button onClick={handleReset} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 transition-colors">
                            <RefreshCw className="w-3.5 h-3.5" /> Nova seleção
                        </button>
                    )}
                </div>
            )}

            {/* Table */}
            {filtered.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-sm">
                            <thead className="bg-[#001A72]">
                                <tr>
                                    {sources.length > 1 && (
                                        <th className="px-4 py-3 text-xs font-bold text-white uppercase tracking-wider text-left whitespace-nowrap">
                                            Arquivo
                                        </th>
                                    )}
                                    {VISIBLE_COLS.map(col => (
                                        <th key={col.key} className={`px-4 py-3 text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap ${col.right ? 'text-right' : 'text-left'}`}>
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
                                        {sources.length > 1 && (
                                            <td className="px-4 py-3 whitespace-nowrap max-w-[160px] truncate text-xs text-slate-400 font-mono" title={item._source}>
                                                {item._source.replace(/\.pdf$/i, '')}
                                            </td>
                                        )}
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
                                            <StatusSelect value={item.Status} onChange={s => setStatus(item._id, s)} />
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function FileProgressIcon({ status }: { status: FileProgress['status'] }) {
    if (status === 'pending')    return <Clock className="w-4 h-4 text-slate-400 shrink-0" />;
    if (status === 'processing') return <Loader2 className="w-4 h-4 text-[#001A72] animate-spin shrink-0" />;
    if (status === 'done')       return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
    return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
}

function StatusSelect({ value, onChange }: { value: StatusOpcao; onChange: (s: StatusOpcao) => void }) {
    return (
        <div className="relative inline-block">
            <select
                value={value}
                onChange={e => onChange(e.target.value as StatusOpcao)}
                className={`appearance-none pl-7 pr-7 py-1 text-xs font-semibold rounded-full cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-[#001A72] transition-colors ${STATUS_STYLE[value]}`}
            >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
                {STATUS_ICON[value]}
            </span>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50" />
        </div>
    );
}
