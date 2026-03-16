import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PedidoDetail from './PedidoDetail';

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    const scope = currentUser?.permissoes?.scope ?? 'operador';
    if (scope === 'operador') {
        redirect('/');
    }

    return <PedidoDetail id={id} currentUser={currentUser} />;
}
