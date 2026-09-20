export type Screen = 'home' | 'detail'
export type Tab = 'milestones' | 'journal'
export type Nav = 'hobbies' | 'explore' | 'analytics' | 'profile'

export interface Checkpoint {
  id: string;
  title: string;
  done: boolean;
}

export interface Milestone {
  id: string;
  hobbyId: string;
  title: string;
  due: string;
  checkpoints: Checkpoint[];
}

export interface PracticeSession {
  id: string;
  hobbyId: string;
  duration: number;
  date: string;
  notes: string;
  milestoneId?: string;
}

export interface Hobby {
  id: string;
  name: string;
  category: string;
  color: string;
  bg: string;
  hours: number;
  sessions: number;
  progress: number;
}

export interface UserAccount {
  id: string;
  name: string;
  avatarColor: string;
  createdAt: string;
}

export interface AppState {
  currentUser: UserAccount | null;
  accounts: UserAccount[];
  hobbies: Hobby[];
  milestones: Milestone[];
  sessions: PracticeSession[];
  streakCount: number;
  lastActiveDate: string | null;
  activeNav: Nav;
  selectedHobbyId: string | null;
  screen: Screen;
  isOnboarded: boolean;
}
