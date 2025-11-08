// Configuração do Firebase
// Substitua com suas credenciais do Firebase Console

const firebaseConfig = {
    apiKey: "AIzaSyC...",
    authDomain: "qualisheldon.firebaseapp.com",
    projectId: "qualisheldon",
    storageBucket: "qualisheldon.appspot.com",
    messagingSenderId: "901385034024",
    appId: "1:901385034024:web:cb32c785421126f6c3181d"
  };
  
// Inicializar Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exportar para uso global
window.db = db;

console.log('✅ Firebase inicializado com sucesso!');




