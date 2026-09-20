import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
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
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore'
import type { Hobby, Milestone, PracticeSession, UserAccount } from './types'

export async function saveUserToFirestore(user: UserAccount) {
  try {
    await setDoc(doc(db, 'users', user.id), {
      id: user.id,
      name: user.name,
      avatarColor: user.avatarColor,
      createdAt: user.createdAt,
    }, { merge: true })
  } catch (error) {
    console.warn('Firestore saveUser error:', error)
  }
}

export async function syncHobbyToFirestore(userId: string, hobby: Hobby) {
  try {
    await setDoc(doc(db, 'users', userId, 'hobbies', hobby.id), hobby)
  } catch (error) {
    console.warn('Firestore syncHobby error:', error)
  }
}

export async function syncMilestoneToFirestore(userId: string, milestone: Milestone) {
  try {
    await setDoc(doc(db, 'users', userId, 'milestones', milestone.id), milestone)
  } catch (error) {
    console.warn('Firestore syncMilestone error:', error)
  }
}

export async function syncSessionToFirestore(userId: string, session: PracticeSession) {
  try {
    await setDoc(doc(db, 'users', userId, 'sessions', session.id), session)
  } catch (error) {
    console.warn('Firestore syncSession error:', error)
  }
}

export async function loadUserDataFromFirestore(userId: string) {
  try {
    const [hobbiesSnap, milestonesSnap, sessionsSnap] = await Promise.all([
      getDocs(collection(db, 'users', userId, 'hobbies')),
      getDocs(collection(db, 'users', userId, 'milestones')),
      getDocs(collection(db, 'users', userId, 'sessions')),
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
