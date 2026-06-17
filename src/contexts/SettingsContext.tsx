import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const API = "";

export interface AppSettings {
  notify_sound: boolean;
  notify_desktop: boolean;
  notify_ai_indicator: boolean;
  notify_quiet_enabled: boolean;
  notify_quiet_start: string;
  notify_quiet_end: string;
  privacy_msg_encrypt: boolean;
  privacy_auto_delete: number;
  privacy_read_receipt: boolean;
  privacy_show_online: boolean;
  general_language: string;
  general_theme: string;
  general_font_size: string;
  features: Record<string, boolean>;
}

const defaultSettings: AppSettings = {
  notify_sound: true,
  notify_desktop: true,
  notify_ai_indicator: true,
  notify_quiet_enabled: false,
  notify_quiet_start: "22:00",
  notify_quiet_end: "08:00",
  privacy_msg_encrypt: false,
  privacy_auto_delete: 0,
  privacy_read_receipt: true,
  privacy_show_online: true,
  general_language: "zh-CN",
  general_theme: "auto",
  general_font_size: "normal",
  features: {},
};

interface SettingsContextType {
  settings: AppSettings;
  loaded: boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
  toggleFeature: (id: string) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loaded: false,
  updateSettings: () => {},
  toggleFeature: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/settings`)
      .then(r => r.json())
      .then(d => {
        if (d && typeof d === "object") setSettings(prev => ({ ...prev, ...d }));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Apply theme and font size to document root
  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    const theme = settings.general_theme;
    if (theme === "dark") root.setAttribute("data-theme", "dark");
    else if (theme === "light") root.setAttribute("data-theme", "light");
    else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    }
    const sizeMap: Record<string, string> = { small: "13px", normal: "14px", large: "16px" };
    root.style.setProperty("--font-size-base", sizeMap[settings.general_font_size] || "14px");
  }, [loaded, settings.general_theme, settings.general_font_size]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      fetch(`${API}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).catch(() => {});
      return next;
    });
  }, []);

  const toggleFeature = useCallback((id: string) => {
    setSettings(prev => {
      const features = { ...(prev.features || {}) };
      features[id] = features[id] === false ? true : false;
      const next = { ...prev, features };
      // Persist to both settings and features endpoints
      fetch(`${API}/api/settings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }).catch(() => {});
      fetch(`${API}/api/features`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [id]: features[id] }) }).catch(() => {});
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loaded, updateSettings, toggleFeature }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
