import Link from 'next/link';
import Image from 'next/image';
import { Bell, ChevronDown } from 'lucide-react';

export function Navbar() {
    return (
        <nav className="h-16 bg-[#001A72] flex items-center justify-between px-4 sm:px-8 text-white sticky top-0 z-50 shadow-md">
            <div className="flex items-center gap-6 sm:gap-10">

                {/* Logo Area */}
                <div className="flex items-center">
                    <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
                        <Image
                            src="/logo.png"
                            alt="Hospital Casa Logo"
                            width={160}
                            height={48}
                            priority
                            className="h-10 w-auto object-contain"
                        />
                        <span className="text-xl font-bold text-white tracking-tight hidden sm:block">
                            RHC-Pedidos
                        </span>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-1 lg:gap-2 ml-4 lg:ml-8">
                    <Link
                        href="/"
                        className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors bg-[#001250]"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/dashboard/pedidos/novo"
                        className="px-4 py-2 rounded-md text-sm font-medium text-white/80 transition-colors hover:bg-[#001250] hover:text-white"
                    >
                        Novo Pedido
                    </Link>
                    <Link
                        href="#"
                        className="px-4 py-2 rounded-md text-sm font-medium text-white/50 cursor-not-allowed"
                    >
                        Histórico
                    </Link>
                    <Link
                        href="#"
                        className="px-4 py-2 rounded-md text-sm font-medium text-white/50 cursor-not-allowed"
                    >
                        Relatórios
                    </Link>
                </div>
            </div>

            {/* User Profile Right Side */}
            <div className="flex items-center">
                <button className="flex items-center gap-3 bg-[#001250] hover:bg-[#001250]/80 transition-colors rounded-full py-1.5 px-2 sm:pr-4">
                    <div className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                        A
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                        <span className="text-sm font-medium">Administrador</span>
                        <ChevronDown className="w-4 h-4 text-white/70" />
                    </div>
                </button>
            </div>
        </nav>
    );
}
