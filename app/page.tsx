import { supabase } from '@/lib/supabase';
import { mockPedidos } from '@/lib/mockData';
import { getCurrentUser } from '@/lib/auth';
import DashboardClient from './DashboardClient';

export const revalidate = 0;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Home() {
    const currentUser = await getCurrentUser();

    let query = supabase
        .from('pedidos')
        .select('id, numero_pedido, status, data_pedido, unidades(nome), usuario_id')
        .order('data_pedido', { ascending: false })
        .limit(50);

    const scope = currentUser?.permissoes?.scope ?? 'operador';
    const hasRealId = !!currentUser?.id && UUID_RE.test(currentUser.id);

    if (scope === 'operador' && hasRealId) {
        query = query.eq('usuario_id', currentUser!.id);
    }

    const { data: pedidos, error } = await query;

    if (error) {
        console.error('Error fetching pedidos:', error);
    }

    const pedidosList = (pedidos && pedidos.length > 0) ? (pedidos as any[]) : mockPedidos;

    return (
        <DashboardClient currentUser={currentUser} initialPedidos={pedidosList} />
    );
}
