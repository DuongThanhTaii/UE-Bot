# 🔄 Demo Đồng Bộ Web - CLI - Telegram

## Mục tiêu
Chứng minh trước giảng viên rằng **Web Dashboard, CLI Tool, và Telegram Bot** đồng bộ được với nhau và có thể ra lệnh được.

---

## 📐 Kiến trúc Đồng bộ

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Web App   │   │   CLI Tool  │   │ Telegram Bot│
│ (localhost)  │   │ (terminal)  │   │  (mobile)   │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────────────────────────────────────────┐
│              @ue-bot/agent-core                  │
│  ┌─────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Groq AI │ │ Security │ │ Tool Registry    │  │
│  │ Provider│ │ Module   │ │ (fs,exec,web,..) │  │
│  └─────────┘ └──────────┘ └──────────────────┘  │
└─────────────────────┬───────────────────────────┘
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
  ┌─────────┐  ┌───────────┐  ┌──────────┐
  │ SQLite  │  │ File      │  │ Same     │
  │ Memory  │  │ System    │  │ Machine  │
  │ (shared)│  │ (shared)  │  │ (shared) │
  └─────────┘  └───────────┘  └──────────┘
```

### 3 Điểm Đồng Bộ:
1. **Shared Agent Core**: Cùng AI engine, cùng tools, cùng security rules
2. **Shared File System**: File tạo từ CLI → đọc được từ Web/Telegram
3. **Shared Memory (SQLite)**: Memory lưu từ CLI → recall từ Web/Telegram

---

## 🚀 Chuẩn bị (trước khi demo)

### Terminal 1: Web Dashboard
```bash
cd packages/webapp && npx next dev -p 3000
```

### Terminal 2: Telegram Bot
```bash
cd packages/telegram-bot && node dist/index.js
```

### Terminal 3: CLI Tool (sẵn sàng gõ lệnh)
```bash
cd packages/cli
```

### Mở sẵn:
- Browser: http://localhost:3000/chat
- Telegram app trên điện thoại → tìm @hcmue_agent_bot

---

## 🎯 Demo 1: Đồng bộ File System (2 phút)

### Bước 1: Tạo file từ CLI
```bash
node dist/index.js run "Tạo file demo-sync.txt với nội dung: 'Xin chào từ CLI! Thời gian: [hiện tại]'" --auto-approve
```
**Kết quả mong đợi**: ✅ File `demo-sync.txt` được tạo

### Bước 2: Đọc file từ Telegram
Gửi tin nhắn cho bot trên Telegram:
```
Đọc file demo-sync.txt cho tôi
```
**Kết quả mong đợi**: Bot trả về nội dung "Xin chào từ CLI!" → chứng minh Telegram đọc được file mà CLI tạo

### Bước 3: Sửa file từ Web Dashboard  
Vào http://localhost:3000/chat, gõ:
```
Thêm dòng "Cập nhật từ Web Dashboard" vào cuối file demo-sync.txt
```
**Kết quả mong đợi**: File được cập nhật

### Bước 4: Xác nhận từ CLI
```bash
node dist/index.js run "Đọc file demo-sync.txt" --auto-approve
```
**Kết quả mong đợi**: Thấy cả nội dung gốc từ CLI VÀ dòng cập nhật từ Web

### ✅ Kết luận Demo 1:
> "File tạo từ CLI → đọc được từ Telegram → sửa được từ Web → CLI thấy thay đổi. Ba nền tảng chia sẻ cùng file system."

---

## 🎯 Demo 2: Đồng bộ Security (1 phút)

### Bước 1: Thử lệnh nguy hiểm từ CLI
```bash
node dist/index.js run "Chạy lệnh: rm -rf /" --auto-approve
```
**Kết quả**: ❌ BỊ CHẶN - "Không thể thực hiện vì lý do bảo mật"

### Bước 2: Thử lệnh tương tự từ Telegram
```
Chạy lệnh rm -rf / cho tôi
```
**Kết quả**: ❌ BỊ CHẶN - Cùng security module

### Bước 3: Thử lệnh tương tự từ Web
```
Chạy lệnh: format C:
```
**Kết quả**: ❌ BỊ CHẶN

### ✅ Kết luận Demo 2:
> "Cùng Security Module áp dụng đồng nhất trên cả 3 nền tảng. Lệnh nguy hiểm bị chặn everywhere."

---

## 🎯 Demo 3: Đồng bộ Lệnh Thực Thi (2 phút)

### Bước 1: Chạy lệnh từ CLI
```bash
node dist/index.js run "Chạy lệnh: echo 'Hello from UE-Bot' > hello-sync.txt && cat hello-sync.txt" --auto-approve
```
**Kết quả**: ✅ Tạo file và hiển thị nội dung

### Bước 2: Kiểm tra từ Telegram
```
Đọc nội dung file hello-sync.txt
```
**Kết quả**: Thấy "Hello from UE-Bot"

### Bước 3: Chạy lệnh từ Telegram
```
Chạy lệnh: echo 'Updated by Telegram' >> hello-sync.txt
```

### Bước 4: Kiểm tra từ Web
```
Đọc file hello-sync.txt
```
**Kết quả**: Thấy cả 2 dòng - từ CLI và từ Telegram

### ✅ Kết luận Demo 3:
> "Cả 3 nền tảng đều có thể ra lệnh thực thi trên cùng hệ thống, và kết quả đồng bộ ngay lập tức."

---

## 🎯 Demo 4: Cùng AI Engine (1 phút)

### Hỏi cùng câu hỏi trên cả 3 nền tảng:

**CLI:**
```bash
node dist/index.js run "Bạn là ai? Trả lời 1 câu." --no-tools
```

**Telegram:**
```
Bạn là ai? Trả lời 1 câu.
```

**Web:**
```
Bạn là ai? Trả lời 1 câu.
```

### ✅ Kết luận Demo 4:
> "Cả 3 đều trả lời 'Tôi là UE-Bot' - chứng minh sử dụng cùng AI engine (Groq LLaMA 3.3 70B)."

---

## 📊 Bảng Tổng Kết Demo

| Tính năng          | Web | CLI | Telegram | Đồng bộ? |
|--------------------|-----|-----|----------|-----------|
| Chat với AI        | ✅  | ✅  | ✅       | ✅ Cùng Groq AI |
| Tạo/Đọc file       | ✅  | ✅  | ✅       | ✅ Cùng File System |
| Chạy lệnh          | ✅  | ✅  | ✅       | ✅ Cùng Runtime |
| Security chặn      | ✅  | ✅  | ✅       | ✅ Cùng Security Module |
| Memory (nhớ)       | ✅  | ✅  | ✅       | ✅ Cùng SQLite DB |
| Tool execution      | ✅  | ✅  | ✅       | ✅ Cùng Tool Registry |

---

## 💡 Câu trả lời cho Thầy

> **"Web, CLI và Telegram đồng bộ được với nhau vì:"**
>
> 1. **Shared Agent Core**: Cả 3 interface đều sử dụng cùng package `@ue-bot/agent-core` - nghĩa là cùng AI engine, cùng tool definitions, cùng security rules.
>
> 2. **Shared File System**: Cả 3 chạy trên cùng máy, file tạo từ CLI ngay lập tức đọc được từ Web và Telegram.
>
> 3. **Shared Memory Database**: Cả 3 đều dùng cùng SQLite database (ở `~/.ue-bot/data/memory.db`), nên thông tin lưu từ CLI có thể recall từ Web hoặc Telegram.
>
> 4. **Uniform Security**: Cùng security module chặn lệnh nguy hiểm trên tất cả nền tảng.
>
> **Đây là kiến trúc Microservices + Shared Core**: mỗi interface (Web/CLI/Telegram) là một service độc lập nhưng chia sẻ cùng business logic core.

---

## ⏱️ Thời gian Demo: ~6 phút

| Demo | Nội dung | Thời gian |
|------|----------|-----------|
| 1 | File System Sync | 2 phút |
| 2 | Security Sync | 1 phút |
| 3 | Command Execution Sync | 2 phút |
| 4 | Same AI Engine | 1 phút |
