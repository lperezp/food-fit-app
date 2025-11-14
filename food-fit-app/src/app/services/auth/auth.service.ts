import { Injectable } from '@angular/core';
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from '../../config/firebase.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = auth;

  constructor() { }

  signInWithGoogle() {
    const provider = new GoogleAuthProvider();

    return signInWithPopup(this.auth, provider)
      .then((result) => {
        // This gives you a Google Access Token. You can use it to access the Google API.
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;
        // The signed-in user info.
        const user = result.user;
        // IdP data available using getAdditionalUserInfo(result)
        return { user, token };
      }).catch((error) => {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        // The email of the user's account used.
        const email = error.customData?.email;
        // The AuthCredential type that was used.
        const credential = GoogleAuthProvider.credentialFromError(error);
        throw error;
      });
  }

  // Obtener el usuario actualmente autenticado
  getCurrentUser() {
    return this.auth.currentUser;
  }

  // Verificar si hay un usuario autenticado
  isAuthenticated(): boolean {
    return this.auth.currentUser !== null;
  }

  logOut() {
    return this.auth.signOut();
  }
}
