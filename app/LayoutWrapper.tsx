'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLogin = pathname === '/login';

    if (isLogin) {
        return <>{children}</>;
    }

    return (
        <>
            <Navbar />
            <main className="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </>
    );
}
