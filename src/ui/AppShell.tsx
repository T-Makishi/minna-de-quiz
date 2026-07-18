import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { hasAccessGrant, isAccessLockEnabled, revokeAccess } from '../lib/accessLock';
import { api, isSupabaseEnabled } from '../lib/api';
import { buildDefaultSettings } from '../lib/settings';
import { AppSettings } from '../types';
import { AppSettingsContext } from '../hooks/useAppSettings';
import { AccessLock } from './AccessLock';

export function AppShell() {
  const location = useLocation();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const hashPath = window.location.hash.replace(/^#/, '').split('?')[0] || location.pathname;
  const routePath = location.pathname === '/' && hashPath !== '/' ? hashPath : location.pathname;
  const isInvitePage = routePath.startsWith('/invite/');
  const isHomePage = routePath === '/';
  const showAdminActions = isHomePage || routePath.startsWith('/host') || routePath.startsWith('/settings');

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

  if (!unlocked && !isInvitePage) {
    return <AccessLock accessPassphraseHash={settings.accessPassphraseHash} onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <AppSettingsContext.Provider value={{ settings, refreshSettings }}>
      <div className="app">
        <header className="topbar">
          <Link className="brand" to="/">
            <span className="brandMark">問</span>
            <span>{settings.homeCopy.title}</span>
          </Link>
          {showAdminActions && (
            <div className="topbarActions">
              <span className="syncBadge">{isSupabaseEnabled ? 'Supabase同期' : 'ローカル体験版'}</span>
              <Link className="textButton" to="/settings">
                アプリ設定
              </Link>
              <Link className="textButton" to="/host/codes">
                参加コード管理
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
          )}
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </AppSettingsContext.Provider>
  );
}
