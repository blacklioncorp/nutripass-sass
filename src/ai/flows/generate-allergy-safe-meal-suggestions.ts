'use server';
/**
 * @fileOverview A Genkit flow for generating allergy-safe meal suggestions based on dietary restrictions and daily menus.
 *
 * - generateAllergySafeMealSuggestions - A function that handles the generation of meal suggestions.
 * - GenerateMealSuggestionsInput - The input type for the generateAllergySafeMealSuggestions function.
 * - GenerateMealSuggestionsOutput - The return type for the generateAllergySafeMealSuggestions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateMealSuggestionsInputSchema = z.object({
  dietaryRestrictions: z.array(z.string()).describe('A list of dietary restrictions or allergies for the student.'),
  dailyMenu: z.string().describe('A description of the daily menu items available in the school cafeteria.'),
  studentName: z.string().optional().describe('The name of the student for personalization, if available.'),
});
export type GenerateMealSuggestionsInput = z.infer<typeof GenerateMealSuggestionsInputSchema>;

const GenerateMealSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of allergy-safe alternative meal suggestions.'),
});
export type GenerateMealSuggestionsOutput = z.infer<typeof GenerateMealSuggestionsOutputSchema>;

export async function generateAllergySafeMealSuggestions(input: GenerateMealSuggestionsInput): Promise<GenerateMealSuggestionsOutput> {
  return generateAllergySafeMealSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'allergySafeMealSuggestionsPrompt',
  input: { schema: GenerateMealSuggestionsInputSchema },
  output: { schema: GenerateMealSuggestionsOutputSchema },
  prompt: `You are an expert nutritionist and chef specializing in creating delicious and safe meal alternatives for children with dietary restrictions.
Given the student's dietary restrictions and the daily menu, your task is to suggest allergy-safe alternative meal options.
Focus on providing practical and appealing suggestions suitable for a school cafeteria setting.

{{#if studentName}}Student's Name: {{studentName}}
{{/if}}
Dietary Restrictions:
{{#each dietaryRestrictions}}- {{this}}
{{/each}}
Daily Menu:
{{{dailyMenu}}}

Based on the above, please provide a list of allergy-safe meal suggestions that are suitable alternatives to the daily menu.
The suggestions should be brief and clear.`,
});

const generateAllergySafeMealSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateAllergySafeMealSuggestionsFlow',
    inputSchema: GenerateMealSuggestionsInputSchema,
    outputSchema: GenerateMealSuggestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate allergy-safe meal suggestions.');
    }
    return output;
  }
);
