import { v4 as uuidv4 } from 'uuid';

export interface UserSession {
  id: string;
  state: SessionState;
  data: SessionData;
  lastActive: Date;
}

export enum SessionState {
  INIT = 'INIT',
  AWAITING_REASON = 'AWAITING_REASON',
  AWAITING_DATE = 'AWAITING_DATE',
  SELECTING_SLOT = 'SELECTING_SLOT',
  AWAITING_NAME = 'AWAITING_NAME',
  AWAITING_EMAIL = 'AWAITING_EMAIL',
  AWAITING_CONFIRMATION = 'AWAITING_CONFIRMATION',
  COMPLETED = 'COMPLETED'
}

export interface SessionData {
  reason?: string;
  appointmentType?: any; // EventType
  preferredDate?: Date;
  preferredTimeRange?: { startHour: number; endHour: number };
  availableSlots?: any[]; // TimeSlot[]
  selectedSlot?: any; // TimeSlot
  name?: string;
  email?: string;
}

export class SessionManager {
  private sessions: Map<string, UserSession> = new Map();

  createSession(id?: string): UserSession {
    const sessionId = id || uuidv4();
    const session: UserSession = {
      id: sessionId,
      state: SessionState.INIT,
      data: {},
      lastActive: new Date()
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(id: string): UserSession | undefined {
    return this.sessions.get(id);
  }

  updateSession(id: string, updates: Partial<UserSession>) {
    const session = this.getSession(id);
    if (session) {
      Object.assign(session, updates);
      session.lastActive = new Date();
      this.sessions.set(id, session);
    }
  }
}

export const sessionManager = new SessionManager();
