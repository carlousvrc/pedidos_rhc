import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import EditarPedidoClient from './EditarPedidoClient';

export const revalidate = 0;

export default async function EditarPedidoPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    // Apenas admins com módulo usuários podem editar
    if (currentUser?.permissoes?.modulos?.usuarios !== true) {
        redirect(`/dashboard/pedidos/${id}`);
    }

    const { data: pedido } = await supabase
        .from('pedidos')
        .select('*, unidades(nome)')
        .eq('id', id)
        .single();

    if (!pedido) redirect('/');

    const { data: pedidoItens } = await supabase
        .from('pedidos_itens')
        .select('id, quantidade, itens(id, codigo, referencia, nome, tipo)')
        .eq('pedido_id', id);

    return (
        <EditarPedidoClient
            currentUser={currentUser}
            pedido={pedido}
            pedidoItens={pedidoItens ?? []}
        />
    );
}
