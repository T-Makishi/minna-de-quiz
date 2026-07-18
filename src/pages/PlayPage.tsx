import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import {
  activeQuestion,
  buildRanking,
  calculatePoints,
  checkAnswer,
  createId,
  elapsedSince,
  formatTimer,
  normalizeName,
  statusLabels,
} from '../lib/quiz';
import { loadPlayer, savePlayer } from '../lib/storage';
import { useRoomSnapshot } from '../hooks/useRoomSnapshot';
import { Ranking } from '../ui/Ranking';
import { Participant, Room } from '../types';

function JoinCard({
  roomCode,
  initialName,
  onJoined,
}: {
  roomCode: string;
  initialName: string;
  onJoined: (roomId: string, participant: Participant) => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  async function join(event: FormEvent) {
    event.preventDefault();
    const displayName = normalizeName(name);
    if (!displayName) {
      setError('表示名を入力してください。');
      return;
    }
    setJoining(true);
    setError('');
    try {
      const room = await api.getRoomByCode(roomCode);
      if (!room) throw new Error('参加コードが見つかりません。');
      const participant = await api.joinRoom(room.id, displayName);
      savePlayer({
        roomId: room.id,
        participantId: participant.id,
        participantName: participant.name,
        roomCode,
      });
      onJoined(room.id, participant);
    } catch (err) {
      setError(err instanceof Error ? err.message : '参加できませんでした。');
    } finally {
      setJoining(false);
    }
  }

  return (
    <section className="narrow">
      <div className="pageHead">
        <h1>クイズに参加</h1>
        <p>参加コード：{roomCode}</p>
      </div>
      <form className="panel formGrid" onSubmit={join}>
        <label>
          表示名
          <input autoFocus maxLength={24} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        {error && <p className="error wide">{error}</p>}
        <button className="button primary full large wide" disabled={joining} type="submit">
          {joining ? '参加中...' : '参加する'}
        </button>
      </form>
    </section>
  );
}

function WaitingView({ room, participant, count }: { room: Room; participant: Participant; count: number }) {
  return (
    <div className="playCard center">
      <span className="successBadge">参加完了</span>
      <h1>{room.title}</h1>
      <p className="bigText">{participant.name} さん、出題者が開始するまでお待ちください。</p>
      <p>現在の参加人数：{count}人</p>
    </div>
  );
}

export function PlayPage() {
  const { roomCode = '' } = useParams();
  const [params] = useSearchParams();
  const saved = loadPlayer(roomCode);
  const [roomId, setRoomId] = useState(saved?.roomId || '');
  const [participant, setParticipant] = useState<Participant | null>(
    saved
      ? {
          id: saved.participantId,
          roomId: saved.roomId,
          name: saved.participantName,
          joinedAt: '',
          lastSeenAt: '',
          connected: true,
        }
      : null,
  );
  const { snapshot, loading, error, refresh } = useRoomSnapshot(roomId);
  const [tick, setTick] = useState(0);
  const [textAnswer, setTextAnswer] = useState('');

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!participant) return undefined;
    const interval = window.setInterval(() => api.touchParticipant(participant.id), 15000);
    return () => window.clearInterval(interval);
  }, [participant]);

  const question = snapshot ? activeQuestion(snapshot.room, snapshot.questions) : undefined;
  const ownAnswer = snapshot?.answers.find(
    (answer) => answer.questionId === question?.id && answer.participantId === participant?.id,
  );
  const ranking = useMemo(
    () => (snapshot ? buildRanking(snapshot.room, snapshot.participants, snapshot.answers) : []),
    [snapshot],
  );
  const myRank = ranking.find((row) => row.participant.id === participant?.id);
  const elapsedMs = elapsedSince(snapshot?.room.phaseStartedAt);
  const remainingMs = question ? question.timeLimit * 1000 - elapsedMs : 0;
  const secondsLeft = formatTimer(remainingMs + tick * 0);

  async function submitAnswer(value: string) {
    if (!snapshot || !question || !participant || snapshot.room.status !== 'answering') return;
    const isCorrect = checkAnswer(question, value);
    const pointsAwarded = calculatePoints(snapshot.room, question, isCorrect, elapsedMs);
    await api.saveAnswer(
      {
        id: createId('answer'),
        roomId: snapshot.room.id,
        questionId: question.id,
        participantId: participant.id,
        answer: value,
        answeredAt: new Date().toISOString(),
        elapsedMs,
        isCorrect,
        pointsAwarded,
      },
      snapshot.room.allowAnswerChanges,
    );
    setTextAnswer('');
    refresh();
  }

  if (!participant || !roomId) {
    return (
      <JoinCard
        roomCode={roomCode}
        initialName={params.get('name') || ''}
        onJoined={(nextRoomId, nextParticipant) => {
          setRoomId(nextRoomId);
          setParticipant(nextParticipant);
        }}
      />
    );
  }

  if (loading) return <div className="panel narrow">読み込み中...</div>;
  if (error || !snapshot) return <div className="panel narrow error">{error || 'ルームが見つかりません。'}</div>;

  if (snapshot.room.status === 'waiting' || !question) {
    return <WaitingView room={snapshot.room} participant={participant} count={snapshot.participants.length} />;
  }

  if (snapshot.room.status === 'finished') {
    return (
      <div className="playCard">
        <h1>ご参加ありがとうございました</h1>
        {myRank && (
          <div className="myResult">
            <span>あなたの順位</span>
            <strong>{myRank.rank}位</strong>
            <span>
              {myRank.totalPoints}点 / {myRank.correctCount}問正解
            </span>
          </div>
        )}
        <Ranking rows={ranking} currentParticipantId={participant.id} />
        <Link className="button primary full large" to="/">
          トップへ戻る
        </Link>
      </div>
    );
  }

  if (snapshot.room.status === 'ranking') {
    return (
      <div className="playCard">
        <p className="eyebrow">ランキング</p>
        <h1>{snapshot.room.title}</h1>
        <Ranking rows={ranking} currentParticipantId={participant.id} />
      </div>
    );
  }

  if (snapshot.room.status === 'revealed') {
    return (
      <div className={`playCard ${ownAnswer?.isCorrect ? 'correctGlow' : ''}`}>
        <p className="eyebrow">正解発表</p>
        <h1>{ownAnswer?.isCorrect ? '正解です！' : '今回は惜しい結果でした'}</h1>
        <div className="answerSummary">
          <div>
            <span>正解</span>
            <strong>{question.correctAnswer}</strong>
          </div>
          <div>
            <span>自分の回答</span>
            <strong>{ownAnswer?.answer || '未回答'}</strong>
          </div>
          <div>
            <span>獲得点数</span>
            <strong>{ownAnswer?.pointsAwarded || 0}点</strong>
          </div>
        </div>
        {question.explanation && <p className="explanation">{question.explanation}</p>}
      </div>
    );
  }

  if (ownAnswer && !snapshot.room.allowAnswerChanges && snapshot.room.status !== 'question') {
    return (
      <div className="playCard center">
        <span className="successBadge">回答済み</span>
        <h1>回答を受け付けました</h1>
        <p className="bigText">あなたの回答：{ownAnswer.answer}</p>
        <p>正解発表をお待ちください。</p>
      </div>
    );
  }

  return (
    <div className="playCard">
      <div className="questionHeader">
        <span>第{snapshot.room.currentQuestionIndex + 1}問</span>
        <strong>{statusLabels[snapshot.room.status]}</strong>
      </div>
      <h1>{question.prompt}</h1>
      {question.note && <p className="bigText">{question.note}</p>}
      {question.imageUrl && <img className="questionImage" src={question.imageUrl} alt="" />}
      <div className="timer">残り {Math.max(0, secondsLeft)} 秒</div>

      {snapshot.room.status === 'question' && <p className="muted">回答受付開始までお待ちください。</p>}
      {snapshot.room.status === 'closed' && <p className="muted">回答受付は終了しました。正解発表をお待ちください。</p>}

      {snapshot.room.status === 'answering' && (
        <div className="answerArea">
          {question.type === 'text' ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (textAnswer.trim()) submitAnswer(textAnswer);
              }}
            >
              <input
                className="largeInput"
                placeholder="回答を入力"
                value={textAnswer}
                onChange={(event) => setTextAnswer(event.target.value)}
              />
              <button className="button primary full large" type="submit">
                回答を確定する
              </button>
            </form>
          ) : (
            <div className="choiceGrid">
              {question.options.map((option) => (
                <button className="choiceButton" key={option} onClick={() => submitAnswer(option)}>
                  {option}
                </button>
              ))}
            </div>
          )}
          {ownAnswer && snapshot.room.allowAnswerChanges && (
            <p className="smallNote">現在の回答：{ownAnswer.answer}（変更できます）</p>
          )}
        </div>
      )}
    </div>
  );
}
