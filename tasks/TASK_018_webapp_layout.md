# TASK-018: Create Webapp Layout

## Task Information

- **ID**: T018
- **Phase**: 2 - Core Integration
- **Priority**: High
- **Estimated Hours**: 4h
- **Dependencies**: T007 (Setup Next.js Webapp)

---

## Objective

Tạo layout chính cho webapp bao gồm:

- Navigation bar
- Sidebar (responsive)
- Main content area
- Footer
- Theme switching (dark/light)

---

## Acceptance Criteria

- [ ] Root layout với metadata
- [ ] Header component với navigation
- [ ] Responsive sidebar
- [ ] Theme toggle (dark/light mode)
- [ ] Mobile-friendly design
- [ ] All Shadcn components installed

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Header                              │
│  ┌─────┐                              ┌───┐ ┌───┐ ┌───┐ │
│  │Logo │  Home  Dashboard  Chat       │🔔 │ │🌙 │ │👤 │ │
│  └─────┘                              └───┘ └───┘ └───┘ │
├─────────────────────────────────────────────────────────┤
│         │                                               │
│         │                                               │
│ Sidebar │              Main Content                     │
│         │                                               │
│  • Dashboard │                                          │
│  • Chat      │                                          │
│  • Devices   │                                          │
│  • Settings  │                                          │
│              │                                          │
├─────────────────────────────────────────────────────────┤
│                      Footer                              │
└─────────────────────────────────────────────────────────┘
```

---

## Instructions

### Step 1: Install Shadcn Components

```bash
cd packages/webapp

# Initialize Shadcn
npx shadcn@latest init

# Install components
npx shadcn@latest add button
npx shadcn@latest add dropdown-menu
npx shadcn@latest add avatar
npx shadcn@latest add sheet
npx shadcn@latest add separator
npx shadcn@latest add scroll-area
npx shadcn@latest add tooltip
npx shadcn@latest add badge
npx shadcn@latest add card
```

### Step 2: Setup Theme Provider

Tạo file `packages/webapp/src/components/providers/theme-provider.tsx`:

```tsx
'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

Install next-themes:

```bash
pnpm add next-themes
```

### Step 3: Create Theme Toggle

Tạo file `packages/webapp/src/components/ui/theme-toggle.tsx`:

```tsx
'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Step 4: Create Header Component

Tạo file `packages/webapp/src/components/layouts/header.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Bell, Bot } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MobileSidebar } from './mobile-sidebar';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Chat', href: '/chat' },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] sm:w-[300px]">
            <MobileSidebar />
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Bot className="h-6 w-6" />
          <span className="font-bold">UE-Bot</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'transition-colors hover:text-foreground/80',
                pathname === item.href ? 'text-foreground' : 'text-foreground/60'
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center space-x-2">
          {/* Notifications */}
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/user.png" alt="User" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
```

### Step 5: Create Sidebar Component

Tạo file `packages/webapp/src/components/layouts/sidebar.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Cpu, Settings, Mic } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const sidebarItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Chat',
    href: '/chat',
    icon: MessageSquare,
  },
  {
    title: 'Devices',
    href: '/devices',
    icon: Cpu,
  },
  {
    title: 'Voice Control',
    href: '/voice',
    icon: Mic,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn('pb-12', className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Navigation</h2>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="space-y-1">
              {sidebarItems.map((item) => (
                <Button
                  key={item.href}
                  variant={pathname === item.href ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Link>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
```

### Step 6: Create Mobile Sidebar

Tạo file `packages/webapp/src/components/layouts/mobile-sidebar.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sidebar } from './sidebar';

export function MobileSidebar() {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center space-x-2 px-4 py-4 border-b">
        <Bot className="h-6 w-6" />
        <span className="font-bold">UE-Bot</span>
      </div>

      {/* Navigation */}
      <Sidebar className="flex-1" />
    </div>
  );
}
```

### Step 7: Create Footer Component

Tạo file `packages/webapp/src/components/layouts/footer.tsx`:

```tsx
import Link from 'next/link';
import { Bot } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5" />
          <p className="text-sm text-muted-foreground">© 2025 UE-Bot. Built with ❤️</p>
        </div>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <Link href="/docs" className="hover:underline">
            Documentation
          </Link>
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
          <Link
            href="https://github.com/DuongThanhTaii/UE-Bot"
            className="hover:underline"
            target="_blank"
          >
            GitHub
          </Link>
        </div>
      </div>
    </footer>
  );
}
```

### Step 8: Update Root Layout

Cập nhật file `packages/webapp/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'UE-Bot - AI Voice Assistant',
  description: 'Control your AI assistant with voice commands via ESP32',
  keywords: ['AI', 'voice assistant', 'ESP32', 'chatbot'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Step 9: Create Dashboard Layout

Tạo file `packages/webapp/src/app/(dashboard)/layout.tsx`:

```tsx
import { Sidebar } from '@/components/layouts/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[240px] flex-col border-r">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="container py-6">{children}</div>
      </div>
    </div>
  );
}
```

### Step 10: Create Index Exports

Tạo file `packages/webapp/src/components/layouts/index.ts`:

```typescript
export { Header } from './header';
export { Sidebar } from './sidebar';
export { MobileSidebar } from './mobile-sidebar';
export { Footer } from './footer';
```

---

## File Structure After Completion

```
packages/webapp/src/
├── app/
│   ├── (dashboard)/
│   │   └── layout.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layouts/
│   │   ├── footer.tsx
│   │   ├── header.tsx
│   │   ├── index.ts
│   │   ├── mobile-sidebar.tsx
│   │   └── sidebar.tsx
│   ├── providers/
│   │   └── theme-provider.tsx
│   └── ui/
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dropdown-menu.tsx
│       ├── scroll-area.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── theme-toggle.tsx
│       └── tooltip.tsx
└── lib/
    └── utils.ts
```

---

## Verification Checklist

- [ ] Shadcn components installed
- [ ] Theme provider working
- [ ] Theme toggle switches correctly
- [ ] Header displays properly
- [ ] Sidebar shows on desktop
- [ ] Mobile menu works on small screens
- [ ] Footer displays correctly
- [ ] Navigation links work
- [ ] No TypeScript errors
- [ ] Responsive design tested

---

## Related Tasks

- **T007**: Setup Next.js Webapp (prerequisite)
- **T019**: Implement Dashboard Page (next)
- **T020**: Create Chat Interface (next)
