import { getCurrentUser } from '@/lib/auth';
import PedidoDetail from './PedidoDetail';

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    return <PedidoDetail id={id} currentUser={currentUser} />;
}
