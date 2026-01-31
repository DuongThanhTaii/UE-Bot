# TASK-017: Setup Telegram Channel (Optional)

## Task Information

- **ID**: T017
- **Phase**: 2 - Core Integration
- **Priority**: Low
- **Estimated Hours**: 2h
- **Dependencies**: T013 (Configure Moltbot)

---

## Objective

Setup Telegram channel trong Moltbot để hỗ trợ điều khiển bot qua Telegram (optional feature).

---

## Acceptance Criteria

- [ ] Telegram Bot created via BotFather
- [ ] Telegram channel configured in Moltbot
- [ ] Messages sent/received successfully
- [ ] Basic commands working

---

## Instructions

### Step 1: Create Telegram Bot

1. Mở Telegram và tìm `@BotFather`
2. Gửi `/newbot`
3. Làm theo hướng dẫn để tạo bot
4. Lưu lại **Bot Token**

### Step 2: Configure Environment

Thêm vào `external/moltbot/.env`:

```env
# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_ALLOWED_USERS=your_telegram_user_id
```

### Step 3: Get Your Telegram User ID

1. Tìm `@userinfobot` trên Telegram
2. Gửi `/start` để nhận User ID
3. Thêm ID vào `TELEGRAM_ALLOWED_USERS`

### Step 4: Test Telegram Channel

1. Start Moltbot Gateway:

   ```bash
   cd external/moltbot
   pnpm run gateway
   ```

2. Gửi message cho bot trên Telegram
3. Verify response từ bot

### Step 5: Configure Commands (Optional)

Gửi cho BotFather:

```
/setcommands
```

Thêm commands:

```
start - Start the bot
help - Show help message
status - Check bot status
```

---

## Verification Checklist

- [ ] Bot created via BotFather
- [ ] Token added to .env
- [ ] User ID configured
- [ ] Messages working

---

## Notes

- This is an optional task
- Primary channel is WebChat
- Telegram useful for mobile notifications
- Can be skipped if not needed

---

## Related Tasks

- **T013**: Configure Moltbot (prerequisite)
- **T014**: Setup WebChat (primary channel)
