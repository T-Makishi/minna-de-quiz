const PLAYER_KEY = 'minna_quiz_player';
const HOST_PIN_PREFIX = 'minna_quiz_host_pin_';

export type SavedPlayer = {
  roomId: string;
  participantId: string;
  participantName: string;
  roomCode: string;
};

export function savePlayer(player: SavedPlayer) {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
}

export function loadPlayer(roomCode?: string): SavedPlayer | null {
  const raw = localStorage.getItem(PLAYER_KEY);
  if (!raw) return null;
  try {
    const player = JSON.parse(raw) as SavedPlayer;
    if (roomCode && player.roomCode !== roomCode) return null;
    return player;
  } catch {
    return null;
  }
}

export function saveHostPin(roomId: string, pin: string) {
  localStorage.setItem(`${HOST_PIN_PREFIX}${roomId}`, pin);
}

export function loadHostPin(roomId: string) {
  return localStorage.getItem(`${HOST_PIN_PREFIX}${roomId}`) || '';
}
