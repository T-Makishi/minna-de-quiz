import { QRCodeSVG } from 'qrcode.react';
import { FormEvent, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { activeQuestion, buildRanking, formatTimeLimit, statusLabels } from '../lib/quiz';
import { loadHostPin, saveHostPin } from '../lib/storage';
import { useRoomSnapshot } from '../hooks/useRoomSnapshot';
import { Ranking } from '../ui/Ranking';
import { QuizStatus } from '../types';

export function HostPage() {
  const { roomId = '' } = useParams();
  const { snapshot, loading, error, refresh } = useRoomSnapshot(roomId);
  const [pin, setPin] = useState(() => loadHostPin(roomId));
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const authorized = snapshot && pin === snapshot.room.adminPin;
  const publicUrl = snapshot ? `${window.location.origin}${import.meta.env.BASE_URL}#/play/${snapshot.room.code}` : '';
  const question = snapshot ? activeQuestion(snapshot.room, snapshot.questions) : undefined;
  const ranking = useMemo(
    () => (snapshot ? buildRanking(snapshot.room, snapshot.participants, snapshot.answers) : []),
    [snapshot],
  );

  function unlock(event: FormEvent) {
    event.preventDefault();
    if (!snapshot) return;
    if (pinInput === snapshot.room.adminPin) {
      saveHostPin(snapshot.room.id, pinInput);
      setPin(pinInput);
      setPinError('');
    } else {
      setPinError('PINが違います。');
    }
  }

  async function setStatus(status: QuizStatus) {
    await api.setStatus(roomId, status);
    refresh();
  }

  async function nextQuestion() {
    if (!snapshot) return;
    const nextIndex = Math.min(snapshot.room.currentQuestionIndex + 1, Math.max(0, snapshot.questions.length - 1));
    await api.updateRoom(roomId, {
      currentQuestionIndex: nextIndex,
      status: 'question',
      phaseStartedAt: new Date().toISOString(),
    });
    refresh();
  }

  async function emergencyStop() {
    await api.setStatus(roomId, 'waiting');
    refresh();
  }

  if (loading) return <div className="panel narrow">読み込み中...</div>;
  if (error || !snapshot) return <div className="panel narrow error">{error || 'ルームが見つかりません。'}</div>;

  if (!authorized) {
    return (
      <section className="narrow">
        <div className="pageHead">
          <h1>管理画面ロック</h1>
          <p>{snapshot.room.title} の管理者PINを入力してください。</p>
        </div>
        <form className="panel formGrid" onSubmit={unlock}>
          <label>
            管理者PIN
            <input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={(event) => setPinInput(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </label>
          {pinError && <p className="error wide">{pinError}</p>}
          <button className="button primary wide large" type="submit">
            管理画面を開く
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="hostLayout">
      <div className="pageHead hostTitle">
        <div>
          <h1>{snapshot.room.title}</h1>
          <p>現在の状態：{statusLabels[snapshot.room.status]}</p>
        </div>
        <Link className="button secondary" to={`/host/${roomId}/questions`}>
          問題を編集
        </Link>
      </div>

      <div className="panel roomInfo">
        <div>
          <span className="label">参加コード</span>
          <strong className="roomCode">{snapshot.room.code}</strong>
        </div>
        <div>
          <span className="label">参加用URL</span>
          <a href={publicUrl}>{publicUrl}</a>
        </div>
        <div className="qrBox">
          <QRCodeSVG value={publicUrl} size={150} />
        </div>
      </div>

      <div className="panel currentBox">
        <span className="label">現在の問題</span>
        <h2>
          {question ? `${snapshot.room.currentQuestionIndex + 1}. ${question.prompt}` : '問題がまだありません'}
        </h2>
        <p>{question ? `${formatTimeLimit(question.timeLimit)} / ${question.points}点` : '問題編集画面で追加してください。'}</p>
      </div>

      <div className="panel controlGrid">
        <button className="button primary" onClick={() => setStatus('question')} disabled={!question}>
          問題表示
        </button>
        <button className="button primary" onClick={() => setStatus('answering')} disabled={!question}>
          回答受付開始
        </button>
        <button className="button secondary" onClick={() => setStatus('closed')}>
          回答受付終了
        </button>
        <button className="button secondary" onClick={() => setStatus('revealed')}>
          正解公開
        </button>
        <button className="button secondary" onClick={() => setStatus('revealed')}>
          結果表示
        </button>
        <button className="button secondary" onClick={() => setStatus('ranking')} disabled={!snapshot.room.useRanking}>
          ランキング表示
        </button>
        <button className="button secondary" onClick={nextQuestion} disabled={!snapshot.questions.length}>
          次の問題へ
        </button>
        <button className="button danger" onClick={() => setStatus('finished')}>
          クイズ終了
        </button>
        <button className="button stop" onClick={emergencyStop}>
          緊急停止
        </button>
      </div>

      <div className="twoColumns">
        <div className="panel">
          <h2>参加者 {snapshot.participants.length}人</h2>
          <div className="participantList">
            {snapshot.participants.map((participant) => (
              <span className="namePill" key={participant.id}>
                {participant.name}
              </span>
            ))}
            {snapshot.participants.length === 0 && <p className="muted">参加者の入室を待っています。</p>}
          </div>
        </div>
        <div className="panel">
          <h2>ランキング</h2>
          <Ranking rows={ranking} />
        </div>
      </div>
    </section>
  );
}
