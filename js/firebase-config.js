/* ==========================================================================
   CONFIGURATION — à remplir une seule fois
   Voir le README.md pour savoir où trouver chacune de ces valeurs.
   ========================================================================== */

// 1) Configuration de votre projet Firebase
// (Firebase console > Paramètres du projet > Vos applications > Config SDK)
const firebaseConfig = {
  apiKey: "REMPLACER_API_KEY",
  authDomain: "REMPLACER.firebaseapp.com",
  projectId: "REMPLACER",
  storageBucket: "REMPLACER.appspot.com",
  messagingSenderId: "REMPLACER",
  appId: "REMPLACER"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
// firebase.auth() n'existe que sur admin.html (le script auth-compat n'est
// chargé que sur cette page) : on protège l'appel pour ne pas casser index.html.
const auth = typeof firebase.auth === "function" ? firebase.auth() : null;

// 2) Identifiants EmailJS
// (emailjs.com > Email Services / Email Templates / Account > API Keys)
const EMAILJS_PUBLIC_KEY = "REMPLACER_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = "REMPLACER_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "REMPLACER_TEMPLATE_ID";

// emailjs n'est chargé que sur index.html
if (typeof emailjs !== "undefined") {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}
