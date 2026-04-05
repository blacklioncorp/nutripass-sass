'use server';

import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';

export type AllergenValidationResult = {
  safe: boolean;
  warnings: string[];
};

export async function validateCartAllergens(
  consumerId: string,
  // Cart items can be from Parent Portal OR POS Terminal
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
    // If no allergies registered, or failed to fetch, we default to safe.
    return { safe: true, warnings: [] };
  }

  const allergiesList = consumer.allergies.join(', ');

  // 2. We could fetch detailed products/menus from DB using `cartItems.id`, 
  // but for POS and Parent parity, the simplest is relying on `description` if provided,
  // or `name` if not.
  const itemsText = cartItems.map((item, idx) => {
    let text = `${idx + 1}. Producto: ${item.name}`;
    if (item.description) text += ` - Descripción: ${item.description}`;
    return text;
  }).join('\n');

  // 3. Setup OpenAI
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY no detectado. Saltando validación de alérgenos.");
    return { safe: true, warnings: [] }; // Fallback
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un experto asistente nutricional escolar. El alumno tiene estrictamente las siguientes alergias o restricciones: ${allergiesList}.
Revisa la lista de productos o menús que están a punto de comprarle y detecta si EXISTE ALGÚN RIESGO o es probable que contengan esos alérgenos.
Cuando la descripción incluya componentes de un menú del día etiquetados como "Sopa:", "Plato Fuerte:", "Guarnición:", "Postre:" o "Bebida:", analiza CADA componente individualmente.
Sé estricto: si una pizza, queso, mantequilla, leche, crema, pan o cualquier derivado lácteo aparece en el menú y el alumno tiene alergia a LÁCTEOS, es un riesgo.
Tu respuesta debe ser estricta y ÚNICAMENTE un JSON puro de este tipo:
{
  "safe": boolean,
  "warnings": ["Advertencia detallada específica", "Otra advertencia..."]
}
Si no hay riesgos evidentes, devuelve { "safe": true, "warnings": [] }.
Si hay riesgo, devuelve "safe": false y explica por qué en "warnings", indicando qué componente del menú afecta qué alergia.
NO USES FORMATO MARKDOWN (ni \`\`\`json). SOLO EL OBJETO RAW.`
        },
        {
          role: "user",
          content: `Revisa la siguiente lista de compras de la cafetería escolar:\n${itemsText}`
        }
      ],
      temperature: 0,
    });

    const content = aiResponse.choices[0].message?.content || '{"safe":true,"warnings":[]}';
    const parsed = JSON.parse(content.trim()) as AllergenValidationResult;
    
    // Ensure format is correct
    if (typeof parsed.safe !== 'boolean' || !Array.isArray(parsed.warnings)) {
      return { safe: true, warnings: [] };
    }
    
    return parsed;
  } catch (err) {
    console.error("OpenAI Allergen Check Error:", err);
    return { safe: true, warnings: [] }; // Don't block production if OpenAI crashes
  }
}
