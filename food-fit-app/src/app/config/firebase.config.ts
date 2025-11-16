import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { environment } from '../../environments/environment';

// Inicializar Firebase
const app = initializeApp(environment.firebaseConfig);

// Inicializar Firebase Auth y obtener una referencia al servicio
export const auth = getAuth(app);
export default app;