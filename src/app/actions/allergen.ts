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
          content: `Eres un experto en nutrición y seguridad alimentaria encargado de validar carritos de compras escolares.

REGLA DE ORO INQUEBRANTABLE:
SOLO debes reportar un riesgo si los ingredientes o alérgenos del producto coinciden con la lista específica de alergias de este alumno. Si un producto contiene alérgenos comunes (como lácteos, gluten, soya, etc.) pero el alumno NO tiene declarada esa alergia específica en la lista de abajo, DEBES marcarlo como SEGURO. Los falsos positivos son inaceptables.

LISTA DE ALERGIAS DEL ALUMNO: [${allergiesList}]

TAREA: Analizar los productos y determinar si existe un riesgo REAL para este alumno.

INSTRUCCIONES DE EVALUACIÓN:
1. "Riesgo Real" significa que el alérgeno de la lista del alumno está presente de forma evidente en el nombre, descripción, ingredientes o alérgenos registrados del producto.
2. Si la lista del alumno es "cacahuates" y el producto contiene "queso", el resultado es SEGURO (safe: true). El queso no es cacahuate.
3. Si la lista del alumno está vacía, el resultado es SEGURO (safe: true).
4. NO consideres trazas ni contaminación cruzada. Solo ingredientes primarios.
5. NO inventes ingredientes. Si la descripción es corta, confía solo en lo que dice.

EJEMPLO 1 (ALUMNO ALÉRGICO A "NUECES"):
- Producto: "Sándwich de Jamón con Queso" (Contiene lácteos).
- Resultado: {"safe": true, "warnings": []} (Porque el alumno no es alérgico a lácteos).

EJEMPLO 2 (ALUMNO ALÉRGICO A "GLUTEN"):
- Producto: "Pasta Alfredo" (Contiene trigo/harina).
- Resultado: {"safe": false, "warnings": ["La pasta contiene gluten que está en tu lista de alergias."]}

RESPUESTA REQUERIDA: Devuelve únicamente un objeto JSON puro:
{"safe": true, "warnings": []} o {"safe": false, "warnings": ["Explicación corta"]}
`
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
