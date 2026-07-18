import { FormEvent, useState } from 'react';
import { grantAccess } from '../lib/accessLock';
import { hashPassphrase } from '../lib/settings';

export function AccessLock({
  accessPassphraseHash,
  onUnlock,
}: {
  accessPassphraseHash: string;
  onUnlock: () => void;
}) {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setChecking(true);
    const candidateHash = await hashPassphrase(passphrase);
    if (candidateHash !== accessPassphraseHash) {
      setError('合言葉が違います。案内された合言葉を確認してください。');
      setChecking(false);
      return;
    }
    grantAccess(accessPassphraseHash);
    onUnlock();
  }

  return (
    <main className="lockPage">
      <section className="panel lockPanel">
        <div className="brand lockBrand">
          <span className="brandMark">問</span>
          <span>みんなでクイズ</span>
        </div>
        <div>
          <p className="eyebrow">限定公開</p>
          <h1>合言葉を入力してください</h1>
          <p className="muted">案内された方だけが、このクイズアプリを開けます。</p>
        </div>
        <form className="lockForm" onSubmit={submit}>
          <label>
            合言葉
            <input
              autoFocus
              autoComplete="off"
              value={passphrase}
              onChange={(event) => {
                setPassphrase(event.target.value);
                setError('');
              }}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="button primary full large" disabled={checking} type="submit">
            {checking ? '確認中...' : '入場する'}
          </button>
        </form>
      </section>
    </main>
  );
}
