# TASK-022: Add Authentication UI

## Task Information

- **ID**: T022
- **Phase**: 2 - Core Integration
- **Priority**: Medium
- **Estimated Hours**: 6h
- **Dependencies**: T018 (Webapp Layout)

---

## Objective

Implement authentication UI cho webapp:

- Login page
- Register page (optional)
- Password reset flow
- Protected routes
- Session management

---

## Acceptance Criteria

- [ ] Login page with form validation
- [ ] Register page (optional)
- [ ] Protected route middleware
- [ ] Auth state persisted
- [ ] Logout functionality
- [ ] Loading states
- [ ] Error messages displayed
- [ ] Mobile responsive

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Authentication Flow                         │
└─────────────────────────────────────────────────────────────┘

  User                     Webapp                   Bridge Service
    │                         │                           │
    │  1. Navigate to /login  │                           │
    ├────────────────────────>│                           │
    │                         │                           │
    │  2. Submit credentials  │                           │
    ├────────────────────────>│                           │
    │                         │  3. Validate credentials  │
    │                         ├──────────────────────────>│
    │                         │                           │
    │                         │  4. Return JWT token      │
    │                         │<──────────────────────────┤
    │                         │                           │
    │  5. Store token,        │                           │
    │     redirect to         │                           │
    │     dashboard           │                           │
    │<────────────────────────┤                           │
    │                         │                           │
```

---

## Instructions

### Step 1: Install Dependencies

```bash
cd packages/webapp

# Form handling
pnpm add react-hook-form @hookform/resolvers zod

# Shadcn form components
npx shadcn@latest add form
npx shadcn@latest add label
npx shadcn@latest add alert
```

### Step 2: Create Auth Types

Tạo file `packages/webapp/src/types/auth.ts`:

```typescript
import { z } from 'zod';

// Schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number;
}
```

### Step 3: Create Auth Store

Tạo file `packages/webapp/src/stores/auth.store.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthState, LoginInput, RegisterInput, AuthResponse } from '@/types/auth';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080';

interface AuthStore extends AuthState {
  login: (credentials: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true });

        try {
          const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message ?? 'Login failed');
          }

          const data: AuthResponse = await response.json();

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });

        try {
          const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message ?? 'Registration failed');
          }

          const authData: AuthResponse = await response.json();

          set({
            user: authData.user,
            token: authData.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      refreshToken: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const response = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Token refresh failed');
          }

          const data: AuthResponse = await response.json();
          set({ token: data.token });
        } catch {
          // Token expired, logout
          get().logout();
        }
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

### Step 4: Create Login Form

Tạo file `packages/webapp/src/components/features/auth/login-form.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { loginSchema, type LoginInput } from '@/types/auth';
import { useAuthStore } from '@/stores/auth.store';

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, isLoading } = useAuthStore();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);

    try {
      await login(data);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isLoading}
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between">
          <FormField
            control={form.control}
            name="remember"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal cursor-pointer">Remember me</FormLabel>
              </FormItem>
            )}
          />

          <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/auth/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </Form>
  );
}
```

### Step 5: Create Register Form

Tạo file `packages/webapp/src/components/features/auth/register-form.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { registerSchema, type RegisterInput } from '@/types/auth';
import { useAuthStore } from '@/stores/auth.store';

export function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, isLoading } = useAuthStore();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setError(null);

    try {
      await register(data);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" autoComplete="name" disabled={isLoading} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={isLoading}
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create account
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </Form>
  );
}
```

### Step 6: Create Auth Layout

Tạo file `packages/webapp/src/app/(auth)/layout.tsx`:

```tsx
import { Bot } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center mb-8">
          <Bot className="h-10 w-10 mr-2" />
          <span className="text-2xl font-bold">UE-Bot</span>
        </Link>

        {/* Form Container */}
        <div className="bg-card p-8 rounded-lg border shadow-sm">{children}</div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
```

### Step 7: Create Login Page

Tạo file `packages/webapp/src/app/(auth)/auth/login/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { LoginForm } from '@/components/features/auth/login-form';

export const metadata: Metadata = {
  title: 'Login - UE-Bot',
  description: 'Sign in to your UE-Bot account',
};

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-center mb-2">Welcome back</h1>
      <p className="text-center text-muted-foreground mb-6">
        Enter your credentials to access your account
      </p>
      <LoginForm />
    </div>
  );
}
```

### Step 8: Create Register Page

Tạo file `packages/webapp/src/app/(auth)/auth/register/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { RegisterForm } from '@/components/features/auth/register-form';

export const metadata: Metadata = {
  title: 'Register - UE-Bot',
  description: 'Create a new UE-Bot account',
};

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-center mb-2">Create account</h1>
      <p className="text-center text-muted-foreground mb-6">
        Enter your details to create a new account
      </p>
      <RegisterForm />
    </div>
  );
}
```

### Step 9: Create Auth Middleware

Tạo file `packages/webapp/src/middleware.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/', '/auth/login', '/auth/register', '/auth/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if path is public
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith('/api/')
  );

  // Get auth token from cookie or header
  const token = request.cookies.get('auth-storage')?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      const parsed = JSON.parse(token);
      isAuthenticated = !!parsed.state?.isAuthenticated;
    } catch {
      // Invalid token
    }
  }

  // Redirect unauthenticated users to login
  if (!isPublicPath && !isAuthenticated) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
```

### Step 10: Create Protected Route HOC

Tạo file `packages/webapp/src/components/providers/auth-provider.tsx`:

```tsx
'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, refreshToken } = useAuthStore();

  useEffect(() => {
    // Refresh token on mount
    void refreshToken();
  }, [refreshToken]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
```

### Step 11: Create Components Index

Tạo file `packages/webapp/src/components/features/auth/index.ts`:

```typescript
export { LoginForm } from './login-form';
export { RegisterForm } from './register-form';
```

---

## File Structure After Completion

```
packages/webapp/src/
├── app/
│   └── (auth)/
│       ├── auth/
│       │   ├── login/
│       │   │   └── page.tsx
│       │   └── register/
│       │       └── page.tsx
│       └── layout.tsx
├── components/
│   ├── features/
│   │   └── auth/
│   │       ├── index.ts
│   │       ├── login-form.tsx
│   │       └── register-form.tsx
│   └── providers/
│       └── auth-provider.tsx
├── middleware.ts
├── stores/
│   └── auth.store.ts
└── types/
    └── auth.ts
```

---

## Verification Checklist

- [ ] Login page renders correctly
- [ ] Form validation working
- [ ] Login submits successfully
- [ ] Register page works
- [ ] Error messages displayed
- [ ] Password show/hide toggle
- [ ] Remember me checkbox
- [ ] Protected routes redirect
- [ ] Auth state persisted
- [ ] Logout clears state
- [ ] Dark mode works
- [ ] Mobile responsive

---

## Related Tasks

- **T018**: Create Webapp Layout (prerequisite)
- **T019**: Implement Dashboard Page (protected page)
- **T020**: Create Chat Interface (protected page)
