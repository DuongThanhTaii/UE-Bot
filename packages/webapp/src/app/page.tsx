import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="space-y-6 text-center">
        <h1 className="text-4xl font-bold">🤖 UE-Bot</h1>
        <p className="text-lg text-muted-foreground">AI Assistant with ESP32 Voice Control</p>
        <div className="flex justify-center gap-4">
          <Button asChild>
            <Link href="/login">Get Started</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="https://github.com/DuongThanhTaii/UE-Bot" target="_blank">
              GitHub
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
