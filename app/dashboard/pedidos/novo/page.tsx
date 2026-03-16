import { getCurrentUser } from '@/lib/auth';
import NovoPedidoClient from './NovoPedidoClient';

export const revalidate = 0;

export default async function NovoPedidoPage() {
    const currentUser = await getCurrentUser();
    return <NovoPedidoClient currentUser={currentUser} />;
}
