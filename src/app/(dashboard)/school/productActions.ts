'use server';

import { createAdminClient } from '@/utils/supabase/server';
import { getEffectiveSchoolId } from '@/utils/auth/effective-school';
import { revalidatePath } from 'next/cache';
import OpenAI from 'openai';

// OpenAI is instantiated lazily inside the action to avoid module-load crashes

export async function upsertProduct(prevState: any, formData: FormData) {
  const adminClient = await createAdminClient();

  const schoolId = await getEffectiveSchoolId();
  if (!schoolId) return { error: 'No autorizado' };

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const category = formData.get('category') as string;
  const base_price = parseFloat(formData.get('basePrice') as string);

  const stock_quantity = parseInt(formData.get('stockQuantity') as string) || 0;
  const nutri_points_reward = parseInt(formData.get('nutriPoints') as string) || 0;
  const image_url = formData.get('imageUrl') as string;
  // Parse manually entered allergens (comma-separated); these take priority over AI
  const manualAllergensRaw = (formData.get('manualAllergens') as string) || '';
  const manualAllergens = manualAllergensRaw
    .split(',')
    .map(a => a.trim())
    .filter(Boolean);

  const showsStock = true;
  return await internalUpsertProduct(schoolId, id, name, description, category, base_price, stock_quantity, nutri_points_reward, image_url, manualAllergens);
}

async function internalUpsertProduct(schoolId: string, id: string, name: string, description: string, category: string, base_price: number, stock_quantity: number, nutri_points_reward: number, image_url: string, manualAllergens: string[]) {
  const adminClient = await createAdminClient();
  const showsStock = true;


  // ── ALLERGEN DETECTION: Manual first, AI as fallback ──────────────────
  let detectedAllergens: string[] = manualAllergens;

  if (detectedAllergens.length === 0) {
    detectedAllergens = await detectAllergensAction(name, description);
  }
  // ───────────────────────────────────────────────────────────────────────


  const payload: any = {
    school_id: schoolId,
    name,
    description,
    category,
    base_price,
    stock_quantity: showsStock ? stock_quantity : null,
    nutri_points_reward,
    allergens: detectedAllergens,
    is_available: true
  };

  if (image_url) {
    payload.image_url = image_url;
  }

  if (id) {
    const { error } = await adminClient.from('products').update(payload).eq('id', id).eq('school_id', schoolId);
    if (error) return { error: error.message };
  } else {
    const { error } = await adminClient.from('products').insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath('/school/products');
  return { success: true };
}

/**
 * Detecta alérgenos usando IA basándose en el nombre y descripción del producto.
 * Accesible como Server Action desde el botón 'Mágico' del UI.
 */
export async function detectAllergensAction(name: string, description: string) {
  if (!process.env.OPENAI_API_KEY) return [];

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un nutricionista experto. Analiza el nombre y la descripción de este producto escolar. Identifica si contiene alguno de estos alérgenos comunes: lácteos, cacahuate, nuez, gluten, soya, huevo, mariscos. Devuelve ÚNICAMENTE un arreglo JSON puro de strings en minúsculas con los alérgenos detectados (ej. [\"lácteos\", \"nuez\"]). Si no detectas ninguno o es ambiguo, devuelve []. No uses formato markdown, solo el JSON puro."
        },
        {
          role: "user",
          content: `Producto: ${name}\nDescripción: ${description || 'Sin descripción'}`
        }
      ],
      temperature: 0,
    });

    const content = aiResponse.choices[0].message?.content || "[]";
    let detected = JSON.parse(content.trim());
    return Array.isArray(detected) ? detected : [];
  } catch (error) {
    console.error("OpenAI Allergen detection error:", error);
    return [];
  }
}

