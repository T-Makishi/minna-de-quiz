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
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') loadRooms();
    }

    window.addEventListener('focus', loadRooms);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', loadRooms);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    setSelectedRoomIds((ids) => ids.filter((id) => rooms.some((item) => item.room.id === id)));
  }, [rooms]);

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
      await loadRooms();
      setMessage(`参加コード ${room.code} を削除しました。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '参加コードを削除できませんでした。');
    } finally {
      setDeletingRoomId('');
    }
  }

  function toggleRoomSelection(roomId: string) {
    setSelectedRoomIds((ids) => (ids.includes(roomId) ? ids.filter((id) => id !== roomId) : [...ids, roomId]));
  }

  function clearSelection() {
    setSelectedRoomIds([]);
  }

  async function deleteSelectedRooms() {
    const selectedRooms = rooms.filter((item) => selectedRoomIds.includes(item.room.id));
    if (selectedRooms.length === 0) return;
    const codes = selectedRooms.map((item) => item.room.code).join('、');
    const ok = window.confirm(
      `選択した${selectedRooms.length}件の大会を削除しますか？\n\n参加コード ${codes} と、それぞれの問題・参加者・回答履歴も削除されます。`,
    );
    if (!ok) return;
    setBulkDeleting(true);
    setError('');
    try {
      for (const { room } of selectedRooms) {
        await api.deleteRoom(room.id);
      }
      setSelectedRoomIds([]);
      await loadRooms();
      setMessage(`${selectedRooms.length}件の参加コードを削除しました。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '選択した参加コードを削除できませんでした。');
    } finally {
      setBulkDeleting(false);
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
          <>
            <div className="roomBulkActions">
              <strong>
                {selectedRoomIds.length > 0
                  ? `${selectedRoomIds.length}件選択中`
                  : '削除したい大会にチェックを入れてください。'}
              </strong>
              <div>
                <button className="button secondary small" disabled={selectedRoomIds.length === 0 || bulkDeleting} type="button" onClick={clearSelection}>
                  選択解除
                </button>
                <button className="button danger small" disabled={selectedRoomIds.length === 0 || bulkDeleting} type="button" onClick={deleteSelectedRooms}>
                  {bulkDeleting ? '削除中...' : '選択した大会を削除'}
                </button>
                <button className="button secondary small" disabled={bulkDeleting} type="button" onClick={loadRooms}>
                  再読み込み
                </button>
              </div>
            </div>
            <div className="roomManageList">
              {rooms.map(({ room, questionCount, participantCount }) => (
                <div className={`roomManageItem ${selectedRoomIds.includes(room.id) ? 'selected' : ''}`} key={room.id}>
                  <label className="roomSelect">
                    <input
                      checked={selectedRoomIds.includes(room.id)}
                      type="checkbox"
                      onChange={() => toggleRoomSelection(room.id)}
                    />
                    <span>選択</span>
                  </label>
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
                    <button
                      className="button danger small"
                      disabled={deletingRoomId === room.id || bulkDeleting}
                      type="button"
                      onClick={() => deleteRoom(room)}
                    >
                      {deletingRoomId === room.id ? '削除中...' : '削除'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="muted">発行済みの参加コードはありません。</p>
        )}
      </div>
    </section>
  );
}
