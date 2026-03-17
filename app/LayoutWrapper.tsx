'use client';

import { usePathname } from 'next/navigation';

interface LayoutWrapperProps {
    children: React.ReactNode;
    navbar: React.ReactNode;
}

export function LayoutWrapper({ children, navbar }: LayoutWrapperProps) {
    const pathname = usePathname();
    const isLogin = pathname === '/login';
    const isHome = pathname === '/';

    if (isLogin) {
        return <>{children}</>;
    }

    if (isHome) {
        return (
            <main className="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        );
    }

    return (
        <>
            {navbar}
            <main className="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </>
    );
}
