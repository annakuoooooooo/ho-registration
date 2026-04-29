import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyC_aDIUQQGR7Z8t3KcAnCucade8xkJEI3Q",
  authDomain: "nueva-99f84.firebaseapp.com",
  projectId: "nueva-99f84",
  storageBucket: "nueva-99f84.firebasestorage.app",
  messagingSenderId: "990191002508",
  appId: "1:990191002508:web:290b9c11b5b0c294adeca9",
  measurementId: "G-2VCK9Y0X55"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
