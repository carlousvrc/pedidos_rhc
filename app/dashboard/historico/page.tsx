import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import HistoricoClient from './HistoricoClient';

export const revalidate = 0;

export default async function HistoricoPage() {
    const currentUser = await getCurrentUser();
    const scope = currentUser?.permissoes?.scope ?? 'operador';

    let query = supabase
        .from('pedidos')
        .select('id, numero_pedido, status, data_pedido, unidades(nome), usuario_id')
        .order('data_pedido', { ascending: false });

    if (scope === 'operador' && currentUser) {
        query = query.eq('usuario_id', currentUser.id);
    }

    const { data: pedidos } = await query;

    return <HistoricoClient pedidos={(pedidos ?? []) as any[]} scope={scope} />;
}
