'use client';

import {
  Bell,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Mic,
  Moon,
  Palette,
  Save,
  Shield,
  Sun,
  User,
  Volume2,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import {
  useSettingsStore,
  AVAILABLE_MODELS,
  PROVIDER_NAMES,
  API_KEY_PLACEHOLDERS,
  DEFAULT_MODELS,
  type ProviderType,
} from '@/stores/settings-store';

export default function SettingsPage(): React.ReactElement {
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const { setProvider } = useSettingsStore();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    // Profile
    displayName: user?.name ?? 'UE-Bot User',
    email: user?.email ?? '',
    bio: '',

    // Notifications
    notifyOnMessage: true,
    notifyOnDeviceOffline: true,
    notifyOnVoiceCommand: false,
    notifyByEmail: false,

    // Voice
    wakeWord: 'Hey Robot',
    language: 'vi-VN',
    voiceSpeed: 1.0,
    voiceVolume: 0.8,

    // AI / API Key
    providerType: 'groq' as ProviderType,
    groqApiKey: '',
    providerModel: 'llama-3.3-70b-versatile',
    maxTokens: 2048,
    temperature: 0.7,

    // Security
    twoFactorEnabled: false,
    sessionTimeout: 30,
  });

  // Load settings from API
  useEffect(() => {
    void api
      .getSettings()
      .then((data) => {
        const s = data.settings;
        if (s && Object.keys(s).length > 0) {
          setSettings((prev) => ({
            ...prev,
            ...Object.fromEntries(
              Object.entries(s).map(([k, v]): [string, string | number | boolean] => {
                // Convert string "true"/"false" back to boolean
                if (v === 'true') return [k, true];
                if (v === 'false') return [k, false];
                // Convert numeric strings
                const num = Number(v);
                if (!isNaN(num) && v !== '') return [k, num];
                return [k, v];
              })
            ),
          }));
        }
      })
      .catch(() => {
        // use defaults
      });
  }, []);

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      // Convert all values to strings for the API
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(settings)) {
        flat[k] = String(v);
      }
      await api.saveSettings(flat);
      // Sync provider info to Zustand store so isConfigured reflects reality
      setProvider({
        type: settings.providerType,
        apiKey: settings.groqApiKey,
        model: settings.providerModel,
      });
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => {
        setSaveMessage('');
      }, 3000);
    } catch {
      setSaveMessage('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {saveMessage && (
          <div
            className={`rounded-md p-3 text-sm ${saveMessage.includes('success') ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-destructive/15 text-destructive'}`}
          >
            {saveMessage}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Your personal information and public profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={settings.displayName}
                  onChange={(e) => {
                    setSettings({ ...settings, displayName: e.target.value });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => {
                    setSettings({ ...settings, email: e.target.value });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={settings.bio}
                  onChange={(e) => {
                    setSettings({ ...settings, bio: e.target.value });
                  }}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Customize the look and feel of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="flex gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setTheme('light');
                    }}
                  >
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setTheme('dark');
                    }}
                  >
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setTheme('system');
                    }}
                  >
                    System
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <select
                  id="language"
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={settings.language}
                  onChange={(e) => {
                    setSettings({ ...settings, language: e.target.value });
                  }}
                >
                  <option value="vi-VN">Tiếng Việt</option>
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Configure how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Message Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when receiving new messages
                  </p>
                </div>
                <Switch
                  checked={settings.notifyOnMessage}
                  onCheckedChange={(checked) => {
                    setSettings({ ...settings, notifyOnMessage: checked });
                  }}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Device Offline Alerts</Label>
                  <p className="text-sm text-muted-foreground">Notify when a device goes offline</p>
                </div>
                <Switch
                  checked={settings.notifyOnDeviceOffline}
                  onCheckedChange={(checked) => {
                    setSettings({ ...settings, notifyOnDeviceOffline: checked });
                  }}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Voice Command Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when voice commands are received
                  </p>
                </div>
                <Switch
                  checked={settings.notifyOnVoiceCommand}
                  onCheckedChange={(checked) => {
                    setSettings({ ...settings, notifyOnVoiceCommand: checked });
                  }}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Also send notifications via email</p>
                </div>
                <Switch
                  checked={settings.notifyByEmail}
                  onCheckedChange={(checked) => {
                    setSettings({ ...settings, notifyByEmail: checked });
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Voice Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Voice Settings
              </CardTitle>
              <CardDescription>Configure voice recognition and synthesis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wakeWord">Wake Word</Label>
                <Input
                  id="wakeWord"
                  value={settings.wakeWord}
                  onChange={(e) => {
                    setSettings({ ...settings, wakeWord: e.target.value });
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  The phrase that activates voice recognition
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="voiceSpeed">Voice Speed: {settings.voiceSpeed}x</Label>
                <input
                  type="range"
                  id="voiceSpeed"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.voiceSpeed}
                  onChange={(e) => {
                    setSettings({ ...settings, voiceSpeed: parseFloat(e.target.value) });
                  }}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="voiceVolume">
                  <Volume2 className="mr-2 inline h-4 w-4" />
                  Volume: {Math.round(settings.voiceVolume * 100)}%
                </Label>
                <input
                  type="range"
                  id="voiceVolume"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.voiceVolume}
                  onChange={(e) => {
                    setSettings({ ...settings, voiceVolume: parseFloat(e.target.value) });
                  }}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* API Key Settings */}
          <Card className="lg:col-span-2 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                API Key Configuration
              </CardTitle>
              <CardDescription>
                Enter your own API key to use the AI Agent. Get a free key from{' '}
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  console.groq.com
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Provider */}
                <div className="space-y-2">
                  <Label htmlFor="providerType">Provider</Label>
                  <select
                    id="providerType"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={settings.providerType}
                    onChange={(e) => {
                      const type = e.target.value as ProviderType;
                      setSettings({
                        ...settings,
                        providerType: type,
                        providerModel: DEFAULT_MODELS[type],
                      });
                    }}
                  >
                    {(Object.keys(PROVIDER_NAMES) as ProviderType[]).map((p) => (
                      <option key={p} value={p}>
                        {PROVIDER_NAMES[p]}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Model */}
                <div className="space-y-2">
                  <Label htmlFor="providerModel">Model</Label>
                  <select
                    id="providerModel"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={settings.providerModel}
                    onChange={(e) => {
                      setSettings({ ...settings, providerModel: e.target.value });
                    }}
                  >
                    {AVAILABLE_MODELS[settings.providerType].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="groqApiKey">API Key</Label>
                <div className="relative">
                  <Input
                    id="groqApiKey"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder={API_KEY_PLACEHOLDERS[settings.providerType]}
                    value={settings.groqApiKey}
                    onChange={(e) => {
                      setSettings({ ...settings, groqApiKey: e.target.value });
                    }}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => {
                      setShowApiKey(!showApiKey);
                    }}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your key is stored securely per-account and never shared.
                </p>
              </div>
              <Separator />
              {/* Temperature & Max Tokens */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens: {settings.maxTokens}</Label>
                  <input
                    type="range"
                    id="maxTokens"
                    min="256"
                    max="4096"
                    step="256"
                    value={settings.maxTokens}
                    onChange={(e) => {
                      setSettings({ ...settings, maxTokens: parseInt(e.target.value) });
                    }}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature: {settings.temperature}</Label>
                  <input
                    type="range"
                    id="temperature"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.temperature}
                    onChange={(e) => {
                      setSettings({ ...settings, temperature: parseFloat(e.target.value) });
                    }}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower = more focused, Higher = more creative
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                </div>
                <div className="flex items-center gap-2">
                  {settings.twoFactorEnabled && <Badge variant="secondary">Enabled</Badge>}
                  <Switch
                    checked={settings.twoFactorEnabled}
                    onCheckedChange={(checked) => {
                      setSettings({ ...settings, twoFactorEnabled: checked });
                    }}
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min="5"
                  max="120"
                  value={settings.sessionTimeout}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      sessionTimeout: parseInt(e.target.value),
                    });
                  }}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Button variant="outline" className="w-full">
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
