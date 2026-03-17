import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TransferenciasClient from './TransferenciasClient';

export const revalidate = 0;

export default async function TransferenciasPage() {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect('/login');

    return <TransferenciasClient currentUser={currentUser} />;
}
