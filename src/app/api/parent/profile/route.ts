import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { fullName, email } = await req.json();
    const user = session.user;
    const userEmail = email?.toLowerCase() || user.email?.toLowerCase();

    if (!fullName) {
      return NextResponse.json({ error: 'El nombre completo es requerido' }, { status: 400 });
    }

    // --- PASO A: UPSERT en tabla parents ---
    const { error: parentError } = await supabase
      .from('parents')
      .upsert({
        id: user.id,
        email: userEmail,
        full_name: fullName.trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (parentError) {
      console.error('Error UPSERT parents:', parentError);
      throw new Error('Error al guardar el perfil: ' + parentError.message);
    }

    // --- PASO B: El Match (Vinculación de hijos) ---
    // Buscamos consumidores que tengan este email de padre y no tengan parent_id asignado aún.
    const { data: matched, error: matchError } = await supabase
      .from('consumers')
      .update({ parent_id: user.id })
      .eq('parent_email', userEmail)
      .is('parent_id', null)
      .select('id, first_name');

    if (matchError) {
      // No hacemos fallar toda la petición por un error de vinculación, 
      // pero lo registramos para debugging.
      console.error('Error vinculando hijos:', matchError);
    } else if (matched && matched.length > 0) {
      console.log(`Auto-vinculados ${matched.length} hijos para el padre ${user.id}:`, matched.map(m => m.first_name));
    }

    return NextResponse.json({ 
      success: true, 
      matchedCount: matched?.length || 0 
    });

  } catch (error: any) {
    console.error('Critical Error in /api/parent/profile:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
