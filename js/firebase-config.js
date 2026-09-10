/* ==========================================================================
   CONFIGURATION — à remplir une seule fois
   Voir le README.md pour savoir où trouver chacune de ces valeurs.
   ========================================================================== */

// 1) Configuration de votre projet Firebase
// (Firebase console > Paramètres du projet > Vos applications > Config SDK)
const firebaseConfig = {
  apiKey: "AIzaSyCxXnGr1r4MpZ0oxrEPu-YVHYHkZs7dyZg",
  authDomain: "le-voyage-heure-20ad4.firebaseapp.com",
  projectId: "le-voyage-heure-20ad4",
  storageBucket: "le-voyage-heure-20ad4.firebasestorage.app",
  messagingSenderId: "142336244896",
  appId: "1:142336244896:web:a21c69620a897948059dc5"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
// firebase.auth() n'existe que sur admin.html (le script auth-compat n'est
// chargé que sur cette page) : on protège l'appel pour ne pas casser index.html.
const auth = typeof firebase.auth === "function" ? firebase.auth() : null;

// 2) Identifiants EmailJS
// (emailjs.com > Email Services / Email Templates / Account > API Keys)
const EMAILJS_PUBLIC_KEY = "vwmtIxSLYhn-6lLV-";
const EMAILJS_SERVICE_ID = "service_vrrteix";
const EMAILJS_TEMPLATE_ID = "template_cdedn2k";

// emailjs n'est chargé que sur index.html
if (typeof emailjs !== "undefined") {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}
