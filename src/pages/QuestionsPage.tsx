import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { createId, typeLabels } from '../lib/quiz';
import { useRoomSnapshot } from '../hooks/useRoomSnapshot';
import { Question, QuestionType } from '../types';

const defaultOptions = {
  multiple4: ['A', 'B', 'C', 'D'],
  multiple2: ['A', 'B'],
  truefalse: ['○', '×'],
  text: [''],
};

function emptyQuestion(roomId: string, index: number, timeLimit: number, points: number): Question {
  return {
    id: createId('question'),
    roomId,
    prompt: '',
    note: '',
    type: 'multiple4',
    options: defaultOptions.multiple4,
    correctAnswer: 'A',
    explanation: '',
    timeLimit,
    points,
    orderIndex: index,
    imageUrl: '',
    draft: false,
    createdAt: new Date().toISOString(),
  };
}

export function QuestionsPage() {
  const { roomId = '' } = useParams();
  const { snapshot, loading, error, refresh } = useRoomSnapshot(roomId);
  const [editing, setEditing] = useState<Question | null>(null);
  const [dragId, setDragId] = useState('');
  const questions = useMemo(() => snapshot?.questions || [], [snapshot]);

  useEffect(() => {
    if (!editing && snapshot) {
      setEditing(emptyQuestion(roomId, questions.length, snapshot.room.defaultTimeLimit, snapshot.room.pointsPerCorrect));
    }
  }, [editing, questions.length, roomId, snapshot]);

  if (loading || !snapshot || !editing) return <div className="panel narrow">読み込み中...</div>;
  if (error) return <div className="panel narrow error">{error}</div>;
  const snapshotData = snapshot;
  const editingQuestion = editing;

  function changeType(type: QuestionType) {
    const options = defaultOptions[type];
    setEditing({
      ...editingQuestion,
      type,
      options,
      correctAnswer: type === 'text' ? '' : options[0],
    });
  }

  async function save(event: FormEvent, draft = false) {
    event.preventDefault();
    if (!editingQuestion.prompt.trim()) return;
    await api.saveQuestion({ ...editingQuestion, draft, prompt: editingQuestion.prompt.trim() });
    setEditing(emptyQuestion(roomId, questions.length + 1, snapshotData.room.defaultTimeLimit, snapshotData.room.pointsPerCorrect));
    refresh();
  }

  async function duplicate(question: Question) {
    await api.saveQuestion({
      ...question,
      id: createId('question'),
      orderIndex: questions.length,
      prompt: `${question.prompt}（複製）`,
      createdAt: new Date().toISOString(),
    });
    refresh();
  }

  async function reorder(sourceId: string, targetId: string) {
    const source = questions.find((question) => question.id === sourceId);
    const target = questions.find((question) => question.id === targetId);
    if (!source || !target || source.id === target.id) return;
    const next = [...questions];
    const sourceIndex = next.findIndex((question) => question.id === source.id);
    const targetIndex = next.findIndex((question) => question.id === target.id);
    next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, source);
    await Promise.all(next.map((question, index) => api.saveQuestion({ ...question, orderIndex: index })));
    refresh();
  }

  return (
    <section className="hostLayout">
      <div className="pageHead hostTitle">
        <div>
          <h1>問題作成・編集</h1>
          <p>{snapshot.room.title}</p>
        </div>
        <Link className="button secondary" to={`/host/${roomId}`}>
          管理画面へ
        </Link>
      </div>

      <form className="panel questionForm" onSubmit={(event) => save(event, false)}>
        <label className="wide">
          問題文
          <textarea value={editingQuestion.prompt} onChange={(event) => setEditing({ ...editingQuestion, prompt: event.target.value })} />
        </label>
        <label className="wide">
          補足説明
          <input value={editingQuestion.note} onChange={(event) => setEditing({ ...editingQuestion, note: event.target.value })} />
        </label>
        <label>
          問題形式
          <select value={editingQuestion.type} onChange={(event) => changeType(event.target.value as QuestionType)}>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          表示順
          <input
            type="number"
            value={editingQuestion.orderIndex + 1}
            onChange={(event) => setEditing({ ...editingQuestion, orderIndex: Math.max(0, Number(event.target.value) - 1) })}
          />
        </label>
        {editingQuestion.type !== 'text' && (
          <div className="optionsEditor wide">
            {editingQuestion.options.map((option, index) => (
              <label key={index}>
                選択肢 {index + 1}
                <input
                  value={option}
                  onChange={(event) => {
                    const options = editingQuestion.options.map((item, optionIndex) =>
                      optionIndex === index ? event.target.value : item,
                    );
                    setEditing({
                      ...editingQuestion,
                      options,
                      correctAnswer: options.includes(editingQuestion.correctAnswer) ? editingQuestion.correctAnswer : options[0],
                    });
                  }}
                />
              </label>
            ))}
          </div>
        )}
        <label>
          正解
          {editingQuestion.type === 'text' ? (
            <input value={editingQuestion.correctAnswer} onChange={(event) => setEditing({ ...editingQuestion, correctAnswer: event.target.value })} />
          ) : (
            <select value={editingQuestion.correctAnswer} onChange={(event) => setEditing({ ...editingQuestion, correctAnswer: event.target.value })}>
              {editingQuestion.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </label>
        <label>
          制限時間
          <input type="number" min={5} max={300} value={editingQuestion.timeLimit} onChange={(event) => setEditing({ ...editingQuestion, timeLimit: Number(event.target.value) })} />
        </label>
        <label>
          得点
          <input type="number" min={1} value={editingQuestion.points} onChange={(event) => setEditing({ ...editingQuestion, points: Number(event.target.value) })} />
        </label>
        <label className="wide">
          画像URL（任意）
          <input value={editingQuestion.imageUrl} onChange={(event) => setEditing({ ...editingQuestion, imageUrl: event.target.value })} />
        </label>
        <label className="wide">
          正解解説
          <textarea value={editingQuestion.explanation} onChange={(event) => setEditing({ ...editingQuestion, explanation: event.target.value })} />
        </label>
        <div className="buttonRow wide">
          <button className="button primary" type="submit">
            問題を保存
          </button>
          <button className="button secondary" type="button" onClick={(event) => save(event as unknown as FormEvent, true)}>
            下書き保存
          </button>
        </div>
      </form>

      <div className="panel">
        <h2>問題一覧</h2>
        <div className="questionList">
          {questions.map((question, index) => (
            <div
              className="questionItem"
              draggable
              key={question.id}
              onDragStart={() => setDragId(question.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => reorder(dragId, question.id)}
            >
              <div>
                <strong>
                  {index + 1}. {question.prompt || '無題の問題'}
                </strong>
                <span>
                  {typeLabels[question.type]} / {question.points}点 {question.draft ? '/ 下書き' : ''}
                </span>
              </div>
              <div className="miniActions">
                <button className="button secondary small" onClick={() => setEditing(question)}>
                  編集
                </button>
                <button className="button secondary small" onClick={() => duplicate(question)}>
                  複製
                </button>
                <button className="button danger small" onClick={() => api.deleteQuestion(question.id).then(refresh)}>
                  削除
                </button>
              </div>
            </div>
          ))}
          {questions.length === 0 && <p className="muted">まだ問題がありません。</p>}
        </div>
      </div>
    </section>
  );
}
