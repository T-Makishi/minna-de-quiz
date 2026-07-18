import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatTimeLimit, stripChoicePrefix, typeLabels } from '../lib/quiz';
import { useRoomSnapshot } from '../hooks/useRoomSnapshot';

type PrintMode = 'participant' | 'host';

export function QuestionPrintPage() {
  const { roomId = '' } = useParams();
  const [mode, setMode] = useState<PrintMode>('participant');
  const { snapshot, loading, error } = useRoomSnapshot(roomId);
  const questions = (snapshot?.questions || [])
    .filter((question) => !question.draft)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  if (loading) return <div className="panel narrow">読み込み中...</div>;
  if (error || !snapshot) return <div className="panel narrow error">{error || 'ルームが見つかりません。'}</div>;

  return (
    <section className="printSheetPage">
      <div className="printToolbar">
        <div>
          <h1>印刷用ページ</h1>
          <p>{snapshot.room.title}</p>
        </div>
        <div className="printActions">
          <div className="segmentedControl" role="group" aria-label="印刷形式">
            <button className={mode === 'participant' ? 'active' : ''} type="button" onClick={() => setMode('participant')}>
              参加者用
            </button>
            <button className={mode === 'host' ? 'active' : ''} type="button" onClick={() => setMode('host')}>
              運営者用
            </button>
          </div>
          <Link className="button secondary" to={`/host/${roomId}`}>
            管理画面へ
          </Link>
          <button className="button primary" type="button" onClick={() => window.print()}>
            印刷する
          </button>
        </div>
      </div>

      <article className={`printSheet ${mode === 'participant' ? 'participantPrint' : 'hostPrint'}`}>
        <header className="printSheetHeader">
          <div>
            <span className="label">クイズ大会</span>
            <h2>{snapshot.room.title}</h2>
          </div>
          <p>{mode === 'participant' ? '参加者用' : '運営者用'} / {questions.length}問</p>
        </header>

        {mode === 'participant' ? (
          <div className="participantPrintPages">
            {questions.map((question, index) => (
              <section className={`participantPrintQuestion ${question.imageUrl ? 'withImage' : ''}`} key={question.id}>
                <div className="participantPrintContent">
                  <span>問題 {index + 1}</span>
                  <h3>{question.prompt || '無題の問題'}</h3>
                  {question.note && <p>{question.note}</p>}
                  {question.type !== 'text' && (
                    <ol>
                      {question.options.map((option, optionIndex) => (
                        <li key={`${optionIndex}-${option}`}>{stripChoicePrefix(option)}</li>
                      ))}
                    </ol>
                  )}
                </div>
                {question.imageUrl && (
                  <figure className="participantPrintImage">
                    <img src={question.imageUrl} alt={`問題${index + 1}の画像`} />
                  </figure>
                )}
              </section>
            ))}
            {questions.length === 0 && <p className="muted">印刷できる問題がありません。</p>}
          </div>
        ) : (
          <div className="printQuestionGrid">
            {questions.map((question, index) => (
              <section className="printQuestionCard" key={question.id}>
                <div className="printQuestionHead">
                  <span>問{index + 1}</span>
                  <strong>{question.prompt || '無題の問題'}</strong>
                </div>
                {question.note && <p className="printNote">{question.note}</p>}
                {question.type !== 'text' && (
                  <ol className="printOptions">
                    {question.options.map((option, optionIndex) => (
                      <li key={`${optionIndex}-${option}`}>{stripChoicePrefix(option)}</li>
                    ))}
                  </ol>
                )}
                <dl className="printAnswer">
                  <div>
                    <dt>形式</dt>
                    <dd>{typeLabels[question.type]}</dd>
                  </div>
                  <div>
                    <dt>正解</dt>
                    <dd>{question.correctAnswer || '未設定'}</dd>
                  </div>
                  <div>
                    <dt>制限</dt>
                    <dd>{formatTimeLimit(question.timeLimit)}</dd>
                  </div>
                  <div>
                    <dt>得点</dt>
                    <dd>{question.points}点</dd>
                  </div>
                </dl>
                {question.explanation && (
                  <p className="printExplanation">
                    <strong>解説：</strong>
                    {question.explanation}
                  </p>
                )}
              </section>
            ))}
            {questions.length === 0 && <p className="muted">印刷できる問題がありません。</p>}
          </div>
        )}
      </article>
    </section>
  );
}
