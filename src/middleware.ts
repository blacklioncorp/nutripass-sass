import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Inject the current pathname into request headers so Server Components can read it via headers()
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  // Manejo de la sesión de Supabase y redirecciones de seguridad
  // Pasamos la solicitud con los headers actualizados
  const response = await updateSession(new Request(request, {
    headers: requestHeaders,
  }) as any);
  
  // También lo ponemos en la respuesta por si acaso
  response.headers.set('x-pathname', request.nextUrl.pathname);
  
  return response;
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
