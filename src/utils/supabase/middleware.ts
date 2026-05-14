import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // refreshing the auth token and fetching user
  const { data: { user } } = await supabase.auth.getUser();

  const isProtectedPath = 
    request.nextUrl.pathname.startsWith('/school') ||
    request.nextUrl.pathname.startsWith('/parent') ||
    request.nextUrl.pathname.startsWith('/point-of-sale');

  // --- REGLA DE SILENCIO TOTAL PARA /master ---
  if (request.nextUrl.pathname.startsWith('/master')) {
    let isAuthorized = false;

    if (user?.email) {
      const MASTER_EMAILS = ['safelunch772@gmail.com'];
      
      if (MASTER_EMAILS.includes(user.email)) {
        isAuthorized = true;
      } else {
        const { data: whitelist } = await supabase
          .from('master_whitelist')
          .select('email')
          .eq('email', user.email)
          .single();
          
        if (whitelist) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      // Rewrite silencioso a la raíz (/)
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.rewrite(url);
    }
  }

  // Si no hay usuario y trata de entrar a admin/parent, lo mandamos al login
  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // --- SCHOOL SUSPENSION CHECK ---
  if (user && isProtectedPath && request.nextUrl.pathname !== '/cuenta-suspendida') {
    // Fetch profile and school status
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, schools(status)')
      .eq('id', user.id)
      .single();

    const role = profile?.role;
    const schoolStatus = (profile as any)?.schools?.status;

    // If school is suspended, block access (unless user is superadmin)
    if (schoolStatus === 'suspended' && role !== 'superadmin') {
      const url = request.nextUrl.clone();
      url.pathname = '/cuenta-suspendida';
      return NextResponse.redirect(url);
    }
  }

  // Si YA está logueado y trata de ir al login o landing... redirigirlo a su rol
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/')) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    
    if (profile?.role === 'superadmin') {
      return NextResponse.redirect(new URL('/master', request.url));
    } else if (profile?.role === 'school_admin' || profile?.role === 'staff') {
      return NextResponse.redirect(new URL('/school', request.url));
    } else if (profile?.role === 'parent') {
      return NextResponse.redirect(new URL('/parent', request.url));
    }
  }

  return supabaseResponse;
}
