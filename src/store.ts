import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AppState, Hobby, Milestone, PracticeSession, Nav, Screen, UserAccount } from './types'
import {
  ensureFirebaseAuth,
  getFirebaseUid,
  saveUserToFirestore,
  syncHobbyToFirestore,
  syncMilestoneToFirestore,
  syncSessionToFirestore,
  loadUserDataFromFirestore,
} from './firebase'

interface AppStore extends AppState {
  // Account Actions
  createAccount: (name: string, initialHobbyName?: string, initialCategory?: string, initialMilestone?: string) => void
  switchAccount: (accountId: string) => void
  resetToNewUser: () => void

  // Navigation & Screen Actions
  setNav: (nav: Nav) => void
  setScreen: (screen: Screen) => void
  setSelectedHobby: (id: string | null) => void

  // Craft & Milestone Actions
  addHobby: (hobby: Hobby) => void
  deleteHobby: (hobbyId: string) => void
  addMilestone: (milestone: Omit<Milestone, 'id'>) => void
  deleteMilestone: (milestoneId: string) => void
  toggleCheckpoint: (milestoneId: string, checkpointId: string) => void

  // Practice Session Actions
  saveSession: (session: Omit<PracticeSession, 'id'>) => void
  updateStreak: () => void
  syncWithFirestore: () => Promise<void>
}

const initialState: AppState = {
  currentUser: null,
  accounts: [],
  hobbies: [],
  milestones: [],
  sessions: [],
  streakCount: 0,
  lastActiveDate: null,
  activeNav: 'hobbies',
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
        const uid = get().firebaseUid || getFirebaseUid()
        if (!uid) return
        const data = await loadUserDataFromFirestore(uid)
        if (data && (data.hobbies.length > 0 || data.milestones.length > 0 || data.sessions.length > 0)) {
          set({
            hobbies: data.hobbies.length > 0 ? data.hobbies : get().hobbies,
            milestones: data.milestones.length > 0 ? data.milestones : get().milestones,
            sessions: data.sessions.length > 0 ? data.sessions : get().sessions,
          })
        }
      },

      createAccount: (name, initialHobbyName, initialCategory, initialMilestone) => {
        const trimmedName = name.trim() || 'Crafter'
        const accountId = 'usr-' + Math.random().toString(36).substr(2, 7)
        const colors = ['#CC8F3F', '#6E8B6B', '#5B6B77', '#B26E53', '#4F7959', '#655A75']
        const randomColor = colors[Math.floor(Math.random() * colors.length)]

        const newAccount: UserAccount = {
          id: accountId,
          name: trimmedName,
          avatarColor: randomColor,
          createdAt: new Date().toISOString().split('T')[0],
        }

        let newHobbies: Hobby[] = []
        let newMilestones: Milestone[] = []

        if (initialHobbyName && initialHobbyName.trim()) {
          const hobbyId = 'h-' + Math.random().toString(36).substr(2, 6)
          const newHobby: Hobby = {
            id: hobbyId,
            name: initialHobbyName.trim(),
            category: initialCategory?.trim() || 'Creative Craft',
            color: randomColor,
            bg: `${randomColor}18`,
            hours: 0,
            sessions: 0,
            progress: 0,
          }
          newHobbies = [newHobby]

          if (initialMilestone && initialMilestone.trim()) {
            const milestoneId = 'm-' + Math.random().toString(36).substr(2, 6)
            newMilestones = [
              {
                id: milestoneId,
                hobbyId: hobbyId,
                title: initialMilestone.trim(),
                due: '30 days',
                checkpoints: [
                  { id: 'cp-1', title: 'Prepare tools and setup workspace', done: false },
                  { id: 'cp-2', title: 'Complete first 30-minute practice session', done: false },
                ],
              },
            ]
          }
        }

        // Sign in anonymously and save to Firestore
        ensureFirebaseAuth().then((uid) => {
          if (!uid) return
          set({ firebaseUid: uid })
          saveUserToFirestore(uid, newAccount)
          if (newHobbies[0]) {
            syncHobbyToFirestore(uid, newHobbies[0])
          }
          if (newMilestones[0]) {
            syncMilestoneToFirestore(uid, newMilestones[0])
          }
        })

        set((state) => ({
          currentUser: newAccount,
          accounts: [...state.accounts.filter((a) => a.id !== newAccount.id), newAccount],
          hobbies: newHobbies,
          milestones: newMilestones,
          sessions: [],
          streakCount: 1,
          lastActiveDate: new Date().toISOString().split('T')[0],
          isOnboarded: true,
          screen: 'home',
          activeNav: 'hobbies',
        }))
      },

      switchAccount: (accountId) => {
        const target = get().accounts.find((a) => a.id === accountId)
        if (target) {
          set({ currentUser: target, isOnboarded: true, screen: 'home', activeNav: 'hobbies' })
          get().syncWithFirestore()
        }
      },

      resetToNewUser: () => {
        set({
          currentUser: null,
          hobbies: [],
          milestones: [],
          sessions: [],
          streakCount: 0,
          lastActiveDate: null,
          isOnboarded: false,
          screen: 'home',
          activeNav: 'hobbies',
        })
      },

      setNav: (nav) => set({ activeNav: nav }),
      setScreen: (screen) => set({ screen }),
      setSelectedHobby: (id) => set({ selectedHobbyId: id }),

      addHobby: (hobby) => {
        const uid = get().firebaseUid || getFirebaseUid()
        if (uid) {
          syncHobbyToFirestore(uid, hobby)
        }
        set((state) => ({
          hobbies: [...state.hobbies, hobby],
        }))
      },

      deleteHobby: (hobbyId) => set((state) => ({
        hobbies: state.hobbies.filter((h) => h.id !== hobbyId),
        milestones: state.milestones.filter((m) => m.hobbyId !== hobbyId),
        sessions: state.sessions.filter((s) => s.hobbyId !== hobbyId),
      })),

      addMilestone: (milestone) => {
        const uid = get().firebaseUid || getFirebaseUid()
        const newMilestone: Milestone = {
          ...milestone,
          id: 'm-' + Math.random().toString(36).substr(2, 7),
        }
        if (uid) {
          syncMilestoneToFirestore(uid, newMilestone)
        }
        set((state) => ({
          milestones: [...state.milestones, newMilestone],
        }))
      },

      deleteMilestone: (milestoneId) => set((state) => ({
        milestones: state.milestones.filter((m) => m.id !== milestoneId),
      })),

      toggleCheckpoint: (milestoneId, checkpointId) => {
        set((state) => {
          const newMilestones = state.milestones.map((m) => {
            if (m.id !== milestoneId) return m
            return {
              ...m,
              checkpoints: m.checkpoints.map((cp) =>
                cp.id === checkpointId ? { ...cp, done: !cp.done } : cp
              ),
            }
          })

          const milestone = state.milestones.find((m) => m.id === milestoneId)
          if (!milestone) return { milestones: newMilestones }

          const hobbyId = milestone.hobbyId
          const newHobbies = state.hobbies.map((h) => {
            if (h.id !== hobbyId) return h

            const hobbyMilestones = newMilestones.filter((m) => m.hobbyId === hobbyId)
            const totalCheckpoints = hobbyMilestones.reduce((acc, m) => acc + m.checkpoints.length, 0)
            const doneCheckpoints = hobbyMilestones.reduce(
              (acc, m) => acc + m.checkpoints.filter((cp) => cp.done).length,
              0
            )

            return {
              ...h,
              progress: totalCheckpoints === 0 ? 0 : doneCheckpoints / totalCheckpoints,
            }
          })

          const uid = get().firebaseUid || getFirebaseUid()
          if (uid) {
            const updatedMilestone = newMilestones.find((m) => m.id === milestoneId)
            const updatedHobby = newHobbies.find((h) => h.id === hobbyId)
            if (updatedMilestone) syncMilestoneToFirestore(uid, updatedMilestone)
            if (updatedHobby) syncHobbyToFirestore(uid, updatedHobby)
          }

          return { milestones: newMilestones, hobbies: newHobbies }
        })
      },

      saveSession: (sessionData) => {
        const today = new Date().toISOString().split('T')[0]
        const { hobbyId, duration } = sessionData

        set((state) => {
          const newSession: PracticeSession = {
            ...sessionData,
            id: Math.random().toString(36).substr(2, 9),
            date: today,
          }

          const newSessions = [...state.sessions, newSession]

          const newHobbies = state.hobbies.map((h) => {
            if (h.id !== hobbyId) return h
            return {
              ...h,
              hours: h.hours + duration / 60,
              sessions: h.sessions + 1,
            }
          })

          const uid = get().firebaseUid || getFirebaseUid()
          if (uid) {
            syncSessionToFirestore(uid, newSession)
            const updatedHobby = newHobbies.find((h) => h.id === hobbyId)
            if (updatedHobby) syncHobbyToFirestore(uid, updatedHobby)
          }

          return {
            sessions: newSessions,
            hobbies: newHobbies,
            lastActiveDate: today,
          }
        })

        get().updateStreak()
      },

      updateStreak: () => {
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]
        const lastActive = get().lastActiveDate

        if (!lastActive) {
          set({ streakCount: 1, lastActiveDate: todayStr })
          return
        }

        if (lastActive === todayStr) return

        const lastDate = new Date(lastActive)
        const diffTime = Math.abs(today.getTime() - lastDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 1) {
          set((state) => ({ streakCount: state.streakCount + 1, lastActiveDate: todayStr }))
        } else if (diffDays > 1) {
          set({ streakCount: 1, lastActiveDate: todayStr })
        }
      },
    }),
    {
      name: 'craftpath-storage-v4',
    }
  )
)
