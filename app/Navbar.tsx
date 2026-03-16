import Link from 'next/link';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { logoutUser } from './login/actions';
import { getCurrentUser } from '@/lib/auth';

function getRoleBadgeClass(role: string) {
    switch (role) {
        case 'admin': return 'bg-purple-500 text-white';
        case 'comprador': return 'bg-blue-400 text-white';
        case 'solicitante': return 'bg-green-500 text-white';
        default: return 'bg-orange-500 text-white';
    }
}

export async function Navbar() {
    const currentUser = await getCurrentUser();
    const nome = currentUser?.nome || 'Usuário';
    const role = currentUser?.role || 'solicitante';
    const initial = nome.charAt(0).toUpperCase();
    const mod = currentUser?.permissoes?.modulos;

    return (
        <nav className="h-16 bg-[#001A72] flex items-center justify-between px-4 sm:px-8 text-white sticky top-0 z-50 shadow-md">
            <div className="flex items-center gap-6 sm:gap-10">

                {/* Logo Area */}
                <div className="flex items-center">
                    <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
                        <div className="bg-white rounded-lg px-2 py-1 flex items-center justify-center">
                            <Image
                                src="/logo.png"
                                alt="Hospital Casa Logo"
                                width={120}
                                height={36}
                                priority
                                className="h-9 w-auto object-contain"
                            />
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight hidden sm:block">
                            RHC Pedidos
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
                    {mod?.pedidos !== false && (
                        <Link
                            href="/dashboard/pedidos/novo"
                            className="px-4 py-2 rounded-md text-sm font-medium text-white/80 transition-colors hover:bg-[#001250] hover:text-white"
                        >
                            Novo Pedido
                        </Link>
                    )}
                    {mod?.historico !== false && (
                        <Link
                            href="/dashboard/historico"
                            className="px-4 py-2 rounded-md text-sm font-medium text-white/80 transition-colors hover:bg-[#001250] hover:text-white"
                        >
                            Histórico
                        </Link>
                    )}
                    {mod?.relatorios && (
                        <Link
                            href="/dashboard/relatorios"
                            className="px-4 py-2 rounded-md text-sm font-medium text-white/80 transition-colors hover:bg-[#001250] hover:text-white"
                        >
                            Relatórios
                        </Link>
                    )}
                    {mod?.bionexo && (
                        <Link
                            href="/dashboard/bionexo"
                            className="px-4 py-2 rounded-md text-sm font-medium text-white/80 transition-colors hover:bg-[#001250] hover:text-white"
                        >
                            Bionexo
                        </Link>
                    )}
                    {mod?.itens && (
                        <Link
                            href="/dashboard/itens"
                            className="px-4 py-2 rounded-md text-sm font-medium text-white/80 transition-colors hover:bg-[#001250] hover:text-white"
                        >
                            Itens
                        </Link>
                    )}
                    {mod?.usuarios && (
                        <Link
                            href="/dashboard/usuarios"
                            className="px-4 py-2 rounded-md text-sm font-medium text-white/80 transition-colors hover:bg-[#001250] hover:text-white"
                        >
                            Usuários
                        </Link>
                    )}
                </div>
            </div>

            {/* User Profile Right Side */}
            <div className="flex items-center gap-3">
                <span className={`hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getRoleBadgeClass(role)}`}>
                    {role}
                </span>

                <form action={logoutUser}>
                    <button
                        type="submit"
                        className="flex items-center gap-3 bg-[#001250] hover:bg-[#001250]/80 transition-colors rounded-full py-1.5 px-2 sm:pr-4 group"
                        title="Sair do sistema"
                    >
                        <div className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                            {initial}
                        </div>
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-sm font-medium">{nome}</span>
                            <LogOut className="w-4 h-4 text-white/70 group-hover:text-red-400 transition-colors" />
                        </div>
                    </button>
                </form>
            </div>
        </nav>
    );
}
