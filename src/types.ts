export type Screen = 'home' | 'detail'
export type Tab = 'milestones' | 'journal'
export type Nav = 'todos' | 'calendar' | 'analytics' | 'profile' | 'hobbies' | 'explore'

export type Priority = 'low' | 'medium' | 'high'
export type Recurrence = 'none' | 'daily' | 'weekdays' | 'weekly'

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  deadline: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  category: string;
  priority: Priority;
  done: boolean;
  recurrence?: Recurrence; // 'none' | 'daily' | 'weekdays' | 'weekly'
  completedAt?: string; // ISO string
  createdAt: string; // ISO string
}

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

export interface EmailReminderSettings {
  enabled: boolean;
  email: string;
  time: string; // e.g. "08:00"
  frequency: 'daily' | 'weekdays';
  lastSentDate?: string;
}

export type AIPersonality = 'savage' | 'sergeant' | 'mentor';

export interface AISettings {
  groqApiKey: string;
  personality: AIPersonality;
  enabled: boolean;
  lastRoast?: string;
  lastRoastDate?: string;
}

export interface AccountData {
  todos: TodoItem[];
  streakCount: number;
  lastCompletedDate: string | null;
  streakHistory: string[];
  soundEnabled?: boolean;
  emailReminder?: EmailReminderSettings;
  aiSettings?: AISettings;
  hobbies?: Hobby[];
  milestones?: Milestone[];
  sessions?: PracticeSession[];
  lastActiveDate?: string | null;
}

export interface AppState {
  currentUser: UserAccount | null;
  accounts: UserAccount[];
  accountData?: Record<string, AccountData>;
  todos: TodoItem[];
  streakCount: number;
  lastCompletedDate: string | null;
  streakHistory: string[];
  soundEnabled: boolean;
  emailReminder: EmailReminderSettings;
  aiSettings: AISettings;
  hobbies: Hobby[];
  milestones: Milestone[];
  sessions: PracticeSession[];
  lastActiveDate: string | null;
  activeNav: Nav;
  selectedHobbyId: string | null;
  screen: Screen;
  isOnboarded: boolean;
  firebaseUid: string | null;
}

