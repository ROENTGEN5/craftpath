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
  getDocs,
} from 'firebase/firestore'
import type { Hobby, Milestone, PracticeSession, UserAccount } from './types'

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

export async function loadUserDataFromFirestore(firebaseUid: string) {
  try {
    const [hobbiesSnap, milestonesSnap, sessionsSnap] = await Promise.all([
      getDocs(collection(db, 'users', firebaseUid, 'hobbies')),
      getDocs(collection(db, 'users', firebaseUid, 'milestones')),
      getDocs(collection(db, 'users', firebaseUid, 'sessions')),
    ])

    const hobbies = hobbiesSnap.docs.map((d) => d.data() as Hobby)
    const milestones = milestonesSnap.docs.map((d) => d.data() as Milestone)
    const sessions = sessionsSnap.docs.map((d) => d.data() as PracticeSession)

    return { hobbies, milestones, sessions }
  } catch (error) {
    console.warn('Firestore loadUserData error:', error)
    return null
  }
}

export default app
