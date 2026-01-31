'use client';

import { Bell, Bot, LogOut, Menu, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth-store';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/" className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <span className="hidden font-bold sm:inline-block">UE-Bot</span>
        </Link>
      </div>

      <nav className="hidden items-center gap-6 md:flex">
        <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
          Dashboard
        </Link>
        <Link href="/chat" className="text-sm font-medium transition-colors hover:text-primary">
          Chat
        </Link>
        <Link href="/devices" className="text-sm font-medium transition-colors hover:text-primary">
          Devices
        </Link>
        <Link href="/settings" className="text-sm font-medium transition-colors hover:text-primary">
          Settings
        </Link>
      </nav>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="hidden gap-1 sm:flex">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Online
        </Badge>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
            3
          </span>
        </Button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {user?.name || 'My Account'}
              {user?.email && (
                <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
