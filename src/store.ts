import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AppState, TodoItem, Nav, Screen, UserAccount, Hobby, Milestone, PracticeSession, Priority, Recurrence, EmailReminderSettings, AISettings } from './types'
import {
  ensureFirebaseAuth,
  getFirebaseUid,
  saveUserToFirestore,
  saveFullAccountToFirestore,
  syncTodoToFirestore,
  deleteTodoFromFirestore,
  deleteAccountFromFirestore,
  loadUserDataFromFirestore,
} from './firebase'

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getRelativeDays(dateStr: string): number {
  if (!dateStr) return 0
  const today = new Date(getLocalDateString())
  const target = new Date(dateStr.split('T')[0])
  const diffTime = target.getTime() - today.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

export function getYesterdayString(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return getLocalDateString(yesterday)
}

export function getTomorrowString(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return getLocalDateString(tomorrow)
}

export function getDaysAheadString(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return getLocalDateString(d)
}

export function getNextOccurrenceDate(baseDateStr: string, recurrence: Recurrence): string {
  const today = getLocalDateString()
  const effectiveBase = !baseDateStr || baseDateStr < today ? today : baseDateStr.split('T')[0]
  const [y, m, d] = effectiveBase.split('-').map(Number)
  const date = new Date(y, m - 1, d)

  if (recurrence === 'daily') {
    date.setDate(date.getDate() + 1)
  } else if (recurrence === 'weekdays') {
    do {
      date.setDate(date.getDate() + 1)
    } while (date.getDay() === 0 || date.getDay() === 6)
  } else if (recurrence === 'weekly') {
    date.setDate(date.getDate() + 7)
  }

  return getLocalDateString(date)
}

import { setSoundMuted } from './utils/sound'

interface AppStore extends AppState {
  // To-Do Actions
  addTodo: (todo: Omit<TodoItem, 'id' | 'createdAt'>) => void
  toggleTodo: (todoId: string) => boolean // returns true if completed extends/maintains streak
  rescheduleTodo: (todoId: string, newDeadline: string) => void
  deleteTodo: (todoId: string) => void
  updateTodo: (todoId: string, updates: Partial<TodoItem>) => void
  updateUserName: (name: string) => void

  // Sound, Reminders & AI
  toggleSound: () => void
  setEmailReminder: (settings: EmailReminderSettings) => void
  setAISettings: (settings: Partial<AISettings>) => void

  // Account Actions
  createAccount: (
    name: string,
    initialTodoTitle?: string,
    initialDeadline?: string,
    initialPriority?: Priority,
    initialCategory?: string,
    initialRecurrence?: Recurrence
  ) => void
  switchAccount: (accountId: string) => void
  logout: () => void
  deleteAccount: (accountId: string) => void
  resetToNewUser: () => void

  // Navigation & Screen Actions
  setNav: (nav: Nav) => void
  setScreen: (screen: Screen) => void

  // Legacy compat
  addHobby: (hobby: Hobby) => void
  deleteHobby: (hobbyId: string) => void
  addMilestone: (milestone: Omit<Milestone, 'id'>) => void
  deleteMilestone: (milestoneId: string) => void
  toggleCheckpoint: (milestoneId: string, checkpointId: string) => void
  saveSession: (session: Omit<PracticeSession, 'id'>) => void

  // Sync
  syncWithFirestore: () => Promise<void>
}

const defaultEmailReminder: EmailReminderSettings = {
  enabled: false,
  email: '',
  time: '08:00',
  frequency: 'daily',
}

const defaultAISettings: AISettings = {
  groqApiKey: '',
  personality: 'savage',
  enabled: true,
}

const initialState: AppState = {
  currentUser: null,
  accounts: [],
  accountData: {},
  todos: [],
  streakCount: 0,
  lastCompletedDate: null,
  streakHistory: [],
  soundEnabled: true,
  emailReminder: defaultEmailReminder,
  aiSettings: defaultAISettings,
  hobbies: [],
  milestones: [],
  sessions: [],
  lastActiveDate: null,
  activeNav: 'todos',
  selectedHobbyId: null,
  screen: 'home',
  isOnboarded: false,
  firebaseUid: null,
}


export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      syncWithFirestore: async () => {
        const uid = get().firebaseUid || (await ensureFirebaseAuth())
        if (!uid) return
        set({ firebaseUid: uid })

        const cloudData = await loadUserDataFromFirestore(uid)
        if (!cloudData) return

        const currentAccounts = get().accounts
        const currentAccountData = get().accountData || {}

        // If cloud has accounts, merge with local
        if (cloudData.accounts && cloudData.accounts.length > 0) {
          const mergedAccountsMap = new Map<string, UserAccount>()
          currentAccounts.forEach((a) => mergedAccountsMap.set(a.id, a))
          cloudData.accounts.forEach((a) => mergedAccountsMap.set(a.id, a))

          const mergedAccounts = Array.from(mergedAccountsMap.values())
          const mergedAccountData = { ...currentAccountData, ...cloudData.accountData }

          const activeUser = get().currentUser
          if (activeUser && mergedAccountData[activeUser.id]) {
            const myData = mergedAccountData[activeUser.id]
            set({
              accounts: mergedAccounts,
              accountData: mergedAccountData,
              todos: myData.todos || [],
              streakCount: myData.streakCount || 0,
              lastCompletedDate: myData.lastCompletedDate || null,
              streakHistory: myData.streakHistory || [],
            })
          } else {
            set({
              accounts: mergedAccounts,
              accountData: mergedAccountData,
            })
          }
        } else if (cloudData.todos && cloudData.todos.length > 0 && get().todos.length === 0) {
          set({ todos: cloudData.todos })
        }
      },

      addTodo: (todoData) => {
        const current = get().currentUser
        const newTodo: TodoItem = {
          ...todoData,
          id: 'td-' + Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString(),
        }

        const uid = get().firebaseUid || getFirebaseUid()
        if (uid) {
          syncTodoToFirestore(uid, newTodo, current?.id)
        }

        set((state) => {
          const updatedTodos = [newTodo, ...state.todos]
          const accountData = { ...(state.accountData || {}) }
          if (current) {
            accountData[current.id] = {
              ...(accountData[current.id] || { streakCount: 0, lastCompletedDate: null, streakHistory: [] }),
              todos: updatedTodos,
              streakCount: state.streakCount,
              lastCompletedDate: state.lastCompletedDate,
              streakHistory: state.streakHistory,
            }
          }
          return {
            todos: updatedTodos,
            accountData,
          }
        })
      },

      toggleTodo: (todoId: string) => {
        const today = getLocalDateString()
        const yesterday = getYesterdayString()
        let didExtendStreak = false

        set((state) => {
          const target = state.todos.find((t) => t.id === todoId)
          if (!target) return state

          const willBeDone = !target.done
          const updatedTodos = state.todos.map((t) =>
            t.id === todoId
              ? {
                  ...t,
                  done: willBeDone,
                  completedAt: willBeDone ? new Date().toISOString() : undefined,
                }
              : t
          )

          const uid = get().firebaseUid || getFirebaseUid()
          const current = state.currentUser
          const updatedTarget = updatedTodos.find((t) => t.id === todoId)
          if (uid && updatedTarget) {
            syncTodoToFirestore(uid, updatedTarget, current?.id)
          }

          let newStreakCount = state.streakCount
          let newLastCompletedDate = state.lastCompletedDate
          let newStreakHistory = [...state.streakHistory]

          if (willBeDone) {
            // Task marked as complete
            didExtendStreak = true

            // If task is recurring, auto-schedule the next occurrence
            if (target.recurrence && target.recurrence !== 'none') {
              const nextDeadline = getNextOccurrenceDate(target.deadline || today, target.recurrence)
              const nextRecurringTodo: TodoItem = {
                id:
                  typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : 'td-' + Math.random().toString(36).substr(2, 7),
                title: target.title,
                description: target.description,
                deadline: nextDeadline,
                category: target.category,
                priority: target.priority,
                recurrence: target.recurrence,
                done: false,
                createdAt: new Date().toISOString(),
              }
              updatedTodos.push(nextRecurringTodo)
              if (uid) {
                syncTodoToFirestore(uid, nextRecurringTodo, current?.id)
              }
            }

            const hasOtherDoneToday = updatedTodos.some(
              (t) => t.id !== todoId && t.done && t.completedAt?.startsWith(today)
            )

            if (!hasOtherDoneToday) {
              // First task completed today!
              if (state.lastCompletedDate === yesterday) {
                newStreakCount = state.streakCount + 1
              } else if (state.lastCompletedDate === today) {
                newStreakCount = state.streakCount
              } else {
                newStreakCount = 1
              }

              newLastCompletedDate = today
              if (!newStreakHistory.includes(today)) {
                newStreakHistory.push(today)
              }
            }
          } else {
            // Task uncompleted - check if any other task was completed today
            const anyRemainingToday = updatedTodos.some(
              (t) => t.done && t.completedAt?.startsWith(today)
            )

            if (!anyRemainingToday) {
              // Revert today's streak
              newStreakHistory = newStreakHistory.filter((d) => d !== today)
              const previousDates = newStreakHistory.filter((d) => d < today).sort()
              const prevDate = previousDates[previousDates.length - 1] || null

              if (newLastCompletedDate === today) {
                newLastCompletedDate = prevDate
                newStreakCount = Math.max(0, state.streakCount - 1)
              }
            }
          }

          // Update current user accountData
          const accountData = { ...(state.accountData || {}) }
          if (current) {
            accountData[current.id] = {
              todos: updatedTodos,
              streakCount: newStreakCount,
              lastCompletedDate: newLastCompletedDate,
              streakHistory: newStreakHistory,
            }

            if (uid) {
              saveFullAccountToFirestore(uid, current, accountData[current.id])
            }
          }

          return {
            todos: updatedTodos,
            streakCount: newStreakCount,
            lastCompletedDate: newLastCompletedDate,
            streakHistory: newStreakHistory,
            accountData,
          }
        })

        return didExtendStreak
      },

      deleteTodo: (todoId) => {
        const current = get().currentUser
        const uid = get().firebaseUid || getFirebaseUid()
        if (uid) {
          deleteTodoFromFirestore(uid, todoId, current?.id)
        }

        set((state) => {
          const updatedTodos = state.todos.filter((t) => t.id !== todoId)
          const accountData = { ...(state.accountData || {}) }
          if (current && accountData[current.id]) {
            accountData[current.id] = {
              ...accountData[current.id],
              todos: updatedTodos,
            }
          }
          return {
            todos: updatedTodos,
            accountData,
          }
        })
      },

      rescheduleTodo: (todoId, newDeadline) => {
        const current = get().currentUser
        set((state) => {
          const updatedTodos = state.todos.map((t) =>
            t.id === todoId ? { ...t, deadline: newDeadline } : t
          )

          const uid = get().firebaseUid || getFirebaseUid()
          const target = updatedTodos.find((t) => t.id === todoId)
          if (uid && target) {
            syncTodoToFirestore(uid, target, current?.id)
          }

          const accountData = { ...(state.accountData || {}) }
          if (current && accountData[current.id]) {
            accountData[current.id] = {
              ...accountData[current.id],
              todos: updatedTodos,
            }
          }

          return { todos: updatedTodos, accountData }
        })
      },

      toggleSound: () => {
        set((state) => {
          const next = !state.soundEnabled
          setSoundMuted(!next)
          return { soundEnabled: next }
        })
      },

      setEmailReminder: (settings) => {
        const current = get().currentUser
        set((state) => {
          const accountData = { ...(state.accountData || {}) }
          if (current && accountData[current.id]) {
            accountData[current.id] = {
              ...accountData[current.id],
              emailReminder: settings,
            }
          }

          const uid = get().firebaseUid || getFirebaseUid()
          if (uid && current) {
            saveUserToFirestore(uid, {
              ...current,
              emailReminder: settings,
            } as any)
          }

          return {
            emailReminder: settings,
            accountData,
          }
        })
      },

      setAISettings: (settings) => {
        const current = get().currentUser
        set((state) => {
          const updatedAISettings = {
            ...state.aiSettings,
            ...settings,
          }
          const accountData = { ...(state.accountData || {}) }
          if (current && accountData[current.id]) {
            accountData[current.id] = {
              ...accountData[current.id],
              aiSettings: updatedAISettings,
            }
          }

          const uid = get().firebaseUid || getFirebaseUid()
          if (uid && current) {
            saveUserToFirestore(uid, {
              ...current,
              aiSettings: updatedAISettings,
            } as any)
          }

          return {
            aiSettings: updatedAISettings,
            accountData,
          }
        })
      },

      updateTodo: (todoId, updates) => {

        const current = get().currentUser
        set((state) => {
          const updatedTodos = state.todos.map((t) =>
            t.id === todoId ? { ...t, ...updates } : t
          )

          const uid = get().firebaseUid || getFirebaseUid()
          const target = updatedTodos.find((t) => t.id === todoId)
          if (uid && target) {
            syncTodoToFirestore(uid, target, current?.id)
          }

          const accountData = { ...(state.accountData || {}) }
          if (current && accountData[current.id]) {
            accountData[current.id] = {
              ...accountData[current.id],
              todos: updatedTodos,
            }
          }

          return { todos: updatedTodos, accountData }
        })
      },

      updateUserName: (name) => {
        const trimmed = name.trim() || 'Productive Maker'
        set((state) => {
          if (!state.currentUser) return state
          const updatedUser: UserAccount = {
            ...state.currentUser,
            name: trimmed,
          }
          const uid = state.firebaseUid || getFirebaseUid()
          if (uid) {
            saveUserToFirestore(uid, updatedUser)
          }
          return {
            currentUser: updatedUser,
            accounts: state.accounts.map((a) =>
              a.id === updatedUser.id ? updatedUser : a
            ),
          }
        })
      },

      createAccount: (name, initialTodoTitle, initialDeadline, initialPriority, initialCategory, initialRecurrence) => {
        const trimmedName = name.trim() || 'Maker'
        const accountId = 'usr-' + Math.random().toString(36).substr(2, 7)
        const colors = ['#CC8F3F', '#6E8B6B', '#5B6B77', '#B26E53', '#4F7959', '#655A75']
        const randomColor = colors[Math.floor(Math.random() * colors.length)]
        const today = getLocalDateString()

        const newAccount: UserAccount = {
          id: accountId,
          name: trimmedName,
          avatarColor: randomColor,
          createdAt: today,
        }

        const initialTodos: TodoItem[] = []

        if (initialTodoTitle && initialTodoTitle.trim()) {
          initialTodos.push({
            id: 'td-' + Math.random().toString(36).substr(2, 7),
            title: initialTodoTitle.trim(),
            deadline: initialDeadline || today,
            priority: initialPriority || 'medium',
            category: initialCategory || 'Work',
            recurrence: initialRecurrence || 'none',
            done: false,
            createdAt: new Date().toISOString(),
          })
        }

        // Add a helpful starter to-do to kick off the streak!
        initialTodos.push({
          id: 'td-welcome-' + Math.random().toString(36).substr(2, 6),
          title: `Welcome, ${trimmedName}! Complete your first task to start your daily streak 🔥`,
          description: 'Click the checkbox on the left to check off your first task and ignite your streak!',
          deadline: today,
          category: 'Personal',
          priority: 'high',
          done: false,
          createdAt: new Date().toISOString(),
        })

        const currentAccountData = get().accountData || {}
        const updatedAccountData = { ...currentAccountData }

        // Save current user data if there was one
        const current = get().currentUser
        if (current) {
          updatedAccountData[current.id] = {
            todos: get().todos,
            streakCount: get().streakCount,
            lastCompletedDate: get().lastCompletedDate,
            streakHistory: get().streakHistory,
          }
        }

        const newUserData = {
          todos: initialTodos,
          streakCount: 0,
          lastCompletedDate: null,
          streakHistory: [],
        }

        updatedAccountData[accountId] = newUserData

        ensureFirebaseAuth().then((uid) => {
          if (!uid) return
          set({ firebaseUid: uid })
          saveUserToFirestore(uid, newAccount)
          saveFullAccountToFirestore(uid, newAccount, newUserData)
        })

        set((state) => ({
          currentUser: newAccount,
          accounts: [...state.accounts.filter((a) => a.id !== newAccount.id), newAccount],
          accountData: updatedAccountData,
          todos: initialTodos,
          streakCount: 0,
          lastCompletedDate: null,
          streakHistory: [],
          isOnboarded: true,
          screen: 'home',
          activeNav: 'todos',
        }))
      },

      switchAccount: (accountId) => {
        const target = get().accounts.find((a) => a.id === accountId)
        if (!target) return

        const current = get().currentUser
        const allAccountData = get().accountData || {}
        const updatedAccountData = { ...allAccountData }
        if (current) {
          updatedAccountData[current.id] = {
            todos: get().todos,
            streakCount: get().streakCount,
            lastCompletedDate: get().lastCompletedDate,
            streakHistory: get().streakHistory,
          }
          const uid = get().firebaseUid || getFirebaseUid()
          if (uid) {
            saveFullAccountToFirestore(uid, current, updatedAccountData[current.id])
          }
        }

        const targetData = updatedAccountData[accountId] || {
          todos: [],
          streakCount: 0,
          lastCompletedDate: null,
          streakHistory: [],
        }

        set({
          currentUser: target,
          accountData: updatedAccountData,
          todos: targetData.todos || [],
          streakCount: targetData.streakCount || 0,
          lastCompletedDate: targetData.lastCompletedDate || null,
          streakHistory: targetData.streakHistory || [],
          soundEnabled: targetData.soundEnabled ?? true,
          emailReminder: targetData.emailReminder || defaultEmailReminder,
          aiSettings: targetData.aiSettings || defaultAISettings,
          isOnboarded: true,
          screen: 'home',
          activeNav: 'todos',
        })

        get().syncWithFirestore()
      },

      logout: () => {
        const current = get().currentUser
        const allAccountData = get().accountData || {}
        const updatedAccountData = { ...allAccountData }
        if (current) {
          updatedAccountData[current.id] = {
            todos: get().todos,
            streakCount: get().streakCount,
            lastCompletedDate: get().lastCompletedDate,
            streakHistory: get().streakHistory,
          }
          const uid = get().firebaseUid || getFirebaseUid()
          if (uid) {
            saveFullAccountToFirestore(uid, current, updatedAccountData[current.id])
          }
        }

        set({
          currentUser: null,
          accountData: updatedAccountData,
          todos: [],
          isOnboarded: false,
          screen: 'home',
          activeNav: 'todos',
        })
      },

      deleteAccount: (accountId) => {
        const remaining = get().accounts.filter((a) => a.id !== accountId)
        const allAccountData = { ...(get().accountData || {}) }
        delete allAccountData[accountId]

        const uid = get().firebaseUid || getFirebaseUid()
        if (uid) {
          deleteAccountFromFirestore(uid, accountId)
        }

        if (get().currentUser?.id === accountId) {
          set({
            currentUser: null,
            accounts: remaining,
            accountData: allAccountData,
            todos: [],
            isOnboarded: false,
            screen: 'home',
            activeNav: 'todos',
          })
        } else {
          set({
            accounts: remaining,
            accountData: allAccountData,
          })
        }
      },

      resetToNewUser: () => {
        set({
          currentUser: null,
          accounts: [],
          accountData: {},
          todos: [],
          streakCount: 0,
          lastCompletedDate: null,
          streakHistory: [],
          isOnboarded: false,
          screen: 'home',
          activeNav: 'todos',
        })
      },

      setNav: (nav) => set({ activeNav: nav }),
      setScreen: (screen) => set({ screen }),

      // Legacy compatibility stubs
      addHobby: () => {},
      deleteHobby: () => {},
      addMilestone: () => {},
      deleteMilestone: () => {},
      toggleCheckpoint: () => {},
      saveSession: () => {},
    }),
    {
      name: 'craftpath-todo-storage-v2',
    }
  )
)
