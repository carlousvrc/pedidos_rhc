import { supabase } from '@/lib/supabase';
import { mockPedidos } from '@/lib/mockData';
import { getCurrentUser } from '@/lib/auth';
import DashboardClient from './DashboardClient';

export const revalidate = 0;

export default async function Home() {
    const currentUser = await getCurrentUser();

    // Build query - filter by usuario_id for solicitante
    let query = supabase
        .from('pedidos')
        .select('id, numero_pedido, status, data_pedido, unidades(nome), usuario_id')
        .order('data_pedido', { ascending: false })
        .limit(50);

    if (currentUser?.role === 'solicitante') {
        query = query.eq('usuario_id', currentUser.id);
    }

    const { data: pedidos, error } = await query;

    if (error) {
        console.error('Error fetching pedidos:', error);
    }

    // Fallback to mock data if empty or error
    let pedidosList = (pedidos && pedidos.length > 0) ? (pedidos as any[]) : mockPedidos;

    // Apply solicitante filter on mock data too
    if (currentUser?.role === 'solicitante') {
        pedidosList = pedidosList.filter((p: any) => p.usuario_id === currentUser.id);
    }

    return (
        <DashboardClient currentUser={currentUser} initialPedidos={pedidosList} />
    );
}
