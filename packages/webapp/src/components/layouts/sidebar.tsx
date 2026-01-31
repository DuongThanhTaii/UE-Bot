'use client';

import { Bot, Cpu, LayoutDashboard, MessageSquare, Settings, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/devices', label: 'Devices', icon: Cpu },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-background transition-transform duration-300 md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link href="/" className="flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold">UE-Bot</span>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <nav className="space-y-1 p-4">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? 'secondary' : 'ghost'}
                className={cn('w-full justify-start gap-2')}
                asChild
                onClick={onClose}
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
          </nav>

          <Separator className="my-4" />

          <div className="px-4 pb-4">
            <div className="rounded-lg border bg-card p-4">
              <h4 className="text-sm font-semibold">System Status</h4>
              <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>API</span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>ESP32</span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" />
                    Waiting
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
