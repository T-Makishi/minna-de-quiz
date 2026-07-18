import { QRCodeSVG } from 'qrcode.react';
import { FormEvent, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { activeQuestion, buildRanking, formatTimeLimit, statusLabels } from '../lib/quiz';
import { loadHostPin, saveHostPin } from '../lib/storage';
import { useRoomSnapshot } from '../hooks/useRoomSnapshot';
import { Ranking } from '../ui/Ranking';
import { Question, QuizStatus } from '../types';

function questionSummary(question: Question | undefined, fallback: string) {
  return question ? question.prompt || '無題の問題' : fallback;
}

export function HostPage() {
  const { roomId = '' } = useParams();
  const { snapshot, loading, error, refresh } = useRoomSnapshot(roomId);
  const [pin, setPin] = useState(() => loadHostPin(roomId));
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const authorized = snapshot && pin === snapshot.room.adminPin;
  const publicUrl = snapshot ? `${window.location.origin}${import.meta.env.BASE_URL}#/play/${snapshot.room.code}` : '';
  const inviteUrl = snapshot ? `${window.location.origin}${import.meta.env.BASE_URL}#/invite/${snapshot.room.code}` : '';
  const question = snapshot ? activeQuestion(snapshot.room, snapshot.questions) : undefined;
  const liveQuestions = useMemo(
    () => (snapshot ? snapshot.questions.filter((item) => !item.draft).sort((a, b) => a.orderIndex - b.orderIndex) : []),
    [snapshot],
  );
  const previousQuestion = snapshot && snapshot.room.currentQuestionIndex > 0
    ? liveQuestions[snapshot.room.currentQuestionIndex - 1]
    : undefined;
  const nextLiveQuestion = snapshot ? liveQuestions[snapshot.room.currentQuestionIndex + 1] : undefined;
  const ranking = useMemo(
    () => (snapshot ? buildRanking(snapshot.room, snapshot.participants, snapshot.answers) : []),
    [snapshot],
  );
  const [copyMessage, setCopyMessage] = useState('');

  async function copyText(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(message);
    } catch {
      setCopyMessage('コピーできませんでした。URLまたは案内文を選択してコピーしてください。');
    }
    window.setTimeout(() => setCopyMessage(''), 2500);
  }

  function buildInviteMessage() {
    if (!snapshot) return '';
    return [
      `${snapshot.room.title}に参加してください。`,
      '',
      '1. 下のURLを開くか、会場のQRコードを読み取ってください。',
      '2. 合言葉を入力してください。',
      '3. 表示名を入力して「参加する」を押してください。',
      '',
      `参加URL：${publicUrl}`,
      `参加コード：${snapshot.room.code}`,
    ].join('\n');
  }

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

  async function moveQuestion(delta: number) {
    if (!snapshot) return;
    const maxIndex = Math.max(0, liveQuestions.length - 1);
    const nextIndex = Math.min(Math.max(snapshot.room.currentQuestionIndex + delta, 0), maxIndex);
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

      <div className="panel inviteTools">
        <div>
          <span className="label">参加者への案内</span>
          <h2>管理画面を見せずに案内できます</h2>
          <p className="muted">別タブで案内専用画面を開くか、案内文をコピーしてLINEやメールに貼り付けます。</p>
          {copyMessage && <p className="successMessage">{copyMessage}</p>}
        </div>
        <div className="inviteActions">
          <a className="button primary" href={inviteUrl} rel="noreferrer" target="_blank">
            参加案内を開く
          </a>
          <button className="button secondary" type="button" onClick={() => copyText(buildInviteMessage(), '案内文をコピーしました。')}>
            案内文をコピー
          </button>
          <button className="button secondary" type="button" onClick={() => copyText(publicUrl, '参加URLをコピーしました。')}>
            参加URLをコピー
          </button>
        </div>
      </div>

      <div className="panel currentBox">
        <div className="questionProgressHead">
          <div>
            <span className="label">進行中の問題</span>
            <h2>
              {question ? `${snapshot.room.currentQuestionIndex + 1}. ${question.prompt}` : '問題がまだありません'}
            </h2>
            <p>{question ? `${formatTimeLimit(question.timeLimit)} / ${question.points}点` : '問題編集画面で追加してください。'}</p>
          </div>
          <strong className="progressCount">
            {liveQuestions.length ? `${snapshot.room.currentQuestionIndex + 1} / ${liveQuestions.length}` : '0 / 0'}
          </strong>
        </div>
        <div className="questionProgressGrid">
          <div>
            <span className="label">前の問題</span>
            <p>{questionSummary(previousQuestion, '前の問題はありません')}</p>
          </div>
          <div>
            <span className="label">次の問題</span>
            <p>{questionSummary(nextLiveQuestion, '次の問題はありません')}</p>
          </div>
        </div>
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
        <button className="button secondary" onClick={() => setStatus('ranking')} disabled={!snapshot.room.useRanking}>
          ランキング表示
        </button>
        <div className="questionMoveButtons">
          <button className="button secondary" onClick={() => moveQuestion(-1)} disabled={snapshot.room.currentQuestionIndex <= 0 || !liveQuestions.length}>
            前の問題へ
          </button>
          <button className="button secondary" onClick={() => moveQuestion(1)} disabled={snapshot.room.currentQuestionIndex >= liveQuestions.length - 1 || !liveQuestions.length}>
            次の問題へ
          </button>
        </div>
        <button className="button danger" onClick={() => setStatus('finished')}>
          クイズ終了
        </button>
        <button className="button stop" onClick={emergencyStop}>
          緊急停止
        </button>
      </div>

      <div className="panel hostQuestionList">
        <div className="sectionTitleRow">
          <div>
            <h2>問題一覧</h2>
            <p className="muted">進行中の問題を確認しながら進められます。</p>
          </div>
          <div className="sectionActions">
            <Link className="button secondary small" to={`/host/${roomId}/print`}>
              印刷用ページ
            </Link>
            <Link className="button secondary small" to={`/host/${roomId}/questions`}>
              問題を編集
            </Link>
          </div>
        </div>
        <div className="hostQuestionItems">
          {liveQuestions.map((item, index) => (
            <button
              className={`hostQuestionItem ${index === snapshot.room.currentQuestionIndex ? 'active' : ''}`}
              disabled={index === snapshot.room.currentQuestionIndex}
              key={item.id}
              onClick={() => {
                api.updateRoom(roomId, {
                  currentQuestionIndex: index,
                  status: 'question',
                  phaseStartedAt: new Date().toISOString(),
                }).then(refresh);
              }}
              type="button"
            >
              <span>{index + 1}</span>
              <strong>{item.prompt || '無題の問題'}</strong>
              <small>
                {formatTimeLimit(item.timeLimit)} / {item.points}点
              </small>
            </button>
          ))}
          {liveQuestions.length === 0 && <p className="muted">問題編集画面で問題を追加してください。</p>}
        </div>
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
