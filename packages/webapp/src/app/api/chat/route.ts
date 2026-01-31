import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `Bạn là UE-Bot, trợ lý AI thông minh được phát triển bởi sinh viên Đại học Sư phạm TP.HCM.

Nhiệm vụ của bạn:
- Hỗ trợ người dùng với mọi câu hỏi và yêu cầu
- Trả lời bằng tiếng Việt hoặc tiếng Anh tùy theo ngôn ngữ người dùng sử dụng
- Thân thiện, hữu ích và chính xác
- Hỗ trợ điều khiển thiết bị ESP32 thông minh (khi được yêu cầu)

Khả năng đặc biệt:
- Xử lý lệnh giọng nói từ thiết bị ESP32
- Điều khiển thiết bị nhà thông minh
- Trả lời câu hỏi tổng quát
- Hỗ trợ lập trình và kỹ thuật

Hãy trả lời ngắn gọn, súc tích nhưng đầy đủ thông tin.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.slice(-10), // Keep last 10 messages for context
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    const content =
      completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({
      content,
      model: completion.model,
      usage: completion.usage,
    });
  } catch (error) {
    console.error('Groq API error:', error);

    if (error instanceof Groq.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
