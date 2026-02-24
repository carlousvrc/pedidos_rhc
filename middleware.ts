import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const authCookie = request.cookies.get('rhc_auth_token');

    // Se não tiver cookie logado e não for a tela de login, ou algum asset público, 
    // redireciona para a tela inicial de Login.
    const isLoginPage = request.nextUrl.pathname.startsWith('/login');
    const isPublicResource = request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/api') ||
        request.nextUrl.pathname === '/logo.png' ||
        request.nextUrl.pathname === '/favicon.ico';

    if (!authCookie && !isLoginPage && !isPublicResource) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Se tiver logado e tentar acessar o login, manda pro dashboard
    if (authCookie && isLoginPage) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
