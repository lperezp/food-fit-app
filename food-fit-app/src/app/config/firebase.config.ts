import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Tu configuración de Firebase
// Reemplaza estos valores con los de tu proyecto Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBEv4xmxTp0uNTp-K3QvQUxEAjQza2PXGg",
    authDomain: "food-fit-2024.firebaseapp.com",
    projectId: "food-fit-2024",
    storageBucket: "food-fit-2024.firebasestorage.app",
    messagingSenderId: "492381764039",
    appId: "1:492381764039:web:f59812888c06df761401e2"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firebase Auth y obtener una referencia al servicio
export const auth = getAuth(app);
export default app;