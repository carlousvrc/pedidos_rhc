import { getCurrentUser } from '@/lib/auth';
import DashboardClient from './DashboardClient';

export const revalidate = 0;

export default async function Home() {
    const currentUser = await getCurrentUser();
    return <DashboardClient currentUser={currentUser} />;
}
