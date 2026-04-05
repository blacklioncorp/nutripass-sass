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

  const showsStock = true; // All categories now have stock management

  // ── AI ALLERGEN DETECTION ──────────────────────────────────────────────
  let detectedAllergens: string[] = [];
  if (process.env.OPENAI_API_KEY) {
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
      detectedAllergens = JSON.parse(content.trim());
      if (!Array.isArray(detectedAllergens)) detectedAllergens = [];
    } catch (error) {
      console.error("OpenAI Allergen detection error:", error);
      detectedAllergens = []; // Fallback safely
    }
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
