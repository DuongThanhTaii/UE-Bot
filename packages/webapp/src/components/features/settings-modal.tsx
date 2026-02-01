'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  API_KEY_PLACEHOLDERS,
  AVAILABLE_MODELS,
  DEFAULT_MODELS,
  PROVIDER_NAMES,
  useSettingsStore,
  type ProviderType,
} from '@/stores/settings-store';
import { AlertCircle, Check, ExternalLink, Key, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Links to get API keys
 */
const API_KEY_LINKS: Record<ProviderType, string> = {
  groq: 'https://console.groq.com/keys',
  openai: 'https://platform.openai.com/api-keys',
  claude: 'https://console.anthropic.com/settings/keys',
};

export function SettingsModal(): JSX.Element {
  const { provider, isConfigured, setProvider } = useSettingsStore();
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ProviderType>(provider?.type ?? 'groq');
  const [apiKey, setApiKey] = useState(provider?.apiKey ?? '');
  const [selectedModel, setSelectedModel] = useState(provider?.model ?? DEFAULT_MODELS.groq);
  const [showKey, setShowKey] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSelectedType(provider?.type ?? 'groq');
      setApiKey(provider?.apiKey ?? '');
      setSelectedModel(provider?.model ?? DEFAULT_MODELS[provider?.type ?? 'groq']);
    }
  }, [open, provider]);

  // Update model when provider type changes
  useEffect(() => {
    setSelectedModel(DEFAULT_MODELS[selectedType]);
  }, [selectedType]);

  const handleSave = (): void => {
    setProvider({
      type: selectedType,
      apiKey,
      model: selectedModel,
    });
    setOpen(false);
  };

  const isValid = apiKey.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={isConfigured ? 'ghost' : 'default'}
          size="icon"
          className={!isConfigured ? 'animate-pulse' : ''}
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Settings
          </DialogTitle>
          <DialogDescription>
            Configure your LLM provider and API key to start chatting.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Provider Selection */}
          <div className="grid gap-2">
            <Label htmlFor="provider">Provider</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as ProviderType)}
            >
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PROVIDER_NAMES) as ProviderType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {PROVIDER_NAMES[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key Input */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="apiKey">API Key</Label>
              <a
                href={API_KEY_LINKS[selectedType]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                Get API Key
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="relative">
              <Input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={API_KEY_PLACEHOLDERS[selectedType]}
                className="pr-20"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? 'Hide' : 'Show'}
              </Button>
            </div>
          </div>

          {/* Model Selection */}
          <div className="grid gap-2">
            <Label htmlFor="model">Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS[selectedType].map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Provider Info */}
          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            {selectedType === 'groq' && (
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-500" />
                <div>
                  <p className="font-medium">Groq (Free Tier)</p>
                  <p className="text-muted-foreground">
                    Fast inference but limited function calling support. Some tools may not work
                    reliably.
                  </p>
                </div>
              </div>
            )}
            {selectedType === 'openai' && (
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-500" />
                <div>
                  <p className="font-medium">OpenAI</p>
                  <p className="text-muted-foreground">
                    Excellent function calling support. Recommended for best tool experience.
                  </p>
                </div>
              </div>
            )}
            {selectedType === 'claude' && (
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-500" />
                <div>
                  <p className="font-medium">Anthropic Claude</p>
                  <p className="text-muted-foreground">
                    Great reasoning and tool use capabilities. Excellent for complex tasks.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
