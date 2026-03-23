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
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }

    // Atomic credit deduction (DB-level lock prevents race conditions)
    const { data: deductResult, error: deductError } = await supabase
      .rpc('deduct_credits', {
        p_user_id: user.id,
        p_amount: CREDIT_COSTS.ANALYZE,
        p_type: 'analyze',
        p_description: '产品分析 & 脚本生成',
      });

    if (deductError) throw deductError;
    if (!deductResult?.[0]?.success) {
      return NextResponse.json(
        { error: deductResult?.[0]?.error || '点数不足，请充值' },
        { status: 402 }
      );
    }

    const body = await request.json();
    const { product, sceneCount } = body;

    // === All Gemini logic runs SERVER SIDE, API key never leaves server ===
    const { analyzeProduct } = await import('@/lib/gemini/geminiService');
    const result = await analyzeProduct(genai, product, sceneCount);

    return NextResponse.json({
      result,
      creditsRemaining: deductResult[0].new_balance,
    });
  } catch (error: any) {
    console.error('[API/analyze] Error:', error);
    return NextResponse.json(
      { error: error.message || '服务器内部错误' },
      { status: 500 }
    );
  }
}
