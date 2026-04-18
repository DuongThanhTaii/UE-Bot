# Sync API

Backend cho dang nhap + dong bo chat giua web/desktop.

## Neon connection nen chon gi

Voi backend Node.js dung `pg`, ban nen dung **Connection string** cua Neon (URL dang `postgresql://...`).

- Cho moi truong production cua app: co the dung **Pooled connection string**.
- Cho migrate DDL: nen uu tien **Direct connection string** de tranh rang buoc transaction cua pooler.

De don gian cho du an hien tai, ban co the dung luon 1 `DATABASE_URL` (direct) cho ca start + migrate.

## Env

1. Copy `sync-api/.env.example` thanh `sync-api/.env`
2. Dien gia tri that vao `.env`

## Run

```bash
cd sync-api
npm install
npm run migrate
npm run dev
```

Luu y:
- `npm run migrate` chi chay migrate bang roi thoat.
- `npm run dev`/`npm run start` cung tu chay migrate truoc khi listen.

## Web app env

1. Copy `web-app/.env.example` thanh `web-app/.env`
2. Dat `VITE_SYNC_API_URL` tro ve Sync API:

```bash
VITE_SYNC_API_URL=http://localhost:4010
```

Khi bat bien nay, `threads/messages` se dung Sync API thay vi luu local extension.
