export type QuizStatus =
  | 'waiting'
  | 'question'
  | 'answering'
  | 'closed'
  | 'revealed'
  | 'ranking'
  | 'finished';

export type QuestionType = 'multiple4' | 'multiple2' | 'truefalse' | 'text';

export type Room = {
  id: string;
  code: string;
  title: string;
  hostName: string;
  adminPin: string;
  defaultTimeLimit: number;
  useRanking: boolean;
  pointsPerCorrect: number;
  useSpeedBonus: boolean;
  maxParticipants: number;
  allowAnswerChanges: boolean;
  currentQuestionIndex: number;
  status: QuizStatus;
  phaseStartedAt?: string;
  createdAt: string;
};

export type Participant = {
  id: string;
  roomId: string;
  name: string;
  joinedAt: string;
  lastSeenAt: string;
  connected: boolean;
};

export type Question = {
  id: string;
  roomId: string;
  prompt: string;
  note: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string;
  explanation: string;
  timeLimit: number;
  points: number;
  orderIndex: number;
  imageUrl: string;
  draft: boolean;
  createdAt: string;
};

export type Answer = {
  id: string;
  roomId: string;
  questionId: string;
  participantId: string;
  answer: string;
  answeredAt: string;
  elapsedMs: number;
  isCorrect: boolean;
  pointsAwarded: number;
};

export type RoomSnapshot = {
  room: Room;
  participants: Participant[];
  questions: Question[];
  answers: Answer[];
};

export type RankingRow = {
  participant: Participant;
  rank: number;
  totalPoints: number;
  correctCount: number;
  totalElapsedMs: number;
};

export type HomeCopy = {
  eyebrow: string;
  title: string;
  description: string;
  hostButton: string;
  joinButton: string;
  joinTitle: string;
  codeLabel: string;
  nameLabel: string;
  joinSubmit: string;
  joinNote: string;
};

export type AppSettings = {
  id: 'global';
  homeCopy: HomeCopy;
  accessPassphraseHash: string;
  updatedAt: string;
};
