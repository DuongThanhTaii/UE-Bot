/**
 * @fileoverview Telegram Bot with full AI Agent support
 * Supports tool execution (open URLs, search web, read files, etc.)
 */

import 'dotenv/config';
import { Bot, Context } from 'grammy';
import {
  getAgentForUser,
  clearUserAgent,
  executeMessage,
  formatToolsUsedMessage,
  type TelegramAgentConfig,
} from './agent.js';

// Validate environment variables
const TELEGRAM_BOT_TOKEN = process.env['TELEGRAM_BOT_TOKEN'];
const GROQ_API_KEY = process.env['GROQ_API_KEY'];
const BRAVE_API_KEY = process.env['BRAVE_SEARCH_API_KEY'];

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

if (!GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is required');
}

// Initialize Telegram bot
const bot = new Bot(TELEGRAM_BOT_TOKEN);

// Agent configuration
const agentConfig: TelegramAgentConfig = {
  apiKey: GROQ_API_KEY,
  model: process.env['GROQ_MODEL'] ?? 'llama-3.3-70b-versatile',
  braveApiKey: BRAVE_API_KEY,
  workingDirectory: process.cwd(),
};

// Handle /start command
bot.command('start', async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (userId) {
    clearUserAgent(userId);
  }
  await ctx.reply(
    '🤖 *Xin chào! Tôi là UE Bot - AI Agent thông minh!*\n\n' +
      '🛠️ *Tôi có thể:*\n' +
      '• Mở website (VD: "Mở YouTube")\n' +
      '• Tìm kiếm web (VD: "Tìm tin tức AI mới nhất")\n' +
      '• Đọc/ghi file\n' +
      '• Chạy lệnh terminal\n' +
      '• Nhớ thông tin cho bạn\n\n' +
      '📝 *Lệnh:*\n' +
      '/start - Bắt đầu lại\n' +
      '/clear - Xóa lịch sử\n' +
      '/tools - Xem danh sách tools\n' +
      '/help - Trợ giúp\n\n' +
      '_Hãy thử: "Mở youtube.com" hoặc "Tìm thời tiết Sài Gòn"_',
    { parse_mode: 'Markdown' }
  );
});

// Handle /clear command
bot.command('clear', async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (userId) {
    clearUserAgent(userId);
  }
  await ctx.reply('✅ Đã xóa lịch sử. Bắt đầu cuộc trò chuyện mới!');
});

// Handle /tools command
bot.command('tools', async (ctx: Context) => {
  await ctx.reply(
    '🔧 *Các Tools có sẵn:*\n\n' +
      '📂 *File System:*\n' +
      '• `read` - Đọc file\n' +
      '• `write` - Ghi file\n' +
      '• `edit` - Sửa file\n' +
      '• `list` - Liệt kê thư mục\n' +
      '• `search` - Tìm file\n\n' +
      '⚡ *Runtime:*\n' +
      '• `exec` - Chạy lệnh\n' +
      '• `bash` - Chạy script\n' +
      '• `open` - Mở URL/app\n\n' +
      '🌐 *Web:*\n' +
      '• `web_search` - Tìm kiếm web\n' +
      '• `web_fetch` - Đọc nội dung web\n\n' +
      '🧠 *Memory:*\n' +
      '• `memory_save` - Lưu thông tin\n' +
      '• `memory_search` - Tìm thông tin đã lưu',
    { parse_mode: 'Markdown' }
  );
});

// Handle /help command
bot.command('help', async (ctx: Context) => {
  await ctx.reply(
    '📚 *Hướng dẫn sử dụng UE Bot*\n\n' +
      '*Ví dụ câu lệnh:*\n' +
      '• "Mở youtube.com"\n' +
      '• "Tìm kiếm thời tiết Sài Gòn"\n' +
      '• "Đọc file package.json"\n' +
      '• "Tạo file hello.txt với nội dung Hello"\n' +
      '• "Chạy lệnh npm --version"\n' +
      '• "Nhớ rằng màu yêu thích của tôi là xanh"\n' +
      '• "Màu yêu thích của tôi là gì?"\n\n' +
      '*Lưu ý:*\n' +
      '• Bot sẽ tự động thực thi tools khi cần\n' +
      '• Một số tools có thể mất vài giây\n' +
      '• Sử dụng /clear để xóa ngữ cảnh',
    { parse_mode: 'Markdown' }
  );
});

// Handle all text messages
bot.on('message:text', async (ctx) => {
  const from = ctx.from;
  const userId = from?.id;
  const ctxMessage = ctx.message;
  const messageText = ctxMessage.text;

  if (!userId || !messageText) return;

  // Skip commands
  if (messageText.startsWith('/')) return;

  // Show typing indicator
  await ctx.replyWithChatAction('typing');

  try {
    // Get or create agent for user
    const agent = getAgentForUser(userId, agentConfig);

    // Keep typing indicator active
    const typingInterval = setInterval(() => {
      void ctx.replyWithChatAction('typing').catch(() => {
        // Ignore typing errors
      });
    }, 4000);

    // Execute message with agent
    const response = await executeMessage(
      agent,
      messageText,
      // onToolStart
      (name, _args) => {
        console.warn(`[User ${String(userId)}] Tool started: ${name}`);
      },
      // onToolResult
      (name, success) => {
        console.warn(`[User ${String(userId)}] Tool ${name}: ${success ? 'success' : 'failed'}`);
      }
    );

    clearInterval(typingInterval);

    // Build response message
    let replyText = response.content;

    // Add tools used info
    if (response.toolsUsed.length > 0) {
      const toolsMessage = formatToolsUsedMessage(response.toolsUsed);
      replyText = `${replyText}\n\n${toolsMessage}`;
    }

    // Truncate if too long for Telegram
    if (replyText.length > 4000) {
      replyText = replyText.slice(0, 3900) + '\n\n_...(tin nhắn đã được cắt ngắn)_';
    }

    // Reply to user
    await ctx.reply(replyText, {
      reply_to_message_id: ctxMessage.message_id,
      parse_mode: 'Markdown',
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[User ${String(userId)}] Error:`, err.message);

    let errorMessage = '❌ Xin lỗi, có lỗi xảy ra.';

    if (err.message.includes('context') || err.message.includes('overflow')) {
      clearUserAgent(userId);
      errorMessage = '❌ Cuộc hội thoại quá dài. Đã reset, hãy thử lại!';
    } else if (err.message.includes('rate')) {
      errorMessage = '⏳ Quá nhiều yêu cầu. Vui lòng đợi một chút.';
    }

    await ctx.reply(errorMessage, {
      reply_to_message_id: ctxMessage.message_id,
    });
  }
});

// Error handling
bot.catch((err) => {
  console.error('Bot error:', err);
});

// Start the bot
console.warn('🤖 Starting UE Bot with Agent Core...');
console.warn('🛠️  Tools enabled: fs, runtime, web, memory, open');
void bot.start({
  onStart: (botInfo) => {
    console.warn(`✅ Bot started as @${botInfo.username}`);
    console.warn('📱 Send a message to test!');
  },
});
