import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import HistoricoClient from './HistoricoClient';

export const revalidate = 0;

export default async function HistoricoPage() {
    const currentUser = await getCurrentUser();
    const scope = currentUser?.permissoes?.scope ?? 'operador';

    let pedidos: any[] = [];

    if (scope === 'operador' && currentUser) {
        // Own orders
        const { data: ownOrders } = await supabase
            .from('pedidos')
            .select('id, numero_pedido, status, created_at, unidades(nome), usuario_id')
            .eq('usuario_id', currentUser.id)
            .order('created_at', { ascending: false });

        // Orders from user's unit that have incoming remanejamentos
        let transferOrders: any[] = [];
        if (currentUser.unidade_id) {
            const { data: rems } = await supabase.from('remanejamentos').select('pedido_item_origem_id');
            if (rems && rems.length > 0) {
                const piIds = rems.map(r => r.pedido_item_origem_id);
                const { data: piData } = await supabase.from('pedidos_itens').select('pedido_id').in('id', piIds);
                if (piData && piData.length > 0) {
                    const pedidoIds = [...new Set(piData.map(p => p.pedido_id))];
                    const { data: originOrders } = await supabase
                        .from('pedidos')
                        .select('id, numero_pedido, status, created_at, unidades(nome), usuario_id')
                        .in('id', pedidoIds)
                        .eq('unidade_id', currentUser.unidade_id);
                    transferOrders = originOrders || [];
                }
            }
        }

        const merged = new Map<string, any>();
        for (const p of [...(ownOrders || []), ...transferOrders]) {
            if (!merged.has(p.id)) merged.set(p.id, p);
        }
        pedidos = Array.from(merged.values()).sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    } else {
        const { data } = await supabase
            .from('pedidos')
            .select('id, numero_pedido, status, created_at, unidades(nome), usuario_id')
            .order('created_at', { ascending: false });
        pedidos = data ?? [];
    }

    const canDelete = currentUser?.permissoes?.modulos?.usuarios === true;
    return <HistoricoClient pedidos={(pedidos ?? []) as any[]} scope={scope} canDelete={canDelete} />;
}
