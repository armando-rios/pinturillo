// Tipos compartidos entre features

export interface User {
  id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  currentRoom?: string;
}

export interface Room {
  id: string;
  name: string;
  players: User[];
  maxPlayers: number;
  isGameActive: boolean;
  currentRound: number;
  maxRounds: number;
}

export interface GameState {
  currentPlayer: string;
  word: string;
  timeLeft: number;
  round: number;
  scores: Record<string, number>;
  phase: 'waiting' | 'drawing' | 'guessing' | 'finished';
}

export interface DrawingData {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  color: string;
  lineWidth: number;
  isDrawing: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  isGuess: boolean;
  isCorrect?: boolean;
}
