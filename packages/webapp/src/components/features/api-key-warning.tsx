'use client';

import { useSettingsStore } from '@/stores/settings-store';
import { AlertTriangle } from 'lucide-react';

export function ApiKeyWarning(): JSX.Element | null {
  const { isConfigured } = useSettingsStore();

  if (isConfigured) return null;

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
        <div>
          <p className="font-medium text-yellow-600 dark:text-yellow-400">API Key Required</p>
          <p className="text-sm text-muted-foreground">
            Please configure your API key in Settings (⚙️) to start chatting. You can get a free API
            key from Groq, or use OpenAI/Claude for better tool support.
          </p>
        </div>
      </div>
    </div>
  );
}
