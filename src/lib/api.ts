import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Answer, AppSettings, Participant, Question, QuizStatus, Room, RoomSnapshot, RoomSummary } from '../types';
import { createId } from './quiz';
import { buildDefaultSettings, normalizeHomeCopy } from './settings';

type Db = {
  rooms: Room[];
  participants: Participant[];
  questions: Question[];
  answers: Answer[];
  appSettings?: AppSettings;
};

type Unsubscribe = () => void;

export type RoomCreateInput = Omit<
  Room,
  'id' | 'code' | 'currentQuestionIndex' | 'status' | 'phaseStartedAt' | 'createdAt'
>;

const STORAGE_KEY = 'minna_quiz_db_v1';
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('minna_quiz_updates') : null;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function now() {
  return new Date().toISOString();
}

function loadDb(): Db {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { rooms: [], participants: [], questions: [], answers: [] };
  try {
    const db = JSON.parse(raw) as Db;
    return {
      rooms: db.rooms || [],
      participants: db.participants || [],
      questions: db.questions || [],
      answers: db.answers || [],
      appSettings: db.appSettings,
    };
  } catch {
    return { rooms: [], participants: [], questions: [], answers: [] };
  }
}

function saveDb(db: Db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  channel?.postMessage({ type: 'changed' });
}

function generateCode(existing: string[]) {
  let code = '';
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (existing.includes(code));
  return code;
}

function snapshotFromDb(db: Db, roomId: string): RoomSnapshot | null {
  const room = db.rooms.find((item) => item.id === roomId);
  if (!room) return null;
  return {
    room,
    participants: db.participants.filter((item) => item.roomId === roomId),
    questions: db.questions
      .filter((item) => item.roomId === roomId)
      .sort((a, b) => a.orderIndex - b.orderIndex),
    answers: db.answers.filter((item) => item.roomId === roomId),
  };
}

const localApi = {
  async getAppSettings() {
    const db = loadDb();
    if (db.appSettings) return { ...db.appSettings, homeCopy: normalizeHomeCopy(db.appSettings.homeCopy) };
    const settings = await buildDefaultSettings();
    db.appSettings = settings;
    saveDb(db);
    return settings;
  },
  async saveAppSettings(settings: AppSettings) {
    const db = loadDb();
    db.appSettings = { ...settings, homeCopy: normalizeHomeCopy(settings.homeCopy), updatedAt: now() };
    saveDb(db);
    return db.appSettings;
  },
  async createRoom(input: RoomCreateInput) {
    const db = loadDb();
    const room: Room = {
      ...input,
      id: createId('room'),
      code: generateCode(db.rooms.map((item) => item.code)),
      currentQuestionIndex: 0,
      status: 'waiting',
      createdAt: now(),
    };
    db.rooms.push(room);
    saveDb(db);
    return room;
  },
  async listRooms(): Promise<RoomSummary[]> {
    const db = loadDb();
    return [...db.rooms]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((room) => ({
        room,
        questionCount: db.questions.filter((question) => question.roomId === room.id && !question.draft).length,
      }));
  },
  async copyQuestions(sourceRoomId: string, targetRoomId: string, startIndex = 0) {
    const db = loadDb();
    const sourceQuestions = db.questions
      .filter((question) => question.roomId === sourceRoomId && !question.draft)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const copied = sourceQuestions.map((question, index) => ({
      ...question,
      id: createId('question'),
      roomId: targetRoomId,
      orderIndex: startIndex + index,
      draft: false,
      createdAt: now(),
    }));
    db.questions.push(...copied);
    saveDb(db);
    return copied.length;
  },
  async deleteRoom(roomId: string) {
    const db = loadDb();
    db.answers = db.answers.filter((answer) => answer.roomId !== roomId);
    db.participants = db.participants.filter((participant) => participant.roomId !== roomId);
    db.questions = db.questions.filter((question) => question.roomId !== roomId);
    db.rooms = db.rooms.filter((room) => room.id !== roomId);
    saveDb(db);
  },
  async getRoomByCode(code: string) {
    return loadDb().rooms.find((room) => room.code === code) || null;
  },
  async getSnapshot(roomId: string) {
    return snapshotFromDb(loadDb(), roomId);
  },
  async updateRoom(roomId: string, patch: Partial<Room>) {
    const db = loadDb();
    db.rooms = db.rooms.map((room) => (room.id === roomId ? { ...room, ...patch } : room));
    saveDb(db);
  },
  async setStatus(roomId: string, status: QuizStatus) {
    await localApi.updateRoom(roomId, { status, phaseStartedAt: now() });
  },
  async joinRoom(roomId: string, name: string) {
    const db = loadDb();
    const room = db.rooms.find((item) => item.id === roomId);
    if (!room) throw new Error('参加コードが見つかりません。');
    if (db.participants.filter((item) => item.roomId === roomId).length >= room.maxParticipants) {
      throw new Error('参加人数の上限に達しています。');
    }
    const duplicate = db.participants.some(
      (item) => item.roomId === roomId && item.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) throw new Error('同じ名前の参加者がいます。別の表示名にしてください。');
    const participant: Participant = {
      id: createId('participant'),
      roomId,
      name,
      joinedAt: now(),
      lastSeenAt: now(),
      connected: true,
    };
    db.participants.push(participant);
    saveDb(db);
    return participant;
  },
  async touchParticipant(participantId: string) {
    const db = loadDb();
    db.participants = db.participants.map((item) =>
      item.id === participantId ? { ...item, lastSeenAt: now(), connected: true } : item,
    );
    saveDb(db);
  },
  async saveQuestion(question: Question) {
    const db = loadDb();
    const existing = db.questions.some((item) => item.id === question.id);
    db.questions = existing
      ? db.questions.map((item) => (item.id === question.id ? question : item))
      : [...db.questions, question];
    saveDb(db);
  },
  async deleteQuestion(questionId: string) {
    const db = loadDb();
    db.questions = db.questions.filter((item) => item.id !== questionId);
    db.answers = db.answers.filter((item) => item.questionId !== questionId);
    saveDb(db);
  },
  async saveAnswer(answer: Answer, allowChange: boolean) {
    const db = loadDb();
    const existing = db.answers.find(
      (item) => item.questionId === answer.questionId && item.participantId === answer.participantId,
    );
    if (existing && !allowChange) return existing;
    db.answers = existing
      ? db.answers.map((item) => (item.id === existing.id ? { ...answer, id: existing.id } : item))
      : [...db.answers, answer];
    saveDb(db);
    return answer;
  },
  subscribe(roomId: string, callback: () => void): Unsubscribe {
    const listener = () => callback();
    channel?.addEventListener('message', listener);
    const interval = window.setInterval(callback, 4000);
    return () => {
      channel?.removeEventListener('message', listener);
      window.clearInterval(interval);
    };
  },
  subscribeAppSettings(callback: () => void): Unsubscribe {
    const listener = () => callback();
    channel?.addEventListener('message', listener);
    const interval = window.setInterval(callback, 6000);
    return () => {
      channel?.removeEventListener('message', listener);
      window.clearInterval(interval);
    };
  },
};

function toAppSettings(row: any): AppSettings {
  return {
    id: 'global',
    homeCopy: normalizeHomeCopy({
      eyebrow: row.home_eyebrow,
      title: row.home_title,
      description: row.home_description,
      hostButton: row.home_host_button,
      joinButton: row.home_join_button,
      joinTitle: row.home_join_title,
      codeLabel: row.home_code_label,
      nameLabel: row.home_name_label,
      joinSubmit: row.home_join_submit,
      joinNote: row.home_join_note,
    }),
    accessPassphraseHash: row.access_passphrase_hash || '',
    updatedAt: row.updated_at,
  };
}

function appSettingsRow(settings: AppSettings) {
  return {
    id: 'global',
    home_eyebrow: settings.homeCopy.eyebrow,
    home_title: settings.homeCopy.title,
    home_description: settings.homeCopy.description,
    home_host_button: settings.homeCopy.hostButton,
    home_join_button: settings.homeCopy.joinButton,
    home_join_title: settings.homeCopy.joinTitle,
    home_code_label: settings.homeCopy.codeLabel,
    home_name_label: settings.homeCopy.nameLabel,
    home_join_submit: settings.homeCopy.joinSubmit,
    home_join_note: settings.homeCopy.joinNote,
    access_passphrase_hash: settings.accessPassphraseHash,
    updated_at: settings.updatedAt,
  };
}

function toRoom(row: any): Room {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    hostName: row.host_name,
    adminPin: row.admin_pin,
    defaultTimeLimit: row.default_time_limit,
    useRanking: row.use_ranking,
    pointsPerCorrect: row.points_per_correct,
    useSpeedBonus: row.use_speed_bonus,
    maxParticipants: row.max_participants,
    allowAnswerChanges: row.allow_answer_changes,
    currentQuestionIndex: row.current_question_index,
    status: row.status,
    phaseStartedAt: row.phase_started_at || undefined,
    createdAt: row.created_at,
  };
}

function roomRow(room: Partial<Room>) {
  return {
    code: room.code,
    title: room.title,
    host_name: room.hostName,
    admin_pin: room.adminPin,
    default_time_limit: room.defaultTimeLimit,
    use_ranking: room.useRanking,
    points_per_correct: room.pointsPerCorrect,
    use_speed_bonus: room.useSpeedBonus,
    max_participants: room.maxParticipants,
    allow_answer_changes: room.allowAnswerChanges,
    current_question_index: room.currentQuestionIndex,
    status: room.status,
    phase_started_at: room.phaseStartedAt,
  };
}

function toParticipant(row: any): Participant {
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at || row.joined_at,
    connected: row.connected ?? true,
  };
}

function toQuestion(row: any): Question {
  return {
    id: row.id,
    roomId: row.room_id,
    prompt: row.prompt,
    note: row.note || '',
    type: row.type,
    options: row.options || [],
    correctAnswer: row.correct_answer,
    explanation: row.explanation || '',
    timeLimit: row.time_limit,
    points: row.points,
    orderIndex: row.order_index,
    imageUrl: row.image_url || '',
    draft: row.draft,
    createdAt: row.created_at,
  };
}

function questionRow(question: Question) {
  return {
    id: question.id,
    room_id: question.roomId,
    prompt: question.prompt,
    note: question.note,
    type: question.type,
    options: question.options,
    correct_answer: question.correctAnswer,
    explanation: question.explanation,
    time_limit: question.timeLimit,
    points: question.points,
    order_index: question.orderIndex,
    image_url: question.imageUrl,
    draft: question.draft,
  };
}

function toAnswer(row: any): Answer {
  return {
    id: row.id,
    roomId: row.room_id,
    questionId: row.question_id,
    participantId: row.participant_id,
    answer: row.answer,
    answeredAt: row.answered_at,
    elapsedMs: row.elapsed_ms,
    isCorrect: row.is_correct,
    pointsAwarded: row.points_awarded,
  };
}

async function fetchSnapshot(client: SupabaseClient, roomId: string): Promise<RoomSnapshot | null> {
  const [roomRes, participantRes, questionRes, answerRes] = await Promise.all([
    client.from('rooms').select('*').eq('id', roomId).single(),
    client.from('participants').select('*').eq('room_id', roomId).order('joined_at'),
    client.from('questions').select('*').eq('room_id', roomId).order('order_index'),
    client.from('answers').select('*').eq('room_id', roomId),
  ]);
  if (roomRes.error || !roomRes.data) return null;
  return {
    room: toRoom(roomRes.data),
    participants: (participantRes.data || []).map(toParticipant),
    questions: (questionRes.data || []).map(toQuestion),
    answers: (answerRes.data || []).map(toAnswer),
  };
}

const supabaseApi = supabase
  ? {
      async getAppSettings() {
        const { data, error } = await supabase.from('app_settings').select('*').eq('id', 'global').maybeSingle();
        if (data) return toAppSettings(data);
        const settings = await buildDefaultSettings();
        if (!error) {
          await supabase.from('app_settings').insert(appSettingsRow(settings));
        }
        return settings;
      },
      async saveAppSettings(settings: AppSettings) {
        const next = { ...settings, homeCopy: normalizeHomeCopy(settings.homeCopy), updatedAt: now() };
        const { data, error } = await supabase
          .from('app_settings')
          .upsert(appSettingsRow(next), { onConflict: 'id' })
          .select('*')
          .single();
        if (error || !data) throw new Error('アプリ設定を保存できませんでした。');
        return toAppSettings(data);
      },
      async createRoom(input: RoomCreateInput) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const candidate = generateCode([]);
          const { data, error } = await supabase
            .from('rooms')
            .insert(roomRow({ ...input, code: candidate, currentQuestionIndex: 0, status: 'waiting' }))
            .select('*')
            .single();
          if (!error && data) return toRoom(data);
        }
        throw new Error('参加コードを作成できませんでした。もう一度お試しください。');
      },
      async listRooms(): Promise<RoomSummary[]> {
        const [roomsRes, questionsRes] = await Promise.all([
          supabase.from('rooms').select('*').order('created_at', { ascending: false }),
          supabase.from('questions').select('room_id,draft'),
        ]);
        const questionCounts = new Map<string, number>();
        for (const question of questionsRes.data || []) {
          if (question.draft) continue;
          questionCounts.set(question.room_id, (questionCounts.get(question.room_id) || 0) + 1);
        }
        return (roomsRes.data || []).map((row) => {
          const room = toRoom(row);
          return {
            room,
            questionCount: questionCounts.get(room.id) || 0,
          };
        });
      },
      async copyQuestions(sourceRoomId: string, targetRoomId: string, startIndex = 0) {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('room_id', sourceRoomId)
          .eq('draft', false)
          .order('order_index');
        if (error) throw new Error('過去問を読み込めませんでした。');
        const copied = (data || []).map((row, index) => {
          const question = toQuestion(row);
          return questionRow({
            ...question,
            id: createId('question'),
            roomId: targetRoomId,
            orderIndex: startIndex + index,
            draft: false,
            createdAt: now(),
          });
        });
        if (copied.length === 0) return 0;
        const { error: insertError } = await supabase.from('questions').insert(copied);
        if (insertError) throw new Error('過去問をコピーできませんでした。');
        return copied.length;
      },
      async deleteRoom(roomId: string) {
        const answerDelete = await supabase.from('answers').delete().eq('room_id', roomId);
        const questionDelete = await supabase.from('questions').delete().eq('room_id', roomId);
        const participantDelete = await supabase.from('participants').delete().eq('room_id', roomId);
        const roomDelete = await supabase.from('rooms').delete().eq('id', roomId);
        const error = answerDelete.error || questionDelete.error || participantDelete.error || roomDelete.error;
        if (error) {
          throw new Error('過去大会を削除できませんでした。Supabase SQL Editorで room_delete_policy.sql を実行してください。');
        }
      },
      async getRoomByCode(code: string) {
        const { data } = await supabase.from('rooms').select('*').eq('code', code).maybeSingle();
        return data ? toRoom(data) : null;
      },
      async getSnapshot(roomId: string) {
        return fetchSnapshot(supabase, roomId);
      },
      async updateRoom(roomId: string, patch: Partial<Room>) {
        await supabase.from('rooms').update(roomRow(patch)).eq('id', roomId);
      },
      async setStatus(roomId: string, status: QuizStatus) {
        await supabase.from('rooms').update({ status, phase_started_at: now() }).eq('id', roomId);
      },
      async joinRoom(roomId: string, name: string) {
        const snapshot = await fetchSnapshot(supabase, roomId);
        if (!snapshot) throw new Error('参加コードが見つかりません。');
        if (snapshot.participants.length >= snapshot.room.maxParticipants) {
          throw new Error('参加人数の上限に達しています。');
        }
        if (snapshot.participants.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
          throw new Error('同じ名前の参加者がいます。別の表示名にしてください。');
        }
        const { data, error } = await supabase
          .from('participants')
          .insert({ room_id: roomId, name, last_seen_at: now(), connected: true })
          .select('*')
          .single();
        if (error || !data) throw new Error('参加できませんでした。名前を変えてもう一度お試しください。');
        return toParticipant(data);
      },
      async touchParticipant(participantId: string) {
        await supabase.from('participants').update({ last_seen_at: now(), connected: true }).eq('id', participantId);
      },
      async saveQuestion(question: Question) {
        await supabase.from('questions').upsert(questionRow(question));
      },
      async deleteQuestion(questionId: string) {
        await supabase.from('questions').delete().eq('id', questionId);
      },
      async saveAnswer(answer: Answer, allowChange: boolean) {
        if (allowChange) {
          const { data } = await supabase
            .from('answers')
            .upsert({
              room_id: answer.roomId,
              question_id: answer.questionId,
              participant_id: answer.participantId,
              answer: answer.answer,
              answered_at: answer.answeredAt,
              elapsed_ms: answer.elapsedMs,
              is_correct: answer.isCorrect,
              points_awarded: answer.pointsAwarded,
            }, { onConflict: 'question_id,participant_id' })
            .select('*')
            .single();
          return data ? toAnswer(data) : answer;
        }
        const { data } = await supabase
          .from('answers')
          .insert({
            room_id: answer.roomId,
            question_id: answer.questionId,
            participant_id: answer.participantId,
            answer: answer.answer,
            elapsed_ms: answer.elapsedMs,
            is_correct: answer.isCorrect,
            points_awarded: answer.pointsAwarded,
          })
          .select('*')
          .single();
        return data ? toAnswer(data) : answer;
      },
      subscribe(roomId: string, callback: () => void): Unsubscribe {
        const subscription = supabase
          .channel(`room:${roomId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, callback)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${roomId}` }, callback)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'questions', filter: `room_id=eq.${roomId}` }, callback)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'answers', filter: `room_id=eq.${roomId}` }, callback)
          .subscribe();
        const interval = window.setInterval(callback, 5000);
        return () => {
          window.clearInterval(interval);
          supabase.removeChannel(subscription);
        };
      },
      subscribeAppSettings(callback: () => void): Unsubscribe {
        const subscription = supabase
          .channel('app_settings:global')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: 'id=eq.global' }, callback)
          .subscribe();
        const interval = window.setInterval(callback, 6000);
        return () => {
          window.clearInterval(interval);
          supabase.removeChannel(subscription);
        };
      },
    }
  : null;

export const api = supabaseApi || localApi;
export const isSupabaseEnabled = Boolean(supabaseApi);
