'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    ChevronRight, Search, BookOpen, LayoutDashboard, ShoppingCart,
    ArrowRightLeft, BarChart3, History, FileSpreadsheet, Package,
    Users, CheckCircle2, AlertTriangle, Lightbulb, HelpCircle,
    ChevronDown, ChevronUp, X, Info,
} from 'lucide-react';
import { docSections, DOC_VERSION, DOC_UPDATED, type DocSection } from '@/lib/docsContent';

const ICON_MAP: Record<string, React.ElementType> = {
    LayoutDashboard, ShoppingCart, ArrowRightLeft, BarChart3,
    History, FileSpreadsheet, Package, Users,
};

function SectionIcon({ name, className }: { name: string; className?: string }) {
    const Icon = ICON_MAP[name] || BookOpen;
    return <Icon className={className} />;
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-slate-100 rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
            >
                <span className="text-sm font-semibold text-slate-700">{question}</span>
                {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
            </button>
            {open && (
                <div className="px-4 pb-4 pt-0">
                    <p className="text-sm text-slate-600 leading-relaxed">{answer}</p>
                </div>
            )}
        </div>
    );
}

function SectionContent({ section }: { section: DocSection }) {
    return (
        <div className="space-y-8">
            {/* Descrição */}
            <div>
                <div className="prose prose-sm max-w-none">
                    {section.fullDescription.split('\n\n').map((para, i) => {
                        if (para.startsWith('**') || para.includes('**')) {
                            // Parágrafos com bold
                            const parts = para.split(/\*\*(.*?)\*\*/g);
                            return (
                                <p key={i} className="text-sm text-slate-600 leading-relaxed mb-3">
                                    {parts.map((part, j) =>
                                        j % 2 === 1
                                            ? <strong key={j} className="font-semibold text-slate-800">{part}</strong>
                                            : part
                                    )}
                                </p>
                            );
                        }
                        return <p key={i} className="text-sm text-slate-600 leading-relaxed mb-3">{para}</p>;
                    })}
                </div>
                {section.roles && (
                    <div className="flex items-center gap-2 flex-wrap mt-4">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Perfis:</span>
                        {section.roles.map(r => (
                            <span key={r} className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-[#001A72]/10 text-[#001A72]">{r}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* Passo a passo */}
            <div>
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Passo a passo
                </h3>
                <ol className="space-y-3">
                    {section.steps.map((step, i) => (
                        <li key={i} className="flex gap-4">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#001A72] text-white text-xs font-bold flex items-center justify-center mt-0.5">
                                {i + 1}
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-slate-800 leading-snug">{step.title}</p>
                                <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{step.description}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </div>

            {/* Dicas */}
            {section.tips.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Lightbulb className="w-3.5 h-3.5" />
                        Dicas úteis
                    </h3>
                    <ul className="space-y-2">
                        {section.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                {tip}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* FAQ */}
            {section.faq.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-[#001A72]" />
                        Perguntas frequentes
                    </h3>
                    <div className="space-y-2">
                        {section.faq.map((f, i) => (
                            <FaqItem key={i} question={f.question} answer={f.answer} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AjudaPage() {
    const [activeSection, setActiveSection] = useState(docSections[0].id);
    const [search, setSearch] = useState('');

    const currentSection = docSections.find(s => s.id === activeSection) || docSections[0];

    const searchResults = useMemo(() => {
        if (!search.trim()) return [];
        const q = search.toLowerCase();
        const results: { section: DocSection; type: string; text: string }[] = [];
        for (const section of docSections) {
            if (section.title.toLowerCase().includes(q) || section.shortDescription.toLowerCase().includes(q)) {
                results.push({ section, type: 'Módulo', text: section.shortDescription });
            }
            for (const step of section.steps) {
                if (step.title.toLowerCase().includes(q) || step.description.toLowerCase().includes(q)) {
                    results.push({ section, type: 'Passo a passo', text: step.title + ' — ' + step.description });
                }
            }
            for (const f of section.faq) {
                if (f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)) {
                    results.push({ section, type: 'FAQ', text: f.question });
                }
            }
        }
        return results.slice(0, 8);
    }, [search]);

    return (
        <div className="max-w-[1200px] mx-auto p-4 sm:p-6 space-y-5">

            {/* Header */}
            <div>
                <div className="flex items-center text-xs text-slate-400 gap-1.5 mb-2">
                    <Link href="/" className="hover:text-[#001A72] transition-colors">Dashboard</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-700 font-medium">Ajuda & Documentação</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#001A72] flex items-center justify-center shadow-sm">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Ajuda & Documentação</h1>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Manual de utilização do sistema RHC Pedidos
                                <span className="ml-2 text-slate-300">· v{DOC_VERSION} · Atualizado em {new Date(DOC_UPDATED + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search bar */}
            <div className="relative">
                <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Pesquisar na documentação..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 text-sm bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#001A72]/20 focus:border-[#001A72] transition-all"
                />
                {search && (
                    <button onClick={() => setSearch('')} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                    </button>
                )}

                {/* Search results dropdown */}
                {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                        {searchResults.map((r, i) => (
                            <button
                                key={i}
                                onClick={() => { setActiveSection(r.section.id); setSearch(''); }}
                                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                            >
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 mt-0.5 shrink-0">{r.type}</span>
                                <div className="min-w-0">
                                    <span className="text-xs font-semibold text-[#001A72]">{r.section.title}</span>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">{r.text}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Main layout */}
            <div className="flex gap-5">

                {/* Sidebar */}
                <nav className="hidden lg:flex flex-col gap-1 w-56 shrink-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Módulos</p>
                    {docSections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                                activeSection === section.id
                                    ? 'bg-[#001A72] text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${activeSection === section.id ? 'bg-white/20' : section.color}`}>
                                <SectionIcon name={section.icon} className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-sm font-medium truncate">{section.title}</span>
                        </button>
                    ))}

                    {/* Version info */}
                    <div className="mt-4 px-3 py-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Info className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Versão</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700">v{DOC_VERSION}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Atualizado em<br />{new Date(DOC_UPDATED + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                    </div>
                </nav>

                {/* Mobile section selector */}
                <div className="lg:hidden w-full">
                    <select
                        value={activeSection}
                        onChange={e => setActiveSection(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001A72]/20 focus:border-[#001A72] mb-4"
                    >
                        {docSections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        {/* Section header */}
                        <div className="px-6 py-5 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${currentSection.color}`}>
                                    <SectionIcon name={currentSection.icon} className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">{currentSection.title}</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">{currentSection.shortDescription}</p>
                                </div>
                            </div>
                        </div>

                        {/* Section body */}
                        <div className="px-6 py-6">
                            <SectionContent section={currentSection} />
                        </div>
                    </div>

                    {/* Mobile: all sections stacked */}
                    <div className="lg:hidden mt-4 space-y-4">
                        {docSections.filter(s => s.id !== activeSection).map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className="w-full flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3.5 text-left hover:border-[#001A72]/30 transition-colors"
                            >
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${section.color}`}>
                                    <SectionIcon name={section.icon} className="w-4 h-4" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800">{section.title}</p>
                                    <p className="text-xs text-slate-400 truncate">{section.shortDescription}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 ml-auto" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
