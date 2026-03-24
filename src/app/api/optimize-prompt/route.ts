import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { createClient } from '@/lib/supabase/server';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const GEMINI_MODEL_ANALYSIS = 'gemini-3-flash-preview';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { currentPrompt, visualDesc, masterPrompt } = await request.json();

    const systemInstruction = `You are an expert stable diffusion prompt engineer. Your job is to improve the given prompt.
    CRITICAL INSTRUCTION: Read the MASTER PROMPT carefully. You must maintain identical subject features (clothing, hair, ethnicity, age, colors).
    Only change the background/action as described in the Visual Description.`;

    const promptText = `
    MASTER PROMPT (from Scene 1): ${masterPrompt || 'None'}
    Current Prompt: ${currentPrompt}
    Target Visual: ${visualDesc}
    Return ONLY the optimized text prompt. No markdown, no explanations.`;

    const response = await genai.models.generateContent({
      model: GEMINI_MODEL_ANALYSIS,
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      config: { systemInstruction }
    });

    const optimized = response.text || currentPrompt;

    return NextResponse.json({ optimized });
  } catch (error: any) {
    console.error('[API/optimize-prompt] Error:', error);
    return NextResponse.json({ error: error.message || '优化失败' }, { status: 500 });
  }
}
