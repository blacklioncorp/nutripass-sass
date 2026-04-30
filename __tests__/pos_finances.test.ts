import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * ---------------------------------------------------------
 * CONFIGURACIÓN DEL ENTORNO DE PRUEBAS
 * ---------------------------------------------------------
 * Ejecuta este test asegurando tener las siguientes variables de entorno:
 * SUPABASE_URL=https://tu-proyecto.supabase.co
 * SUPABASE_SERVICE_ROLE_KEY=ey... (Se necesita Service Role para saltar RLS y resetear saldos)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'tu-service-role-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

describe('Auditoría Financiera - smart_pos_checkout RPC', () => {
  // Variables que se inicializarán antes de las pruebas
  let schoolId: string;
  let parentId: string;
  let consumerId: string;
  let walletComedorId: string;
  let walletSnackId: string;

  beforeAll(async () => {
    schoolId = crypto.randomUUID();
    consumerId = crypto.randomUUID();
    walletComedorId = crypto.randomUUID();
    walletSnackId = crypto.randomUUID();

    // 1. Crear una escuela de prueba
    const { error: schoolErr } = await supabase
      .from('schools')
      .upsert({
        id: schoolId,
        name: 'QA Test School',
        subdomain: `qa-test-${Date.now()}`,
        settings: { financial: { overdraft_limit: 50, apply_convenience_fee: false } }
      })
      .select()
      .single();
    if (schoolErr) throw new Error(`Setup School Error: ${schoolErr.message}`);

    // 2. Crear un padre de prueba en Auth y public.parents
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: `test_parent_qa_${Date.now()}@safelunch.com`,
      password: 'password123',
      email_confirm: true
    });
    if (authErr || !authUser.user) throw new Error(`Setup Auth Error: ${authErr?.message}`);
    parentId = authUser.user.id;

    const { error: parentErr } = await supabase
      .from('parents')
      .upsert({ id: parentId, email: authUser.user.email })
      .select()
      .single();
    if (parentErr) throw new Error(`Setup Parent Error: ${parentErr.message}`);

    // 3. Crear el consumidor (Estudiante)
    const { error: consumerErr } = await supabase
      .from('consumers')
      .upsert({
        id: consumerId,
        school_id: schoolId,
        parent_id: parentId,
        first_name: 'QA',
        last_name: 'Student',
        type: 'student',
        daily_limit: 50 // Inicializamos con 50 por defecto
      })
      .select()
      .single();
    if (consumerErr) throw new Error(`Setup Consumer Error: ${consumerErr.message}`);

    // 4. Crear las Billeteras
    const { error: wcErr } = await supabase
      .from('wallets')
      .upsert({ id: walletComedorId, consumer_id: consumerId, type: 'comedor', balance: 100 })
      .select()
      .single();
    if (wcErr) throw new Error(`Setup Wallet Comedor Error: ${wcErr.message}`);

    const { error: wsErr } = await supabase
      .from('wallets')
      .upsert({ id: walletSnackId, consumer_id: consumerId, type: 'snack', balance: 100 })
      .select()
      .single();
    if (wsErr) throw new Error(`Setup Wallet Snack Error: ${wsErr.message}`);
  });

  afterAll(async () => {
    // Limpieza de datos (Opcional, pero recomendado)
    await supabase.from('transactions').delete().in('wallet_id', [walletComedorId, walletSnackId]);
    await supabase.from('wallets').delete().in('id', [walletComedorId, walletSnackId]);
    await supabase.from('consumers').delete().eq('id', consumerId);
    await supabase.from('parents').delete().eq('id', parentId);
    await supabase.from('schools').delete().eq('id', schoolId);
    await supabase.auth.admin.deleteUser(parentId);
  });

  beforeEach(async () => {
    // Resetear saldos y transacciones antes de cada test para garantizar aislamiento
    await supabase.from('wallets').update({ balance: 100 }).eq('id', walletComedorId);
    await supabase.from('wallets').update({ balance: 100 }).eq('id', walletSnackId);
    await supabase.from('consumers').update({ daily_limit: 50 }).eq('id', consumerId);
    // Borrar transacciones previas del usuario de prueba
    await supabase.from('transactions').delete().in('wallet_id', [walletComedorId, walletSnackId]);
  });

  // ----------------------------------------------------------------------
  // TEST CASES
  // ----------------------------------------------------------------------

  test('1. Test de Cobro Dual Exitoso (Happy Path)', async () => {
    const payload = {
      p_consumer_id: consumerId,
      p_school_id: schoolId,
      p_cart_items: [], // En este test el carrito no tiene alérgenos
      p_comedor_total: 40,
      p_snack_total: 10,
      p_wallet_comedor_id: walletComedorId,
      p_wallet_snack_id: walletSnackId
    };

    const { data, error } = await supabase.rpc('smart_pos_checkout', payload);

    // Verificamos que la función ejecutó correctamente sin errores
    expect(error).toBeNull();
    expect(data.success).toBe(true);

    // Verificamos saldos actualizados
    const { data: wComedor } = await supabase.from('wallets').select('balance').eq('id', walletComedorId).single();
    const { data: wSnack } = await supabase.from('wallets').select('balance').eq('id', walletSnackId).single();
    
    // 100 - 40 = 60
    expect(wComedor?.balance).toBe(60);
    // 100 - 10 = 90
    expect(wSnack?.balance).toBe(90);

    // Verificar tabla de transacciones
    const { data: txs } = await supabase.from('transactions').select('*').in('wallet_id', [walletComedorId, walletSnackId]);
    expect(txs).toHaveLength(2);
    
    const txComedor = txs?.find(t => t.wallet_type === 'comedor');
    const txSnack = txs?.find(t => t.wallet_type === 'snack');
    
    expect(txComedor?.amount).toBe(-40);
    expect(txSnack?.amount).toBe(-10);
  });

  test('2. Test de Límite Diario Acumulativo (Daily Limit)', async () => {
    // 1er Cobro (Aprobado): 40$ (Límite es 50$)
    const { error: err1 } = await supabase.rpc('smart_pos_checkout', {
      p_consumer_id: consumerId,
      p_school_id: schoolId,
      p_cart_items: [],
      p_comedor_total: 40,
      p_snack_total: 0,
      p_wallet_comedor_id: walletComedorId,
      p_wallet_snack_id: walletSnackId
    });
    expect(err1).toBeNull();

    // 2do Cobro (Rechazado): 15$ adicionales. Total del día: 40 + 15 = 55$ (> 50$)
    const { error: err2 } = await supabase.rpc('smart_pos_checkout', {
      p_consumer_id: consumerId,
      p_school_id: schoolId,
      p_cart_items: [],
      p_comedor_total: 0,
      p_snack_total: 15,
      p_wallet_comedor_id: walletComedorId,
      p_wallet_snack_id: walletSnackId
    });
    
    expect(err2).not.toBeNull();
    expect(err2?.message).toContain('LIMITE_DIARIO_EXCEDIDO');

    // Verificar que la segunda compra NO procesó dinero (el saldo de snacks debe seguir intacto)
    const { data: wSnack } = await supabase.from('wallets').select('balance').eq('id', walletSnackId).single();
    expect(wSnack?.balance).toBe(100);
  });

  test('3. Test de Resiliencia de Sobregiro (Overdraft en Comedor)', async () => {
    // Forzamos saldo 0
    await supabase.from('wallets').update({ balance: 0 }).eq('id', walletComedorId);

    // Intentamos comprar algo de 30$. Como el overdraft_limit es 50$, DEBE PASAR.
    const { data, error } = await supabase.rpc('smart_pos_checkout', {
      p_consumer_id: consumerId,
      p_school_id: schoolId,
      p_cart_items: [],
      p_comedor_total: 30,
      p_snack_total: 0,
      p_wallet_comedor_id: walletComedorId,
      p_wallet_snack_id: walletSnackId
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);

    // Validar el saldo negativo
    const { data: wComedor } = await supabase.from('wallets').select('balance').eq('id', walletComedorId).single();
    expect(wComedor?.balance).toBe(-30);

    // Validar que Snacks no se vio afectado
    const { data: wSnack } = await supabase.from('wallets').select('balance').eq('id', walletSnackId).single();
    expect(wSnack?.balance).toBe(100);
  });

  test('4. Test de Rechazo por Fondos Insuficientes Absolutos', async () => {
    // Forzamos saldo a -30$ (ya está en sobregiro parcial)
    await supabase.from('wallets').update({ balance: -30 }).eq('id', walletComedorId);

    // Intentamos cobrar 30$ más. Nuevo balance sería -60$, lo que supera el límite de -50$.
    const { error } = await supabase.rpc('smart_pos_checkout', {
      p_consumer_id: consumerId,
      p_school_id: schoolId,
      p_cart_items: [],
      p_comedor_total: 30,
      p_snack_total: 0,
      p_wallet_comedor_id: walletComedorId,
      p_wallet_snack_id: walletSnackId
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('FONDOS_INSUFICIENTES_COMEDOR');

    // Validar que la transacción se canceló (el saldo sigue en -30)
    const { data: wComedor } = await supabase.from('wallets').select('balance').eq('id', walletComedorId).single();
    expect(wComedor?.balance).toBe(-30);
  });
});
