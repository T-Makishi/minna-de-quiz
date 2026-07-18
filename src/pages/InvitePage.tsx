import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Room } from '../types';

export function InvitePage() {
  const { roomCode = '' } = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const playUrl = `${window.location.origin}${import.meta.env.BASE_URL}#/play/${roomCode}`;

  useEffect(() => {
    let active = true;
    api.getRoomByCode(roomCode).then((nextRoom) => {
      if (!active) return;
      setRoom(nextRoom);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [roomCode]);

  if (loading) return <div className="panel narrow">読み込み中...</div>;

  if (!room) {
    return (
      <section className="inviteScreen">
        <div className="inviteCard">
          <p className="eyebrow">参加案内</p>
          <h1>参加コードが見つかりません</h1>
          <Link className="button primary large" to="/">
            トップへ戻る
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="inviteScreen">
      <div className="inviteCard">
        <div>
          <p className="eyebrow">参加案内</p>
          <h1>{room.title}</h1>
          <p className="inviteLead">スマートフォンのカメラでQRコードを読み取って参加してください。</p>
        </div>

        <div className="inviteMain">
          <div className="inviteSteps">
            <h2>参加方法</h2>
            <ol>
              <li>スマートフォンのカメラでQRコードを読み取ります。</li>
              <li>合言葉を入力します。</li>
              <li>表示名を入力して「参加する」を押します。</li>
            </ol>
            <div className="inviteCodeBox">
              <span>参加コード</span>
              <strong>{room.code}</strong>
            </div>
            <p className="smallNote">QRコードが読み取れない場合は、参加コードを入力してください。</p>
          </div>
          <div className="inviteQr">
            <QRCodeSVG value={playUrl} size={280} />
          </div>
        </div>
      </div>
    </section>
  );
}
