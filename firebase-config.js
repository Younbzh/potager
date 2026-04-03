// ===== Firebase Configuration =====
//
// ÉTAPES DE CONFIGURATION :
// 1. Allez sur https://console.firebase.google.com
// 2. "Créer un projet" → nom : "mon-potager" → Continuer
// 3. Dans le menu gauche : "Firestore Database" → "Créer une base de données"
//    → Sélectionnez "Mode test" → Choisissez une région proche (europe-west1)
// 4. Dans "Paramètres du projet" (engrenage) → "Vos applications" → icône Web </>
//    → Enregistrez l'app → Copiez la config firebaseConfig ci-dessous
// 5. Dans Firestore → "Règles", remplacez par :
//
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{database}/documents {
//        match /gardens/{gardenId}/{document=**} {
//          allow read, write: if true;
//        }
//      }
//    }
//
//    → Publiez les règles
//
// 6. Remplissez les valeurs ci-dessous et sauvegardez.

const FIREBASE_CONFIG = {
  apiKey:            "VOTRE_API_KEY",
  authDomain:        "VOTRE_PROJECT.firebaseapp.com",
  projectId:         "VOTRE_PROJECT_ID",
  storageBucket:     "VOTRE_PROJECT.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId:             "VOTRE_APP_ID"
};

// ── Init ────────────────────────────────────────────────────────────────────
firebase.initializeApp(FIREBASE_CONFIG);
const firestore = firebase.firestore();

// Persistance hors-ligne : les données sont mises en cache localement
// L'app reste fonctionnelle sans réseau.
firestore.enablePersistence({ synchronizeTabs: true }).catch(err => {
  if (err.code === 'failed-precondition') {
    // Plusieurs onglets ouverts — persistance désactivée pour cet onglet
    console.info('Firestore: multi-tab, offline persistence disabled for this tab');
  } else if (err.code === 'unimplemented') {
    console.info('Firestore: offline persistence not supported in this browser');
  }
});
