import { Answer, Participant, Question, RankingRow, Room } from '../types';

export const statusLabels: Record<Room['status'], string> = {
  waiting: '待機中',
  question: '問題表示中',
  answering: '回答受付中',
  closed: '受付終了',
  revealed: '正解発表中',
  ranking: 'ランキング表示中',
  finished: '終了',
};

export const typeLabels: Record<Question['type'], string> = {
  multiple4: '4択問題',
  multiple3: '3択問題',
  multiple2: '2択問題',
  truefalse: '○×問題',
  text: '自由記述問題',
};

export function createId(prefix = 'id') {
  if ('crypto' in window && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function normalizeCode(code: string) {
  return code.replace(/\D/g, '').slice(0, 6);
}

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

export function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}

export function stripChoicePrefix(value: string) {
  return value.trim().replace(/^[A-DＡ-Ｄ1-4]\s*[.．、:：)）]\s*/i, '');
}

export function formatChoiceLabel(question: Question, option: string, index: number) {
  if (question.type === 'truefalse') return option;
  const label = String.fromCharCode(65 + index);
  const text = stripChoicePrefix(option);
  return text ? `${label}. ${text}` : label;
}

export function checkAnswer(question: Question, value: string) {
  if (question.type === 'text') {
    return normalizeAnswer(question.correctAnswer) === normalizeAnswer(value);
  }
  return question.correctAnswer === value;
}

export function elapsedSince(startedAt?: string) {
  if (!startedAt) return 0;
  return Math.max(0, Date.now() - new Date(startedAt).getTime());
}

export function calculatePoints(room: Room, question: Question, isCorrect: boolean, elapsedMs: number) {
  if (!isCorrect) return 0;
  const base = question.points || room.pointsPerCorrect;
  if (!room.useSpeedBonus || question.timeLimit <= 0) return base;
  const limitMs = Math.max(1, question.timeLimit) * 1000;
  const remainingRatio = Math.max(0, (limitMs - elapsedMs) / limitMs);
  return base + Math.round(base * 0.3 * remainingRatio);
}

export function activeQuestion(room: Room, questions: Question[]) {
  return questions
    .filter((question) => !question.draft)
    .sort((a, b) => a.orderIndex - b.orderIndex)[room.currentQuestionIndex];
}

export function buildRanking(room: Room, participants: Participant[], answers: Answer[]): RankingRow[] {
  const rows = participants.map((participant) => {
    const ownAnswers = answers.filter((answer) => answer.participantId === participant.id);
    return {
      participant,
      rank: 1,
      totalPoints: ownAnswers.reduce((sum, answer) => sum + answer.pointsAwarded, 0),
      correctCount: ownAnswers.filter((answer) => answer.isCorrect).length,
      totalElapsedMs: ownAnswers.reduce((sum, answer) => sum + answer.elapsedMs, 0),
    };
  });

  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    if (room.useSpeedBonus) return a.totalElapsedMs - b.totalElapsedMs;
    return a.participant.joinedAt.localeCompare(b.participant.joinedAt);
  });

  let currentRank = 0;
  let previous: RankingRow | undefined;
  return rows.map((row, index) => {
    const tied =
      previous &&
      previous.totalPoints === row.totalPoints &&
      previous.correctCount === row.correctCount &&
      (!room.useSpeedBonus || previous.totalElapsedMs === row.totalElapsedMs);
    currentRank = tied ? currentRank : index + 1;
    previous = row;
    return { ...row, rank: currentRank };
  });
}

export function formatTimer(ms: number) {
  return Math.max(0, Math.ceil(ms / 1000));
}

export function formatTimeLimit(seconds: number) {
  return seconds > 0 ? `${seconds}秒` : '制限なし';
}
