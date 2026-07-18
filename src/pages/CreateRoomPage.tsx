import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { saveHostPin } from '../lib/storage';
import { RoomSummary } from '../types';

export function CreateRoomPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '今日のクイズ大会',
    hostName: '',
    adminPin: '',
    timeLimitEnabled: true,
    defaultTimeLimit: 30,
    useRanking: true,
    pointsPerCorrect: 100,
    useSpeedBonus: true,
    maxParticipants: 50,
    allowAnswerChanges: false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [roomHistory, setRoomHistory] = useState<RoomSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [sourceRoomId, setSourceRoomId] = useState('');

  useEffect(() => {
    let active = true;
    api
      .listRooms()
      .then((rooms) => {
        if (active) setRoomHistory(rooms.filter((item) => item.questionCount > 0));
      })
      .catch(() => {
        if (active) setRoomHistory([]);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
        defaultTimeLimit: form.timeLimitEnabled ? form.defaultTimeLimit : 0,
        useSpeedBonus: form.timeLimitEnabled ? form.useSpeedBonus : false,
      });
      if (sourceRoomId) {
        await api.copyQuestions(sourceRoomId, room.id);
      }
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
      <section className="panel historyPanel">
        <div>
          <h2>過去問を使う</h2>
          <p className="muted">過去に作成した問題をコピーして、新しい大会として開催できます。</p>
        </div>
        {historyLoading ? (
          <p className="muted">過去問を確認中...</p>
        ) : roomHistory.length > 0 ? (
          <div className="historyList">
            <label className={`historyItem ${sourceRoomId === '' ? 'selected' : ''}`}>
              <input
                type="radio"
                checked={sourceRoomId === ''}
                name="sourceRoom"
                onChange={() => setSourceRoomId('')}
              />
              <span>
                <strong>新しく作成する</strong>
                <small>過去問をコピーせず、空の大会を作ります。</small>
              </span>
            </label>
            {roomHistory.map(({ room, questionCount }) => (
              <label className={`historyItem ${sourceRoomId === room.id ? 'selected' : ''}`} key={room.id}>
                <input
                  type="radio"
                  checked={sourceRoomId === room.id}
                  name="sourceRoom"
                  onChange={() => setSourceRoomId(room.id)}
                />
                <span>
                  <strong>{room.title}</strong>
                  <small>
                    {questionCount}問 / {new Date(room.createdAt).toLocaleDateString('ja-JP')} 作成
                  </small>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="muted">コピーできる過去問はまだありません。まずは新しく大会を作成してください。</p>
        )}
      </section>
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
        <div>
          <label className="checkRow">
            <input
              type="checkbox"
              checked={form.timeLimitEnabled}
              onChange={(event) =>
                setForm({
                  ...form,
                  timeLimitEnabled: event.target.checked,
                  useSpeedBonus: event.target.checked ? form.useSpeedBonus : false,
                })
              }
            />
            制限時間を使用する
          </label>
          {form.timeLimitEnabled ? (
            <label className="stackedControl">
              制限時間の初期設定
              <input
                type="number"
                min={5}
                max={300}
                value={form.defaultTimeLimit}
                onChange={(event) => setForm({ ...form, defaultTimeLimit: Number(event.target.value) })}
              />
            </label>
          ) : (
            <p className="smallNote noLimitNote">各問題は時間制限なしで作成されます。</p>
          )}
        </div>
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
            disabled={!form.timeLimitEnabled}
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
