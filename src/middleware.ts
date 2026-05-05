import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Manejo de la sesión de Supabase y redirecciones de seguridad
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Aplica el middleware a todas las rutas excepto a:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (icono global)
     * - Recursos e imágenes
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
