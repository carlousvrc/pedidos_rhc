'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    HelpCircle, X, Lightbulb, BookOpen, ArrowRight,
    MessageCircle, ChevronRight, ChevronDown, Info,
} from 'lucide-react';
import { contextualGuides, docSections, type ContextualGuide } from '@/lib/docsContent';

function getGuideForPath(pathname: string): ContextualGuide | null {
    const exact = contextualGuides.find(g => g.urlPattern === pathname);
    if (exact) return exact;
    return contextualGuides
        .filter(g => pathname.startsWith(g.urlPattern) && g.urlPattern !== '/')
        .sort((a, b) => b.urlPattern.length - a.urlPattern.length)[0] || null;
}

function getDocSectionForPath(pathname: string) {
    return docSections.find(s => s.urlPatterns.some(p => {
        if (p === '/') return pathname === '/';
        return pathname.startsWith(p);
    })) || null;
}

type Tab = 'como' | 'dicas' | 'faq';

export default function AssistantWidget() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<Tab>('como');
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const guide = getGuideForPath(pathname);
    const docSection = getDocSectionForPath(pathname);

    useEffect(() => {
        setTab('como');
        setOpenFaq(null);
    }, [pathname]);

    if (pathname === '/login') return null;

    const hasFaq = (docSection?.faq?.length ?? 0) > 0;

    return (
        <>
            {/* Floating button */}
            <button
                onClick={() => setOpen(o => !o)}
                className={`fixed bottom-6 right-6 z-40 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
                    open
                        ? 'bg-slate-700 hover:bg-slate-800'
                        : 'bg-[#001A72] hover:bg-[#001250] hover:scale-105'
                }`}
                title="Abrir assistente de ajuda"
                style={{ width: 52, height: 52 }}
            >
                {open
                    ? <X className="w-5 h-5 text-white" />
                    : <HelpCircle className="w-5 h-5 text-white" />}
            </button>

            {/* Panel */}
            {open && (
                <div className="fixed bottom-[72px] right-6 z-40 w-[340px] max-h-[560px] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">

                    {/* Header */}
                    <div className="bg-[#001A72] px-4 py-3.5 flex items-center gap-3">
                        <div className="p-1.5 bg-white/15 rounded-lg">
                            <MessageCircle className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white">Assistente RHC</p>
                            <p className="text-[11px] text-blue-300 truncate">
                                {guide ? guide.title : 'Central de ajuda'}
                            </p>
                        </div>
                        <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-100 bg-slate-50">
                        <button
                            onClick={() => setTab('como')}
                            className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                                tab === 'como'
                                    ? 'border-[#001A72] text-[#001A72] bg-white'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            Como usar
                        </button>
                        <button
                            onClick={() => setTab('dicas')}
                            className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                                tab === 'dicas'
                                    ? 'border-amber-500 text-amber-600 bg-white'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            Dicas
                        </button>
                        {hasFaq && (
                            <button
                                onClick={() => setTab('faq')}
                                className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                                    tab === 'faq'
                                        ? 'border-slate-600 text-slate-700 bg-white'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Dúvidas
                            </button>
                        )}
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">

                        {!guide && (
                            <div className="text-center py-8">
                                <BookOpen className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                                <p className="text-sm font-semibold text-slate-500">Navegue pelo sistema</p>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                    O assistente mostra orientações específicas conforme a seção que você estiver usando.
                                </p>
                            </div>
                        )}

                        {/* Como usar — passos informativos */}
                        {guide && tab === 'como' && (
                            <div className="space-y-2">
                                {docSection?.shortDescription && (
                                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 mb-3">
                                        <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-blue-800 leading-snug">{docSection.shortDescription}</p>
                                    </div>
                                )}
                                {guide.mainWorkflow.map((wf, i) => (
                                    <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="w-5 h-5 rounded-full bg-[#001A72] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                            {wf.step}
                                        </span>
                                        <span className="text-xs text-slate-700 leading-snug">{wf.action}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Dicas */}
                        {tab === 'dicas' && (
                            <ul className="space-y-2">
                                {(guide?.quickTips ?? docSection?.tips ?? []).map((tip, i) => (
                                    <li key={i} className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                                        <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                        <span className="text-xs text-amber-800 leading-snug">{tip}</span>
                                    </li>
                                ))}
                                {(guide?.quickTips ?? docSection?.tips ?? []).length === 0 && (
                                    <p className="text-xs text-slate-400 text-center py-6">Nenhuma dica disponível para esta seção.</p>
                                )}
                            </ul>
                        )}

                        {/* FAQ */}
                        {tab === 'faq' && hasFaq && (
                            <div className="space-y-2">
                                {docSection!.faq.map((item, i) => (
                                    <div key={i} className="border border-slate-100 rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                                        >
                                            <span className="text-xs font-semibold text-slate-700 leading-snug pr-2">{item.question}</span>
                                            {openFaq === i
                                                ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                                        </button>
                                        {openFaq === i && (
                                            <div className="px-3 pb-3 pt-1 bg-slate-50 border-t border-slate-100">
                                                <p className="text-xs text-slate-600 leading-relaxed">{item.answer}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Precisa de mais detalhes?</span>
                        <Link
                            href={`/dashboard/ajuda${docSection ? `#${docSection.id}` : ''}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-1 text-xs font-semibold text-[#001A72] hover:text-[#001250] transition-colors"
                        >
                            Documentação completa
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            )}
        </>
    );
}
