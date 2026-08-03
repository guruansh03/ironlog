export interface GeminiNutritionResult {
  foodName: string;
  confidence: number;
  nutritionPerServing: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
  };
  servingEstimate: string;
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export async function analyzeFoodImage(
  base64Image: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<GeminiNutritionResult> {
  const prompt = `You are a nutrition estimation assistant.
Analyze the food in this image.
Respond ONLY with valid JSON in this exact format:
{
  "foodName": "string",
  "confidence": 0.0-1.0,
  "nutritionPerServing": {
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fats_g": number
  },
  "servingEstimate": "string description"
}
Do not include markdown, explanations, or extra text.`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
    },
  };

  const url = `${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  let parsed: GeminiNutritionResult;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Sometimes Gemini wraps in markdown despite instructions
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    parsed = JSON.parse(cleaned);
  }

  // Validate and sanitize
  return {
    foodName: typeof parsed.foodName === 'string' ? parsed.foodName : 'Unknown Food',
    confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
    nutritionPerServing: {
      calories: Math.max(0, Number(parsed.nutritionPerServing?.calories) || 0),
      protein_g: Math.max(0, Number(parsed.nutritionPerServing?.protein_g) || 0),
      carbs_g: Math.max(0, Number(parsed.nutritionPerServing?.carbs_g) || 0),
      fats_g: Math.max(0, Number(parsed.nutritionPerServing?.fats_g) || 0),
    },
    servingEstimate: typeof parsed.servingEstimate === 'string' ? parsed.servingEstimate : '1 serving',
  };
}
