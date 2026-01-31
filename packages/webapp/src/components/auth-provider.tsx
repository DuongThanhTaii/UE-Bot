'use client';

import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuthStore } from '@/stores/auth-store';

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/forgot-password'];

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
    const isAuth = checkAuth();

    // If not authenticated and trying to access protected route
    if (!isAuth && !isPublicPath) {
      router.push('/auth/login');
    }
    // If authenticated and trying to access auth pages
    else if (isAuth && isPublicPath) {
      router.push('/');
    }

    setIsChecking(false);
  }, [pathname, checkAuth, router, isAuthenticated]);

  // Show loading while checking auth
  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
