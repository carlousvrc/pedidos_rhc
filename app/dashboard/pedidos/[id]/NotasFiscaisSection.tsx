'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Usuario } from '@/lib/auth';
import {
    FileText, Upload, RefreshCw, CheckCircle2, AlertTriangle,
    XCircle, X, ChevronDown, ChevronUp, Trash2,
} from 'lucide-react';
import ConfirmModal from '@/app/components/ConfirmModal';

// ── Types ──────────────────────────────────────────────────────────────────

interface PedidoItem {
    id: string;
    item_id: string;
    quantidade: number;
    quantidade_atendida: number;
    fornecedor?: string;
    valor_unitario?: number;
    itens: { codigo: string; nome: string };
}

interface NFeItem {
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
}

interface NFeData {
    numero: string;
    serie: string;
    chave_acesso: string;
    data_emissao: string;
    valor_total: number;
    fornecedor: { nome: string; cnpj: string };
    itens: NFeItem[];
}

interface NotaFiscal {
    id: string;
    pedido_id: string;
    numero: string;
    serie?: string;
    chave_acesso?: string;
    data_emissao?: string;
    valor_total?: number;
    fornecedor_nome?: string;
    fornecedor_cnpj?: string;
    status: string;
    created_at: string;
}

interface NFItem {
    id: string;
    nota_fiscal_id: string;
    pedido_item_id?: string;
    codigo: string;
    descricao: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    confronto: string;
}

interface MatchedItem extends NFeItem {
    pedido_item_id: string | null;
    pedido_item_codigo: string;
    pedido_item_nome: string;
    qtd_atendida: number;
    vlr_pedido: number;
    confronto: string;
}

interface Props {
    pedidoId: string;
    pedidoItems: PedidoItem[];
    status: string;
    currentUser: Usuario | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalizeCodigo(c: string): string {
    return c.replace(/^0+/, '').trim();
}

function fmtR$(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function confrontoBadge(c: string) {
    switch (c) {
        case 'conforme':
            return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3" />Conforme</span>;
        case 'divergente_qtd':
            return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700"><AlertTriangle className="w-3 h-3" />Qtd divergente</span>;
        case 'divergente_valor':
            return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700"><AlertTriangle className="w-3 h-3" />Valor divergente</span>;
        case 'nao_encontrado':
            return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 text-red-600"><XCircle className="w-3 h-3" />Não encontrado</span>;
        case 'item_extra':
            return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600">Item extra na NF</span>;
        default:
            return <span className="text-[10px] text-slate-400">—</span>;
    }
}

function nfStatusBadge(s: string) {
    switch (s) {
        case 'conferida':  return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-700">Conferida</span>;
        case 'divergente': return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700">Divergente</span>;
        default:           return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600">Pendente</span>;
    }
}

// ── Component ───────────────────────────────────────────────────────────────

export default function NotasFiscaisSection({ pedidoId, pedidoItems, status, currentUser }: Props) {
    const [notas, setNotas] = useState<NotaFiscal[]>([]);
    const [nfItensMap, setNfItensMap] = useState<Record<string, NFItem[]>>({});
    const [loading, setLoading] = useState(true);
    const [expandedNf, setExpandedNf] = useState<string | null>(null);

    // Upload state
    const [xmlFile, setXmlFile] = useState<File | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [parsedNfe, setParsedNfe] = useState<NFeData | null>(null);
    const [matchedItems, setMatchedItems] = useState<MatchedItem[]>([]);
    const [parsing, setParsing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [parseError, setParseError] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<NotaFiscal | null>(null);

    const xmlRef = useRef<HTMLInputElement>(null);
    const pdfRef = useRef<HTMLInputElement>(null);

    const canUpload = currentUser?.role === 'comprador' || currentUser?.role === 'admin';

    // ── Load data ───────────────────────────────────────────────────────

    useEffect(() => { loadNotas(); }, [pedidoId]);

    async function loadNotas() {
        setLoading(true);
        const { data: nfs } = await supabase
            .from('notas_fiscais')
            .select('*')
            .eq('pedido_id', pedidoId)
            .order('created_at', { ascending: false });
        setNotas(nfs || []);

        // Load items for each NF
        if (nfs && nfs.length > 0) {
            const ids = nfs.map((n: any) => n.id);
            const { data: items } = await supabase
                .from('notas_fiscais_itens')
                .select('*')
                .in('nota_fiscal_id', ids);
            const map: Record<string, NFItem[]> = {};
            for (const it of (items || [])) {
                if (!map[it.nota_fiscal_id]) map[it.nota_fiscal_id] = [];
                map[it.nota_fiscal_id].push(it);
            }
            setNfItensMap(map);
        }
        setLoading(false);
    }

    // ── XML parsing ─────────────────────────────────────────────────────

    async function handleXmlSelected(file: File) {
        setXmlFile(file);
        setParsedNfe(null);
        setMatchedItems([]);
        setParseError('');
        setParsing(true);

        try {
            const formData = new FormData();
            formData.append('xml', file);
            const res = await fetch('/api/nfe/parse', { method: 'POST', body: formData });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro ao processar XML.');

            setParsedNfe(json as NFeData);
            runMatching(json as NFeData);
        } catch (err: any) {
            setParseError(err.message || 'Erro ao processar XML.');
        } finally {
            setParsing(false);
        }
    }

    // ── Matching logic ──────────────────────────────────────────────────

    function runMatching(nfe: NFeData) {
        const results: MatchedItem[] = [];

        for (const nfItem of nfe.itens) {
            const nfCod = normalizeCodigo(nfItem.codigo);

            // Try to match by codigo
            const match = pedidoItems.find(pi =>
                normalizeCodigo(pi.itens.codigo) === nfCod
            );

            if (!match) {
                results.push({
                    ...nfItem,
                    pedido_item_id: null,
                    pedido_item_codigo: '',
                    pedido_item_nome: '',
                    qtd_atendida: 0,
                    vlr_pedido: 0,
                    confronto: 'nao_encontrado',
                });
                continue;
            }

            // Compare values
            const qtyMatch = Math.abs(nfItem.quantidade - match.quantidade_atendida) < 0.01;
            const vlrMatch = !match.valor_unitario || Math.abs(nfItem.valor_unitario - match.valor_unitario) < 0.02;

            let confronto = 'conforme';
            if (!qtyMatch) confronto = 'divergente_qtd';
            else if (!vlrMatch) confronto = 'divergente_valor';

            results.push({
                ...nfItem,
                pedido_item_id: match.id,
                pedido_item_codigo: match.itens.codigo,
                pedido_item_nome: match.itens.nome,
                qtd_atendida: match.quantidade_atendida,
                vlr_pedido: match.valor_unitario || 0,
                confronto,
            });
        }

        setMatchedItems(results);
    }

    // ── Save NF ─────────────────────────────────────────────────────────

    async function handleSave() {
        if (!parsedNfe || !xmlFile) return;
        setSaving(true);

        try {
            // Determine overall status
            const hasDivergencia = matchedItems.some(i => i.confronto !== 'conforme');
            const nfStatus = hasDivergencia ? 'divergente' : 'conferida';

            // Insert NF record
            const { data: nf, error: nfErr } = await supabase
                .from('notas_fiscais')
                .insert({
                    pedido_id: pedidoId,
                    numero: parsedNfe.numero,
                    serie: parsedNfe.serie,
                    chave_acesso: parsedNfe.chave_acesso || null,
                    data_emissao: parsedNfe.data_emissao || null,
                    valor_total: parsedNfe.valor_total,
                    fornecedor_nome: parsedNfe.fornecedor.nome,
                    fornecedor_cnpj: parsedNfe.fornecedor.cnpj,
                    status: nfStatus,
                    uploaded_by: currentUser?.id || null,
                })
                .select()
                .single();

            if (nfErr) throw nfErr;

            // Insert NF items with confrontation
            const nfItens = matchedItems.map(m => ({
                nota_fiscal_id: nf.id,
                pedido_item_id: m.pedido_item_id || null,
                codigo: m.codigo,
                descricao: m.descricao,
                ncm: m.ncm || null,
                cfop: m.cfop || null,
                unidade: m.unidade || null,
                quantidade: m.quantidade,
                valor_unitario: m.valor_unitario,
                valor_total: m.valor_total,
                confronto: m.confronto,
            }));

            if (nfItens.length > 0) {
                await supabase.from('notas_fiscais_itens').insert(nfItens);
            }

            // Upload files to Supabase Storage
            try {
                const basePath = `${pedidoId}/${nf.id}`;
                await supabase.storage.from('notas-fiscais').upload(`${basePath}/${xmlFile.name}`, xmlFile);
                await supabase.from('notas_fiscais').update({ xml_path: `${basePath}/${xmlFile.name}` }).eq('id', nf.id);

                if (pdfFile) {
                    await supabase.storage.from('notas-fiscais').upload(`${basePath}/${pdfFile.name}`, pdfFile);
                    await supabase.from('notas_fiscais').update({ pdf_path: `${basePath}/${pdfFile.name}` }).eq('id', nf.id);
                }
            } catch {
                // Storage might not be configured — continue without file storage
            }

            // Reset form
            setXmlFile(null);
            setPdfFile(null);
            setParsedNfe(null);
            setMatchedItems([]);
            if (xmlRef.current) xmlRef.current.value = '';
            if (pdfRef.current) pdfRef.current.value = '';

            await loadNotas();
        } catch (err: any) {
            setParseError(err.message || 'Erro ao salvar nota fiscal.');
        } finally {
            setSaving(false);
        }
    }

    // ── Delete NF ───────────────────────────────────────────────────────

    async function handleDelete() {
        if (!deleteTarget) return;
        await supabase.from('notas_fiscais').delete().eq('id', deleteTarget.id);
        setDeleteTarget(null);
        await loadNotas();
    }

    // ── Render ──────────────────────────────────────────────────────────

    const conformes = (items: NFItem[]) => items.filter(i => i.confronto === 'conforme').length;
    const divergentes = (items: NFItem[]) => items.filter(i => i.confronto !== 'conforme').length;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-indigo-700" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">Notas Fiscais</h2>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            {notas.length > 0 ? `${notas.length} nota(s) anexada(s)` : 'Nenhuma nota fiscal anexada'}
                        </p>
                    </div>
                </div>
                {loading && <RefreshCw className="w-4 h-4 text-slate-300 animate-spin" />}
            </div>

            {/* ── NFs existentes ── */}
            {notas.length > 0 && (
                <div className="divide-y divide-slate-100">
                    {notas.map(nf => {
                        const items = nfItensMap[nf.id] || [];
                        const isExpanded = expandedNf === nf.id;
                        return (
                            <div key={nf.id}>
                                <div
                                    className="px-6 py-3 flex items-center gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                                    onClick={() => setExpandedNf(isExpanded ? null : nf.id)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-slate-800">NF #{nf.numero}</span>
                                            {nf.serie && <span className="text-[11px] text-slate-400">Série {nf.serie}</span>}
                                            {nfStatusBadge(nf.status)}
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400">
                                            {nf.fornecedor_nome && <span>{nf.fornecedor_nome}</span>}
                                            {nf.data_emissao && <span>{new Date(nf.data_emissao).toLocaleDateString('pt-BR')}</span>}
                                            {nf.valor_total != null && <span className="font-medium text-slate-600">{fmtR$(nf.valor_total)}</span>}
                                            <span>{items.length} item(s)</span>
                                            {items.length > 0 && (
                                                <>
                                                    <span className="text-green-600">{conformes(items)} conforme(s)</span>
                                                    {divergentes(items) > 0 && <span className="text-amber-600">{divergentes(items)} divergente(s)</span>}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {canUpload && (
                                            <button
                                                onClick={e => { e.stopPropagation(); setDeleteTarget(nf); }}
                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="Excluir NF"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                    </div>
                                </div>

                                {/* Expanded: item confrontation */}
                                {isExpanded && items.length > 0 && (
                                    <div className="border-t border-slate-100 overflow-x-auto">
                                        <table className="min-w-full text-xs">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left font-bold text-slate-500">Código NF</th>
                                                    <th className="px-4 py-2 text-left font-bold text-slate-500">Descrição NF</th>
                                                    <th className="px-4 py-2 text-right font-bold text-slate-500">Qtd NF</th>
                                                    <th className="px-4 py-2 text-right font-bold text-slate-500">Vlr Unit. NF</th>
                                                    <th className="px-4 py-2 text-right font-bold text-slate-500">Vlr Total NF</th>
                                                    <th className="px-4 py-2 text-left font-bold text-slate-500">Resultado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {items.map(it => (
                                                    <tr key={it.id} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-2 font-mono text-slate-600">{it.codigo}</td>
                                                        <td className="px-4 py-2 text-slate-800 max-w-[200px] truncate">{it.descricao}</td>
                                                        <td className="px-4 py-2 text-right font-semibold text-slate-700">{it.quantidade}</td>
                                                        <td className="px-4 py-2 text-right text-slate-600">{fmtR$(it.valor_unitario)}</td>
                                                        <td className="px-4 py-2 text-right font-semibold text-slate-700">{fmtR$(it.valor_total)}</td>
                                                        <td className="px-4 py-2">{confrontoBadge(it.confronto)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Upload area ── */}
            {canUpload && (status === 'Realizado' || status === 'Recebido') && (
                <div className="px-6 py-5 border-t border-slate-100 space-y-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Anexar Nota Fiscal</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* XML */}
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">XML da NFe *</label>
                            <div
                                className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${xmlFile ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}
                                onClick={() => xmlRef.current?.click()}
                            >
                                {parsing ? (
                                    <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin mx-auto" />
                                ) : xmlFile ? (
                                    <div className="flex items-center justify-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                        <span className="text-xs font-medium text-indigo-700 truncate">{xmlFile.name}</span>
                                    </div>
                                ) : (
                                    <div>
                                        <Upload className="w-4 h-4 mx-auto mb-1 text-slate-300" />
                                        <p className="text-[11px] text-slate-400">Selecionar XML</p>
                                    </div>
                                )}
                            </div>
                            <input ref={xmlRef} type="file" accept=".xml" className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleXmlSelected(f); }} />
                        </div>

                        {/* PDF */}
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">PDF da DANFE (opcional)</label>
                            <div
                                className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${pdfFile ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}
                                onClick={() => pdfRef.current?.click()}
                            >
                                {pdfFile ? (
                                    <div className="flex items-center justify-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                        <span className="text-xs font-medium text-indigo-700 truncate">{pdfFile.name}</span>
                                    </div>
                                ) : (
                                    <div>
                                        <Upload className="w-4 h-4 mx-auto mb-1 text-slate-300" />
                                        <p className="text-[11px] text-slate-400">Selecionar PDF</p>
                                    </div>
                                )}
                            </div>
                            <input ref={pdfRef} type="file" accept=".pdf" className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) setPdfFile(f); }} />
                        </div>
                    </div>

                    {parseError && <p className="text-xs text-red-600">{parseError}</p>}

                    {/* ── Preview / Confrontation ── */}
                    {parsedNfe && matchedItems.length > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-indigo-900">NF #{parsedNfe.numero} — {parsedNfe.fornecedor.nome}</p>
                                        <p className="text-[11px] text-indigo-600 mt-0.5">
                                            {fmtR$(parsedNfe.valor_total)} · {parsedNfe.itens.length} item(s)
                                            {parsedNfe.fornecedor.cnpj && ` · CNPJ: ${parsedNfe.fornecedor.cnpj}`}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                            {matchedItems.filter(i => i.confronto === 'conforme').length} conforme
                                        </span>
                                        {matchedItems.some(i => i.confronto !== 'conforme') && (
                                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                                {matchedItems.filter(i => i.confronto !== 'conforme').length} divergente(s)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto max-h-72">
                                <table className="min-w-full text-xs">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500">Código NF</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500">Descrição NF</th>
                                            <th className="px-3 py-2 text-right font-bold text-slate-500">Qtd NF</th>
                                            <th className="px-3 py-2 text-right font-bold text-slate-500">Vlr Unit. NF</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500">Item Pedido</th>
                                            <th className="px-3 py-2 text-right font-bold text-slate-500">Qtd Atendida</th>
                                            <th className="px-3 py-2 text-right font-bold text-slate-500">Vlr Pedido</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500">Resultado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {matchedItems.map((m, i) => (
                                            <tr key={i} className={
                                                m.confronto === 'conforme' ? 'bg-green-50/30' :
                                                m.confronto === 'nao_encontrado' ? 'bg-red-50/30' :
                                                'bg-amber-50/30'
                                            }>
                                                <td className="px-3 py-2 font-mono text-slate-600">{m.codigo}</td>
                                                <td className="px-3 py-2 text-slate-800 max-w-[180px] truncate">{m.descricao}</td>
                                                <td className="px-3 py-2 text-right font-semibold">{m.quantidade}</td>
                                                <td className="px-3 py-2 text-right text-slate-600">{fmtR$(m.valor_unitario)}</td>
                                                <td className="px-3 py-2 text-slate-600 max-w-[180px] truncate">{m.pedido_item_nome || '—'}</td>
                                                <td className="px-3 py-2 text-right font-semibold">{m.pedido_item_id ? m.qtd_atendida : '—'}</td>
                                                <td className="px-3 py-2 text-right text-slate-600">{m.vlr_pedido ? fmtR$(m.vlr_pedido) : '—'}</td>
                                                <td className="px-3 py-2">{confrontoBadge(m.confronto)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                                <button
                                    onClick={() => { setParsedNfe(null); setMatchedItems([]); setXmlFile(null); if (xmlRef.current) xmlRef.current.value = ''; }}
                                    className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                    {saving ? 'Salvando...' : 'Confirmar e Salvar NF'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Delete confirmation */}
            {deleteTarget && (
                <ConfirmModal
                    title="Excluir nota fiscal"
                    description={`A NF #${deleteTarget.numero} será excluída permanentemente.`}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}
