import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { statusLabels } from '../lib/quiz';
import { RoomSummary } from '../types';

export function RoomManagementPage() {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deletingRoomId, setDeletingRoomId] = useState('');

  async function loadRooms() {
    setLoading(true);
    setError('');
    try {
      setRooms(await api.listRooms());
    } catch (err) {
      setError(err instanceof Error ? err.message : '参加コード一覧を読み込めませんでした。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, []);

  async function copyText(text: string, copyMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(copyMessage);
    } catch {
      setError('コピーできませんでした。');
    }
    window.setTimeout(() => setMessage(''), 2500);
  }

  async function deleteRoom(room: RoomSummary['room']) {
    const ok = window.confirm(
      `「${room.title}」を削除しますか？\n\n参加コード ${room.code} と、この大会の問題・参加者・回答履歴も削除されます。`,
    );
    if (!ok) return;
    setDeletingRoomId(room.id);
    setError('');
    try {
      await api.deleteRoom(room.id);
      setRooms((items) => items.filter((item) => item.room.id !== room.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '参加コードを削除できませんでした。');
    } finally {
      setDeletingRoomId('');
    }
  }

  function publicUrl(code: string) {
    return `${window.location.origin}${import.meta.env.BASE_URL}#/play/${code}`;
  }

  function inviteUrl(code: string) {
    return `${window.location.origin}${import.meta.env.BASE_URL}#/invite/${code}`;
  }

  return (
    <section className="hostLayout">
      <div className="pageHead hostTitle">
        <div>
          <h1>参加コード管理</h1>
          <p>発行済みの参加コードと大会の状態を確認できます。</p>
        </div>
        <Link className="button secondary" to="/host/create">
          新しい大会を作成
        </Link>
      </div>

      {message && <p className="successMessage">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="panel roomManagePanel">
        {loading ? (
          <p className="muted">読み込み中...</p>
        ) : rooms.length > 0 ? (
          <div className="roomManageList">
            {rooms.map(({ room, questionCount, participantCount }) => (
              <div className="roomManageItem" key={room.id}>
                <div>
                  <span className={`statusPill ${room.status === 'finished' ? 'finished' : 'active'}`}>
                    {room.status === 'finished' ? '終了済み' : '運用中'}
                  </span>
                  <h2>{room.title}</h2>
                  <dl>
                    <div>
                      <dt>参加コード</dt>
                      <dd>{room.code}</dd>
                    </div>
                    <div>
                      <dt>状態</dt>
                      <dd>{statusLabels[room.status]}</dd>
                    </div>
                    <div>
                      <dt>問題数</dt>
                      <dd>{questionCount}問</dd>
                    </div>
                    <div>
                      <dt>参加者</dt>
                      <dd>{participantCount}人</dd>
                    </div>
                    <div>
                      <dt>作成日</dt>
                      <dd>{new Date(room.createdAt).toLocaleDateString('ja-JP')}</dd>
                    </div>
                  </dl>
                </div>
                <div className="roomManageActions">
                  <Link className="button primary small" to={`/host/${room.id}`}>
                    管理画面
                  </Link>
                  <Link className="button secondary small" to={`/host/${room.id}/print`}>
                    印刷
                  </Link>
                  <a className="button secondary small" href={inviteUrl(room.code)} rel="noreferrer" target="_blank">
                    案内
                  </a>
                  <button className="button secondary small" type="button" onClick={() => copyText(publicUrl(room.code), '参加URLをコピーしました。')}>
                    URLコピー
                  </button>
                  <button className="button danger small" disabled={deletingRoomId === room.id} type="button" onClick={() => deleteRoom(room)}>
                    {deletingRoomId === room.id ? '削除中...' : '削除'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">発行済みの参加コードはありません。</p>
        )}
      </div>
    </section>
  );
}
