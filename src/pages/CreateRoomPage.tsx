import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { saveHostPin } from '../lib/storage';

export function CreateRoomPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '今日のクイズ大会',
    hostName: '',
    adminPin: '',
    defaultTimeLimit: 30,
    useRanking: true,
    pointsPerCorrect: 100,
    useSpeedBonus: true,
    maxParticipants: 50,
    allowAnswerChanges: false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!form.title.trim() || !form.hostName.trim()) {
      setError('大会名と出題者名を入力してください。');
      return;
    }
    if (!/^\d{4,6}$/.test(form.adminPin)) {
      setError('管理者PINは4桁から6桁の数字で入力してください。');
      return;
    }
    setSaving(true);
    try {
      const room = await api.createRoom({
        ...form,
        title: form.title.trim(),
        hostName: form.hostName.trim(),
      });
      saveHostPin(room.id, form.adminPin);
      navigate(`/host/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ルーム作成に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="narrow">
      <div className="pageHead">
        <h1>クイズを開催する</h1>
        <p>参加コードは作成後に自動で発行されます。</p>
      </div>
      <form className="panel formGrid" onSubmit={submit}>
        <label>
          クイズ大会名
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </label>
        <label>
          出題者名
          <input value={form.hostName} onChange={(event) => setForm({ ...form, hostName: event.target.value })} />
        </label>
        <label>
          管理者PIN
          <input
            inputMode="numeric"
            maxLength={6}
            placeholder="4から6桁"
            value={form.adminPin}
            onChange={(event) => setForm({ ...form, adminPin: event.target.value.replace(/\D/g, '').slice(0, 6) })}
          />
        </label>
        <label>
          制限時間の初期設定
          <input
            type="number"
            min={5}
            max={300}
            value={form.defaultTimeLimit}
            onChange={(event) => setForm({ ...form, defaultTimeLimit: Number(event.target.value) })}
          />
        </label>
        <label>
          正解時の得点
          <input
            type="number"
            min={1}
            max={9999}
            value={form.pointsPerCorrect}
            onChange={(event) => setForm({ ...form, pointsPerCorrect: Number(event.target.value) })}
          />
        </label>
        <label>
          参加人数上限
          <input
            type="number"
            min={1}
            max={1000}
            value={form.maxParticipants}
            onChange={(event) => setForm({ ...form, maxParticipants: Number(event.target.value) })}
          />
        </label>
        <label className="checkRow">
          <input
            type="checkbox"
            checked={form.useRanking}
            onChange={(event) => setForm({ ...form, useRanking: event.target.checked })}
          />
          ランキングを使用する
        </label>
        <label className="checkRow">
          <input
            type="checkbox"
            checked={form.useSpeedBonus}
            onChange={(event) => setForm({ ...form, useSpeedBonus: event.target.checked })}
          />
          回答速度ボーナスを使用する
        </label>
        <label className="checkRow">
          <input
            type="checkbox"
            checked={form.allowAnswerChanges}
            onChange={(event) => setForm({ ...form, allowAnswerChanges: event.target.checked })}
          />
          回答変更を許可する
        </label>
        {error && <p className="error wide">{error}</p>}
        <button className="button primary full large wide" disabled={saving} type="submit">
          {saving ? '作成中...' : '作成する'}
        </button>
      </form>
    </section>
  );
}
