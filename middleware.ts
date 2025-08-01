import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAuth } from 'firebase/auth'
import { auth } from './src/app/lib/firebaseConfig'

// Páginas que só podem ser acessadas se o usuário estiver logado
const protectedRoutes = ['/dashboard', '/outra-rota-protegida']

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value

  // Se a rota for protegida
  const isProtected = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtected && !sessionCookie) {
    // Redireciona para /login se não estiver logado
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

// Define em quais rotas esse middleware roda
export const config = {
  matcher: ['/dashboard/:path*', '/outra-rota-protegida/:path*'],
}
