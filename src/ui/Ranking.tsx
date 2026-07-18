import { RankingRow } from '../types';

export function Ranking({ rows, currentParticipantId }: { rows: RankingRow[]; currentParticipantId?: string }) {
  if (rows.length === 0) {
    return <p className="muted">まだ参加者がいません。</p>;
  }

  return (
    <div className="rankingList">
      {rows.map((row) => (
        <div
          className={`rankingRow ${row.rank <= 3 ? 'topRank' : ''} ${
            currentParticipantId === row.participant.id ? 'isMine' : ''
          }`}
          key={row.participant.id}
        >
          <div className="rank">#{row.rank}</div>
          <div>
            <strong>{row.participant.name}</strong>
            <span>{row.correctCount}問正解</span>
          </div>
          <div className="score">{row.totalPoints}点</div>
        </div>
      ))}
    </div>
  );
}
