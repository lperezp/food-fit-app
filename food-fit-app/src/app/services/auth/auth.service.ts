import { Injectable } from '@angular/core';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { auth } from '../../config/firebase.config';
import app from '../../config/firebase.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = auth;
  private db = getFirestore(app);

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        localStorage.setItem('USER_INFO', JSON.stringify({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL
        }));
      }
    });
  }

  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(this.auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      const user = result.user;

      // Guardar el usuario en Firestore con su uid
      await this.saveUserToFirestore(user);

      localStorage.setItem('USER_INFO', JSON.stringify({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL
      }));

      return { user, token };
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
      throw error;
    }
  }

  // Guardar documento del usuario en Firestore (colección 'users', docId = user.uid)
  async saveUserToFirestore(user: User): Promise<void> {
    try {
      const userDocRef = doc(this.db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        lastLogin: new Date().toISOString()
      }, { merge: true });

      console.log(`Usuario guardado exitosamente en users/${user.uid}`);
    } catch (error) {
      console.error('Error al guardar el usuario en Firestore:', error);
      throw error;
    }
  }

  // Obtener el usuario actualmente autenticado (con fallback a localStorage)
  getCurrentUser(): { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null } | null {
    if (this.auth.currentUser) {
      return this.auth.currentUser;
    }
    const stored = localStorage.getItem('USER_INFO');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }

  getCurrentUserId(): string | null {
    const user = this.getCurrentUser();
    return user ? user.uid : null;
  }

  // Verificar si hay un usuario autenticado
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  logOut() {
    localStorage.removeItem('USER_INFO');
    return this.auth.signOut();
  }
}
