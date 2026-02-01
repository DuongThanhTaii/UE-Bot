import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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

type ProviderType = 'groq' | 'openai' | 'claude';

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  provider?: ProviderType;
  apiKey?: string;
  model?: string;
}

interface ChatResult {
  content: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

async function chatWithGroq(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  model: string
): Promise<ChatResult> {
  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-10),
    ] as Groq.Chat.Completions.ChatCompletionMessageParam[],
    temperature: 0.7,
    max_tokens: 2048,
  });

  return {
    content: completion.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.',
    model: completion.model,
    usage: completion.usage ?? undefined,
  };
}

async function chatWithOpenAI(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  model: string
): Promise<ChatResult> {
  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-10),
    ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature: 0.7,
    max_tokens: 2048,
  });

  return {
    content: completion.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.',
    model: completion.model,
    usage: completion.usage ?? undefined,
  };
}

async function chatWithClaude(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  model: string
): Promise<ChatResult> {
  const anthropic = new Anthropic({ apiKey });

  // Filter out system messages and convert to Anthropic format
  const claudeMessages = messages.slice(-10).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const completion = await anthropic.messages.create({
    model,
    system: SYSTEM_PROMPT,
    messages: claudeMessages,
    temperature: 0.7,
    max_tokens: 2048,
  });

  const content = completion.content[0];
  const textContent =
    content.type === 'text' ? content.text : 'Sorry, I could not generate a response.';

  return {
    content: textContent,
    model: completion.model,
    usage: {
      prompt_tokens: completion.usage.input_tokens,
      completion_tokens: completion.usage.output_tokens,
      total_tokens: completion.usage.input_tokens + completion.usage.output_tokens,
    },
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ChatRequest;
    const { messages, provider = 'groq', apiKey, model } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // Use provided API key or fall back to environment variable
    const effectiveApiKey = apiKey ?? process.env.GROQ_API_KEY;

    if (!effectiveApiKey) {
      return NextResponse.json(
        { error: 'API key is required. Please configure your API key in Settings.' },
        { status: 400 }
      );
    }

    let result: ChatResult;

    switch (provider) {
      case 'openai':
        result = await chatWithOpenAI(messages, effectiveApiKey, model ?? 'gpt-4o-mini');
        break;
      case 'claude':
        result = await chatWithClaude(
          messages,
          effectiveApiKey,
          model ?? 'claude-sonnet-4-20250514'
        );
        break;
      case 'groq':
      default:
        result = await chatWithGroq(messages, effectiveApiKey, model ?? 'llama-3.3-70b-versatile');
        break;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof Groq.APIError) {
      return NextResponse.json(
        { error: `Groq API Error: ${error.message}` },
        { status: error.status ?? 500 }
      );
    }

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API Error: ${error.message}` },
        { status: error.status ?? 500 }
      );
    }

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API Error: ${error.message}` },
        { status: error.status ?? 500 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
