# TASK-006: Initialize Webapp Package

## Task Information

- **ID**: T006
- **Phase**: 1 - Foundation
- **Priority**: High
- **Estimated Hours**: 4h
- **Dependencies**: T005

---

## Objective

Khởi tạo Next.js 14 webapp với App Router, TailwindCSS, và Shadcn/UI.

---

## Acceptance Criteria

- [ ] Next.js 14 app initialized
- [ ] TailwindCSS configured
- [ ] Shadcn/UI setup
- [ ] Basic layout created
- [ ] Dev server runs successfully

---

## Instructions

### Step 1: Create Next.js App

```bash
cd packages
pnpm create next-app@latest webapp --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd webapp
```

### Step 2: Update package.json

```json
{
  "name": "@ue-bot/webapp",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "typecheck": "tsc --noEmit",
    "clean": "rimraf .next"
  },
  "dependencies": {
    "@ue-bot/shared": "workspace:*",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0",
    "class-variance-authority": "^0.7.0",
    "zustand": "^4.5.0",
    "socket.io-client": "^4.7.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0",
    "postcss": "^8.4.0",
    "prettier-plugin-tailwindcss": "^0.6.0",
    "rimraf": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0"
  }
}
```

### Step 3: Setup Shadcn/UI

```bash
cd packages/webapp
pnpm dlx shadcn-ui@latest init
```

Choose options:

- Style: Default
- Base color: Slate
- CSS variables: Yes

Install common components:

```bash
pnpm dlx shadcn-ui@latest add button card input label badge separator
pnpm dlx shadcn-ui@latest add dropdown-menu dialog sheet tabs toast
pnpm dlx shadcn-ui@latest add avatar scroll-area skeleton switch
```

### Step 4: Create Folder Structure

```
packages/webapp/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx
│   │   │   ├── chat/
│   │   │   │   └── page.tsx
│   │   │   ├── devices/
│   │   │   │   └── page.tsx
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   └── health/
│   │   │       └── route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/             # Shadcn components
│   │   ├── features/
│   │   │   ├── chat/
│   │   │   ├── devices/
│   │   │   └── voice/
│   │   └── layouts/
│   │       ├── header.tsx
│   │       ├── sidebar.tsx
│   │       └── footer.tsx
│   ├── hooks/
│   │   ├── use-gateway.ts
│   │   ├── use-devices.ts
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── utils.ts
│   │   └── cn.ts
│   ├── services/
│   │   ├── gateway.service.ts
│   │   └── api.service.ts
│   ├── stores/
│   │   ├── auth.store.ts
│   │   ├── chat.store.ts
│   │   └── device.store.ts
│   └── types/
│       └── index.ts
├── public/
│   └── icons/
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

### Step 5: Create Base Layout

#### src/app/layout.tsx

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UE-Bot Dashboard",
  description:
    "Control panel for UE-Bot - AI Assistant with ESP32 voice control",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="min-h-screen bg-background">{children}</div>
      </body>
    </html>
  );
}
```

#### src/app/page.tsx

```tsx
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">🤖 UE-Bot</h1>
        <p className="text-muted-foreground text-lg">
          AI Assistant with ESP32 Voice Control
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link href="/login">Get Started</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link
              href="https://github.com/DuongThanhTaii/UE-Bot"
              target="_blank"
            >
              GitHub
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
```

### Step 6: Create Dashboard Layout

#### src/app/(dashboard)/layout.tsx

```tsx
import { Sidebar } from "@/components/layouts/sidebar";
import { Header } from "@/components/layouts/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  );
}
```

#### src/components/layouts/sidebar.tsx

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Cpu,
  Settings,
  Bot,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/devices", label: "Devices", icon: Cpu },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-background flex flex-col">
      <div className="p-6 border-b">
        <Link href="/" className="flex items-center gap-2">
          <Bot className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl">UE-Bot</span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.href}
            variant={pathname === item.href ? "secondary" : "ghost"}
            className={cn("w-full justify-start gap-2")}
            asChild
          >
            <Link href={item.href}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>
    </aside>
  );
}
```

#### src/components/layouts/header.tsx

```tsx
"use client";

import { Bell, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Header() {
  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold">Dashboard</h2>
      </div>
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Gateway Online
        </Badge>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
```

### Step 7: Create Utils

#### src/lib/utils.ts

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Step 8: Create API Health Check

#### src/app/api/health/route.ts

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "@ue-bot/webapp",
  });
}
```

### Step 9: Test the Application

```bash
cd packages/webapp
pnpm dev
```

Visit http://localhost:3000

---

## Verification Checklist

- [ ] `pnpm dev` starts without errors
- [ ] Home page renders correctly
- [ ] TailwindCSS styles applied
- [ ] Shadcn/UI components work
- [ ] Health endpoint returns JSON
- [ ] No TypeScript errors

---

## Git Commit

```bash
git add .
git commit -m "feat(webapp): initialize Next.js webapp with Shadcn/UI [T006]"
git push
```

---

## Notes

- App Router (not Pages Router) được sử dụng
- Shadcn/UI components trong src/components/ui/
- Feature components trong src/components/features/
- Server Components by default, 'use client' khi cần
