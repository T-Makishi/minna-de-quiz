import { useCallback, useEffect, useState } from 'react';
import { RoomSnapshot } from '../types';
import { api } from '../lib/api';

export function useRoomSnapshot(roomId?: string) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!roomId) return;
    try {
      const next = await api.getSnapshot(roomId);
      setSnapshot(next);
      setError(next ? '' : 'ルームが見つかりません。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!roomId) return undefined;
    return api.subscribe(roomId, refresh);
  }, [refresh, roomId]);

  return { snapshot, loading, error, refresh };
}
