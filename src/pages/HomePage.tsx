import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSettings } from '../hooks/useAppSettings';
import { normalizeCode, normalizeName } from '../lib/quiz';

export function HomePage() {
  const navigate = useNavigate();
  const { settings } = useAppSettings();
  const { homeCopy } = settings;
  const nameLabel = homeCopy.nameLabel === '表示名' ? '参加者のお名前' : homeCopy.nameLabel;
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function join(event: FormEvent) {
    event.preventDefault();
    const roomCode = normalizeCode(code);
    const participantName = normalizeName(name);
    if (roomCode.length !== 6) {
      setError('6桁の参加コードを入力してください。');
      return;
    }
    if (!participantName) {
      setError('参加者のお名前を入力してください。');
      return;
    }
    navigate(`/play/${roomCode}?name=${encodeURIComponent(participantName)}`);
  }

  return (
    <section className="homeGrid">
      <div className="heroPanel">
        <p className="eyebrow">{homeCopy.eyebrow}</p>
        <h1>{homeCopy.title}</h1>
        <p>{homeCopy.description}</p>
      </div>

      <form className="panel joinPanel" id="join" onSubmit={join}>
        <h2>{homeCopy.joinTitle}</h2>
        <label>
          {homeCopy.codeLabel}
          <input
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(normalizeCode(event.target.value))}
          />
        </label>
        <label>
          {nameLabel}
          <input
            maxLength={24}
            placeholder="例：まきし"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button primary full large" type="submit">
          {homeCopy.joinSubmit}
        </button>
        <p className="smallNote">{homeCopy.joinNote}</p>
      </form>
    </section>
  );
}
