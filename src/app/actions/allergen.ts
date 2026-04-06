'use server';

import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';

export type AllergenValidationResult = {
  safe: boolean;
  warnings: string[];
};

export async function validateCartAllergens(
  consumerId: string,
  cartItems: Array<{ id: string; name: string; description?: string; sourceType?: 'product' | 'daily_menu' }>
): Promise<AllergenValidationResult> {
  const supabase = await createClient();

  // 1. Fetch the student's allergies
  const { data: consumer, error } = await supabase
    .from('consumers')
    .select('allergies')
    .eq('id', consumerId)
    .single();

  if (error || !consumer || !consumer.allergies || consumer.allergies.length === 0) {
    return { safe: true, warnings: [] };
  }

  const studentAllergies: string[] = consumer.allergies;
  const allergiesList = studentAllergies.join(', ');

  // 2. Fetch REAL product data from database (ingredients + allergens columns)
  const productIds = cartItems
    .filter(i => i.sourceType !== 'daily_menu')
    .map(i => i.id);

  const menuIds = cartItems
    .filter(i => i.sourceType === 'daily_menu')
    .map(i => i.id);

  let productsData: any[] = [];
  let menusData: any[] = [];

  if (productIds.length > 0) {
    const { data } = await supabase
      .from('products')
      .select('id, name, description, ingredients, allergens, category')
      .in('id', productIds);
    productsData = data || [];
  }

  if (menuIds.length > 0) {
    const { data } = await supabase
      .from('daily_menus')
      .select('id, soup_name, main_course_name, side_dish_name, dessert_name, drink_name')
      .in('id', menuIds);
    menusData = data || [];
  }

  // 3. Build enriched item descriptions with real DB data
  const enrichedItems = cartItems.map((item, idx) => {
    let text = `${idx + 1}. "${item.name}"`;

    // Find matched product data
    const dbProduct = productsData.find(p => p.id === item.id);
    const dbMenu = menusData.find(m => m.id === item.id);

    if (dbProduct) {
      if (dbProduct.description) text += ` | Descripción: ${dbProduct.description}`;
      if (dbProduct.ingredients?.length) text += ` | Ingredientes registrados: [${dbProduct.ingredients.join(', ')}]`;
      if (dbProduct.allergens?.length) text += ` | Alérgenos registrados: [${dbProduct.allergens.join(', ')}]`;
      else text += ` | Alérgenos registrados: [ninguno registrado]`;
    } else if (dbMenu) {
      const components = [
        dbMenu.soup_name && `Sopa: ${dbMenu.soup_name}`,
        dbMenu.main_course_name && `Plato Fuerte: ${dbMenu.main_course_name}`,
        dbMenu.side_dish_name && `Guarnición: ${dbMenu.side_dish_name}`,
        dbMenu.dessert_name && `Postre: ${dbMenu.dessert_name}`,
        dbMenu.drink_name && `Bebida: ${dbMenu.drink_name}`,
      ].filter(Boolean).join(', ');
      text += ` | Componentes del menú: [${components}]`;
    } else {
      if (item.description) text += ` | Descripción: ${item.description}`;
    }

    return text;
  }).join('\n');

  // 4. Setup OpenAI
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY no detectado. Saltando validación de alérgenos.");
    return { safe: true, warnings: [] };
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un verificador de alérgenos para una cafetería escolar.

TAREA: Determinar si algún producto del carrito contiene alérgenos que afecten a ESTE alumno específico.

ALERGIAS DE ESTE ALUMNO: [${allergiesList}]

INSTRUCCIONES CRÍTICAS:
- SOLO marca un producto como riesgoso si es EVIDENTE que contiene uno de los alérgenos listados arriba como ingrediente principal o común.
- "Evidente" significa: el alérgeno aparece en el nombre, en los ingredientes registrados, en los alérgenos registrados, o es un ingrediente PRIMARIO ampliamente conocido de ese platillo.
- NO inventes ingredientes. Si un "Sandwich de jamón con queso" no menciona cacahuates en sus ingredientes, NO tiene cacahuates. El queso es lácteo, no cacahuate.
- NO alertes por contaminación cruzada ni por "podría contener trazas de".
- Si la alergia es "cacahuates": solo alerta si el producto CLARAMENTE contiene cacahuate, maní, o mantequilla de maní como ingrediente. Pan, queso, flan, galletas normales NO contienen cacahuates.
- Si la alergia es "lácteos": solo alerta si el producto contiene leche, queso, crema, mantequilla, yogurt, etc.
- Si la alergia es "gluten": solo alerta si el producto contiene trigo, pan, harina de trigo, pasta, etc.
- Si un producto tiene "Alérgenos registrados: [ninguno registrado]" y su nombre/descripción no sugiere claramente que contiene el alérgeno del alumno, márcalo como SEGURO.
EJEMPLOS DE COMPORTAMIENTO ESPERADO:
Input: Alumno alérgico a "cacahuates". Platillo: "Sandwich de jamón con queso (Ingredientes: pan de caja, jamón de pavo, queso manchego, mayonesa)".
Output: {"safe": true, "warnings": []}

Input: Alumno alérgico a "cacahuates". Platillo: "Galleta de Avena (Ingredientes: avena, huevo, mantequilla de maní, azúcar)".
Output: {"safe": false, "warnings": ["El platillo contiene mantequilla de maní como ingrediente."]}

RESPUESTA: Devuelve ÚNICAMENTE un objeto JSON puro (sin markdown):
{"safe": true, "warnings": []}  — si no hay riesgo
{"safe": false, "warnings": ["Descripción clara del riesgo real encontrado"]}  — si hay riesgo real`
        },
        {
          role: "user",
          content: `Productos en el carrito:\n${enrichedItems}`
        }
      ],
      temperature: 0,
    });

    const content = aiResponse.choices[0].message?.content || '{"safe":true,"warnings":[]}';
    
    // Clean potential markdown wrapping
    const cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleanContent) as AllergenValidationResult;
    
    if (typeof parsed.safe !== 'boolean' || !Array.isArray(parsed.warnings)) {
      return { safe: true, warnings: [] };
    }
    
    return parsed;
  } catch (err) {
    console.error("OpenAI Allergen Check Error:", err);
    return { safe: true, warnings: [] };
  }
}
