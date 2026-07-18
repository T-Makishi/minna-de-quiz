import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { hasAccessGrant, isAccessLockEnabled, revokeAccess } from '../lib/accessLock';
import { api, isSupabaseEnabled } from '../lib/api';
import { buildDefaultSettings } from '../lib/settings';
import { AppSettings } from '../types';
import { AppSettingsContext } from '../hooks/useAppSettings';
import { AccessLock } from './AccessLock';

export function AppShell() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  async function refreshSettings() {
    const next = await api.getAppSettings();
    setSettings(next);
    setUnlocked(hasAccessGrant(next.accessPassphraseHash));
  }

  useEffect(() => {
    let active = true;
    buildDefaultSettings().then((fallback) => {
      if (active) setSettings(fallback);
    });
    refreshSettings();
    const unsubscribe = api.subscribeAppSettings(refreshSettings);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (!settings) {
    return (
      <main className="lockPage">
        <section className="panel lockPanel">読み込み中...</section>
      </main>
    );
  }

  if (!unlocked) {
    return <AccessLock accessPassphraseHash={settings.accessPassphraseHash} onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <AppSettingsContext.Provider value={{ settings, refreshSettings }}>
      <div className="app">
        <header className="topbar">
          <a className="brand" href="/">
            <span className="brandMark">問</span>
            <span>{settings.homeCopy.title}</span>
          </a>
          <div className="topbarActions">
            <span className="syncBadge">{isSupabaseEnabled ? 'Supabase同期' : 'ローカル体験版'}</span>
            <Link className="textButton" to="/settings">
              アプリ設定
            </Link>
            {isAccessLockEnabled(settings.accessPassphraseHash) && (
              <button
                className="textButton"
                type="button"
                onClick={() => {
                  revokeAccess();
                  setUnlocked(false);
                }}
              >
                ロック
              </button>
            )}
          </div>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </AppSettingsContext.Provider>
  );
}
