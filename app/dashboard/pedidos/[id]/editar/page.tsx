import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import EditarPedidoClient from './EditarPedidoClient';

export const revalidate = 0;

export default async function EditarPedidoPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    // Admins, aprovadores e usuários com módulo usuários podem editar
    const canEdit = currentUser?.permissoes?.modulos?.usuarios === true || currentUser?.role === 'aprovador';
    if (!canEdit) {
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
        .select('id, quantidade, itens!item_id(id, codigo, referencia, nome, tipo)')
        .eq('pedido_id', id);

    return (
        <EditarPedidoClient
            currentUser={currentUser}
            pedido={pedido}
            pedidoItens={pedidoItens ?? []}
        />
    );
}
