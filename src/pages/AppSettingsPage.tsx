import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSettings } from '../hooks/useAppSettings';
import { api } from '../lib/api';
import { hashPassphrase } from '../lib/settings';
import { HomeCopy } from '../types';

const settingsAdminPin = (import.meta.env.VITE_SETTINGS_ADMIN_PIN || '1234').trim();

export function AppSettingsPage() {
  const { settings, refreshSettings } = useAppSettings();
  const [authorized, setAuthorized] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [homeCopy, setHomeCopy] = useState<HomeCopy>(settings.homeCopy);
  const [newPassphrase, setNewPassphrase] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function unlock(event: FormEvent) {
    event.preventDefault();
    if (pin !== settingsAdminPin) {
      setPinError('管理PINが違います。');
      return;
    }
    setAuthorized(true);
    setPinError('');
  }

  function updateCopy(key: keyof HomeCopy, value: string) {
    setHomeCopy((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const passphraseHash = newPassphrase.trim()
        ? await hashPassphrase(newPassphrase)
        : settings.accessPassphraseHash;
      await api.saveAppSettings({
        ...settings,
        homeCopy,
        accessPassphraseHash: passphraseHash,
      });
      setNewPassphrase('');
      await refreshSettings();
      setMessage('アプリ設定を保存しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アプリ設定を保存できませんでした。');
    } finally {
      setSaving(false);
    }
  }

  if (!authorized) {
    return (
      <section className="narrow">
        <div className="pageHead">
          <h1>アプリ設定</h1>
          <p>合言葉やトップ画面の文言を変更するには、管理PINを入力してください。</p>
        </div>
        <form className="panel formGrid" onSubmit={unlock}>
          <label>
            管理PIN
            <input
              autoFocus
              inputMode="numeric"
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.trim());
                setPinError('');
              }}
            />
          </label>
          {pinError && <p className="error wide">{pinError}</p>}
          <button className="button primary large wide" type="submit">
            設定を開く
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="narrow">
      <div className="pageHead settingsHead">
        <div>
          <h1>アプリ設定</h1>
          <p>保存すると、トップ画面と合言葉ロックに反映されます。</p>
        </div>
        <Link className="button secondary" to="/">
          トップへ戻る
        </Link>
      </div>

      <form className="panel formGrid" onSubmit={save}>
        <label className="wide">
          新しい合言葉
          <input
            autoComplete="off"
            placeholder="変更しない場合は空欄"
            value={newPassphrase}
            onChange={(event) => setNewPassphrase(event.target.value)}
          />
        </label>
        <p className="smallNote wide">合言葉を変更すると、次回ロック画面から新しい合言葉が必要になります。</p>

        <label className="wide">
          運営名・小見出し
          <input value={homeCopy.eyebrow} onChange={(event) => updateCopy('eyebrow', event.target.value)} />
        </label>
        <label className="wide">
          タイトル
          <input value={homeCopy.title} onChange={(event) => updateCopy('title', event.target.value)} />
        </label>
        <label className="wide">
          説明文
          <textarea value={homeCopy.description} onChange={(event) => updateCopy('description', event.target.value)} />
        </label>
        <label>
          開催ボタン
          <input value={homeCopy.hostButton} onChange={(event) => updateCopy('hostButton', event.target.value)} />
        </label>
        <label>
          参加ボタン
          <input value={homeCopy.joinButton} onChange={(event) => updateCopy('joinButton', event.target.value)} />
        </label>
        <label>
          参加欄タイトル
          <input value={homeCopy.joinTitle} onChange={(event) => updateCopy('joinTitle', event.target.value)} />
        </label>
        <label>
          参加コードラベル
          <input value={homeCopy.codeLabel} onChange={(event) => updateCopy('codeLabel', event.target.value)} />
        </label>
        <label>
          表示名ラベル
          <input value={homeCopy.nameLabel} onChange={(event) => updateCopy('nameLabel', event.target.value)} />
        </label>
        <label>
          参加送信ボタン
          <input value={homeCopy.joinSubmit} onChange={(event) => updateCopy('joinSubmit', event.target.value)} />
        </label>
        <label className="wide">
          参加欄の補足
          <input value={homeCopy.joinNote} onChange={(event) => updateCopy('joinNote', event.target.value)} />
        </label>

        {message && <p className="successMessage wide">{message}</p>}
        {error && <p className="error wide">{error}</p>}
        <button className="button primary large wide" disabled={saving} type="submit">
          {saving ? '保存中...' : '保存する'}
        </button>
      </form>
    </section>
  );
}
