import { Injectable, signal } from '@angular/core';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { auth } from '../../config/firebase.config';
import app from '../../config/firebase.config';

export interface UserInfo {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = auth;
  private db = getFirestore(app);

  readonly currentUser = signal<UserInfo | null>(this.getStoredUser());

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        const userInfo: UserInfo = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL
        };
        localStorage.setItem('USER_INFO', JSON.stringify(userInfo));
        this.currentUser.set(userInfo);
      } else {
        if (!localStorage.getItem('USER_INFO')) {
          this.currentUser.set(null);
        }
      }
    });
  }

  private getStoredUser(): UserInfo | null {
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

  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(this.auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      const user = result.user;

      // Guardar el usuario en Firestore con su uid
      await this.saveUserToFirestore(user);

      const userInfo: UserInfo = {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL
      };

      localStorage.setItem('USER_INFO', JSON.stringify(userInfo));
      this.currentUser.set(userInfo);

      return { user, token, userInfo };
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
  getCurrentUser(): UserInfo | null {
    if (this.currentUser()) {
      return this.currentUser();
    }
    if (this.auth.currentUser) {
      return {
        uid: this.auth.currentUser.uid,
        displayName: this.auth.currentUser.displayName,
        email: this.auth.currentUser.email,
        photoURL: this.auth.currentUser.photoURL
      };
    }
    return this.getStoredUser();
  }

  getCurrentUserId(): string | null {
    const user = this.getCurrentUser();
    return user ? user.uid : null;
  }

  // Verificar si hay un usuario autenticado
  isAuthenticated(): boolean {
    return this.currentUser() !== null || this.getCurrentUser() !== null;
  }

  logOut() {
    localStorage.removeItem('USER_INFO');
    this.currentUser.set(null);
    return this.auth.signOut();
  }
}
