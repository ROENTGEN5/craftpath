import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA2yjw5CpAq4gGCdvoz6ipzILwhDnHrP38",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "craftpath-e35f7.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "craftpath-e35f7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "craftpath-e35f7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "219373165073",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:219373165073:web:a2db8558da25b4674f6fb0",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-MWCV10XFQT",
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Firestore Helper Functions
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore'
import type { Hobby, Milestone, PracticeSession, UserAccount, TodoItem, AccountData } from './types'

/**
 * Sign in anonymously to Firebase Auth.
 * Returns the Firebase Auth UID which we use as the Firestore document path.
 * This ensures security rules (request.auth.uid == userId) are satisfied.
 */
export async function ensureFirebaseAuth(): Promise<string | null> {
  try {
    if (auth.currentUser) {
      return auth.currentUser.uid
    }
    const credential = await signInAnonymously(auth)
    return credential.user.uid
  } catch (error) {
    console.warn('Firebase anonymous auth error:', error)
    return null
  }
}

/**
 * Get the current Firebase Auth UID, or null if not signed in.
 */
export function getFirebaseUid(): string | null {
  return auth.currentUser?.uid || null
}

/**
 * Listen for auth state changes. Calls the callback with the Firebase UID
 * when auth state resolves (signed in or null).
 */
export function onFirebaseAuthReady(callback: (uid: string | null) => void) {
  return onAuthStateChanged(auth, (user: User | null) => {
    callback(user?.uid || null)
  })
}

export async function saveUserToFirestore(firebaseUid: string, user: UserAccount) {
  try {
    await setDoc(doc(db, 'users', firebaseUid), {
      ...user,
      firebaseUid,
    }, { merge: true })
  } catch (error) {
    console.warn('Firestore saveUser error:', error)
  }
}

export async function saveFullAccountToFirestore(
  firebaseUid: string,
  account: UserAccount,
  accountData: AccountData
) {
  try {
    // 1. Save to accounts subcollection
    await setDoc(
      doc(db, 'users', firebaseUid, 'accounts', account.id),
      {
        account,
        data: accountData,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )

    // 2. Also save each individual todo to the account's todos subcollection
    if (accountData.todos && accountData.todos.length > 0) {
      for (const t of accountData.todos) {
        await setDoc(
          doc(db, 'users', firebaseUid, 'accounts', account.id, 'todos', t.id),
          t,
          { merge: true }
        )
      }
    }
  } catch (error) {
    console.warn('Firestore saveFullAccount error:', error)
  }
}

export async function syncTodoToFirestore(firebaseUid: string, todo: TodoItem, accountId?: string) {
  try {
    if (accountId) {
      await setDoc(doc(db, 'users', firebaseUid, 'accounts', accountId, 'todos', todo.id), todo)
    }
    // Also save at top level for fallback
    await setDoc(doc(db, 'users', firebaseUid, 'todos', todo.id), todo)
  } catch (error) {
    console.warn('Firestore syncTodo error:', error)
  }
}

export async function deleteTodoFromFirestore(firebaseUid: string, todoId: string, accountId?: string) {
  try {
    if (accountId) {
      await deleteDoc(doc(db, 'users', firebaseUid, 'accounts', accountId, 'todos', todoId))
    }
    await deleteDoc(doc(db, 'users', firebaseUid, 'todos', todoId))
  } catch (error) {
    console.warn('Firestore deleteTodo error:', error)
  }
}

export async function deleteAccountFromFirestore(firebaseUid: string, accountId: string) {
  try {
    await deleteDoc(doc(db, 'users', firebaseUid, 'accounts', accountId))
  } catch (error) {
    console.warn('Firestore deleteAccount error:', error)
  }
}

export async function loadUserDataFromFirestore(firebaseUid: string) {
  try {
    // Check for accounts in the subcollection
    const accountsSnap = await getDocs(collection(db, 'users', firebaseUid, 'accounts'))
    const accounts: UserAccount[] = []
    const accountData: Record<string, AccountData> = {}

    if (!accountsSnap.empty) {
      for (const accountDoc of accountsSnap.docs) {
        const raw = accountDoc.data()
        if (raw.account) {
          accounts.push(raw.account as UserAccount)
          const data = raw.data as AccountData
          
          // Try loading individual todos from subcollection
          const todosSnap = await getDocs(
            collection(db, 'users', firebaseUid, 'accounts', accountDoc.id, 'todos')
          )
          const subTodos = todosSnap.docs.map((d) => d.data() as TodoItem)
          
          accountData[accountDoc.id] = {
            ...data,
            todos: subTodos.length > 0 ? subTodos : (data?.todos || []),
          }
        }
      }

      return { accounts, accountData, todos: [] }
    }

    // Fallback: check top-level todos
    const todosSnap = await getDocs(collection(db, 'users', firebaseUid, 'todos'))
    const todos = todosSnap.docs.map((d) => d.data() as TodoItem)

    return { accounts: [], accountData: {}, todos }
  } catch (error) {
    console.warn('Firestore loadUserData error:', error)
    return null
  }
}

export async function syncHobbyToFirestore(firebaseUid: string, hobby: Hobby) {
  try {
    await setDoc(doc(db, 'users', firebaseUid, 'hobbies', hobby.id), hobby)
  } catch (error) {
    console.warn('Firestore syncHobby error:', error)
  }
}

export async function syncMilestoneToFirestore(firebaseUid: string, milestone: Milestone) {
  try {
    await setDoc(doc(db, 'users', firebaseUid, 'milestones', milestone.id), milestone)
  } catch (error) {
    console.warn('Firestore syncMilestone error:', error)
  }
}

export async function syncSessionToFirestore(firebaseUid: string, session: PracticeSession) {
  try {
    await setDoc(doc(db, 'users', firebaseUid, 'sessions', session.id), session)
  } catch (error) {
    console.warn('Firestore syncSession error:', error)
  }
}

export default app


