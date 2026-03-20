'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, X, ShoppingCart, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Notificacao {
    id: string;
    pedido_id: string | null;
    tipo: 'recebimento' | 'divergencia' | 'pendencia' | 'status';
    mensagem: string;
    lida: boolean;
    created_at: string;
}

interface Props {
    usuarioId: string;
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'agora';
    if (m < 60) return `${m}m atrás`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h atrás`;
    return `${Math.floor(h / 24)}d atrás`;
}

const tipoIcon: Record<string, React.ReactNode> = {
    recebimento: <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />,
    divergencia: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />,
    pendencia:   <Clock className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />,
    status:      <ShoppingCart className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />,
};

export default function NotificationBell({ usuarioId }: Props) {
    const [notifs, setNotifs] = useState<Notificacao[]>([]);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const unread = notifs.filter(n => !n.lida).length;

    async function load() {
        const { data } = await supabase
            .from('notificacoes')
            .select('*')
            .eq('usuario_id', usuarioId)
            .order('created_at', { ascending: false })
            .limit(30);
        if (data) setNotifs(data as Notificacao[]);
    }

    useEffect(() => {
        load();
        const ch = supabase
            .channel(`notifs-${usuarioId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notificacoes',
                filter: `usuario_id=eq.${usuarioId}`,
            }, () => load())
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuarioId]);

    // Fechar ao clicar fora
    useEffect(() => {
        function handle(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    async function markRead(id: string) {
        await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
        setNotifs(p => p.map(n => n.id === id ? { ...n, lida: true } : n));
    }

    async function markAllRead() {
        const ids = notifs.filter(n => !n.lida).map(n => n.id);
        if (ids.length === 0) return;
        await supabase.from('notificacoes').update({ lida: true }).in('id', ids);
        setNotifs(p => p.map(n => ({ ...n, lida: true })));
    }

    async function remove(id: string) {
        await supabase.from('notificacoes').delete().eq('id', id);
        setNotifs(p => p.filter(n => n.id !== id));
    }

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition-colors"
                title="Notificações"
            >
                <Bell className="w-5 h-5 text-white" />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-[#001A72]">
                        <span className="text-sm font-bold text-white">Notificações</span>
                        {unread > 0 && (
                            <button
                                onClick={markAllRead}
                                className="flex items-center gap-1 text-[11px] text-blue-200 hover:text-white transition-colors"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Marcar todas como lidas
                            </button>
                        )}
                    </div>

                    {/* Lista */}
                    <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
                        {notifs.length === 0 ? (
                            <div className="py-10 text-center">
                                <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">Nenhuma notificação</p>
                            </div>
                        ) : notifs.map(n => (
                            <div
                                key={n.id}
                                className={`flex items-start gap-3 px-4 py-3 transition-colors ${n.lida ? 'bg-white' : 'bg-blue-50/50'}`}
                            >
                                {tipoIcon[n.tipo]}
                                <div className="flex-1 min-w-0">
                                    {n.pedido_id ? (
                                        <Link
                                            href={`/dashboard/pedidos/${n.pedido_id}`}
                                            onClick={() => { markRead(n.id); setOpen(false); }}
                                            className="text-xs text-slate-700 hover:text-[#001A72] leading-snug line-clamp-2"
                                        >
                                            {n.mensagem}
                                        </Link>
                                    ) : (
                                        <p className="text-xs text-slate-700 leading-snug line-clamp-2">{n.mensagem}</p>
                                    )}
                                    <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.created_at)}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {!n.lida && (
                                        <button onClick={() => markRead(n.id)} title="Marcar como lida" className="p-1 text-slate-300 hover:text-blue-500 transition-colors">
                                            <CheckCheck className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button onClick={() => remove(n.id)} title="Remover" className="p-1 text-slate-300 hover:text-red-400 transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
