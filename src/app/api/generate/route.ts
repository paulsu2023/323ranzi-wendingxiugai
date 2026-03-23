import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@/lib/supabase/server';
import { CREDIT_COSTS } from '@/constants';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { type, prompt, aspectRatio, resolution, referenceImages, imageModel, cameraPrompt, stylePrompt } = body;

    if (type !== 'image' && type !== 'audio') {
      return NextResponse.json({ error: '无效的生成类型' }, { status: 400 });
    }

    const cost = type === 'image' ? CREDIT_COSTS.IMAGE_GEN : CREDIT_COSTS.AUDIO_GEN;
    const opType = type === 'image' ? 'image_gen' : 'audio_gen';
    const opDesc = type === 'image' ? '图片帧生成' : '语音合成';

    const { data: deductResult, error: deductError } = await supabase
      .rpc('deduct_credits', {
        p_user_id: user.id,
        p_amount: cost,
        p_type: opType,
        p_description: opDesc,
      });

    if (deductError) throw deductError;
    if (!deductResult?.[0]?.success) {
      return NextResponse.json(
        { error: deductResult?.[0]?.error || '点数不足，请充值' },
        { status: 402 }
      );
    }

    if (type === 'image') {
      const { generateImage } = await import('@/lib/gemini/geminiService');
      const base64 = await generateImage(
        genai, prompt, aspectRatio, resolution,
        referenceImages || [], imageModel, cameraPrompt, stylePrompt
      );
      return NextResponse.json({ base64, creditsRemaining: deductResult[0].new_balance });
    }

    if (type === 'audio') {
      const { generateSpeech } = await import('@/lib/gemini/geminiService');
      const base64Wav = await generateSpeech(genai, body.text, body.voiceName);
      return NextResponse.json({ base64: base64Wav, creditsRemaining: deductResult[0].new_balance });
    }
  } catch (error: any) {
    console.error('[API/generate] Error:', error);
    return NextResponse.json({ error: error.message || '生成失败' }, { status: 500 });
  }
}
