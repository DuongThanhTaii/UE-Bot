import 'dotenv/config';
import { Bot, Context } from 'grammy';
import Groq from 'groq-sdk';

// Validate environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

if (!GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is required');
}

// Initialize Groq client
const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

// Initialize Telegram bot
const bot = new Bot(TELEGRAM_BOT_TOKEN);

// Store conversation history per user (simple in-memory)
const conversations = new Map<number, Array<{ role: 'user' | 'assistant'; content: string }>>();

// System prompt - keep it minimal to avoid context overflow
const SYSTEM_PROMPT = `Bạn là UE Bot, một trợ lý AI thông minh của Đại học Sư phạm TP.HCM.
Hãy trả lời ngắn gọn, hữu ích và thân thiện bằng tiếng Việt.`;

// Get AI response from Groq
async function getAIResponse(userId: number, message: string): Promise<string> {
  // Get or create conversation history
  let history = conversations.get(userId) || [];

  // Add user message to history
  history.push({ role: 'user', content: message });

  // Keep only last 5 messages to avoid context overflow
  if (history.length > 10) {
    history = history.slice(-10);
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
      max_tokens: 1024,
      temperature: 0.7,
    });

    const reply =
      completion.choices[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời lúc này.';

    // Add assistant response to history
    history.push({ role: 'assistant', content: reply });
    conversations.set(userId, history);

    return reply;
  } catch (error: any) {
    console.error('Groq API error:', error.message);

    // Clear history on error to reset
    if (error.message?.includes('context') || error.message?.includes('overflow')) {
      conversations.delete(userId);
      return 'Xin lỗi, cuộc hội thoại quá dài. Hãy bắt đầu lại nhé!';
    }

    return `Xin lỗi, có lỗi xảy ra: ${error.message}`;
  }
}

// Handle /start command
bot.command('start', async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (userId) {
    conversations.delete(userId); // Reset conversation
  }
  await ctx.reply(
    '🤖 Xin chào! Tôi là UE Bot - Trợ lý AI của Đại học Sư phạm TP.HCM.\n\n' +
      'Bạn có thể hỏi tôi bất cứ điều gì!\n\n' +
      'Lệnh:\n' +
      '/start - Bắt đầu lại cuộc trò chuyện\n' +
      '/clear - Xóa lịch sử hội thoại'
  );
});

// Handle /clear command
bot.command('clear', async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (userId) {
    conversations.delete(userId);
  }
  await ctx.reply('✅ Đã xóa lịch sử hội thoại. Hãy bắt đầu cuộc trò chuyện mới!');
});

// Handle all text messages
bot.on('message:text', async (ctx: Context) => {
  const userId = ctx.from?.id;
  const message = ctx.message?.text;

  if (!userId || !message) return;

  // Show typing indicator
  await ctx.replyWithChatAction('typing');

  // Get AI response
  const response = await getAIResponse(userId, message);

  // Reply to user
  await ctx.reply(response, {
    reply_to_message_id: ctx.message?.message_id,
  });
});

// Error handling
bot.catch((err) => {
  console.error('Bot error:', err);
});

// Start the bot
console.log('🤖 Starting UE Bot...');
bot.start({
  onStart: (botInfo) => {
    console.log(`✅ Bot started as @${botInfo.username}`);
    console.log('📱 Send a message to the bot to test!');
  },
});
