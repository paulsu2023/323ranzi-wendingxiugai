import { NextRequest, NextResponse } from 'next/server';
import { createGoogleClient } from '@/lib/google/client';
import { GEMINI_MODEL_ANALYSIS } from '@/constants';
import { shouldUseVertexAI } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = String(body?.apiKey || '').trim();
    const baseUrl = String(body?.baseUrl || '').trim();
    const model = String(body?.model || GEMINI_MODEL_ANALYSIS).trim();

    if (!apiKey && !shouldUseVertexAI) {
      return NextResponse.json({ error: '请输入 API Key，或在服务端配置 Vertex JSON 环境变量' }, { status: 400 });
    }

    const client = createGoogleClient({
      apiKey: apiKey || undefined,
      baseUrl,
    });

    await client.models.generateContent({
      model,
      contents: [{
        role: 'user',
        parts: [{ text: 'Reply with: ok' }],
      }],
    });

    return NextResponse.json({
      ok: true,
      providerLabel: apiKey ? (baseUrl ? 'Custom/AI Studio-Compatible' : 'Google AI Studio') : 'Google Vertex AI',
      model,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'API 验证失败' },
      { status: 500 }
    );
  }
}
