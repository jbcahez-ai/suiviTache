# Le Voyage Heure — Check-list d'équipe

Site interne pour vos employés : une page avec trois check-lists
(**Ouverture**, **Fin de service**, **Fermeture du bar**), à cocher ou à
compléter, envoyées par e-mail en un clic. Une page cachée protégée par mot
de passe permet de configurer les questions et l'adresse e-mail de
réception.

## Arborescence

```
le-voyage-heure/
├── index.html          → page des employés (Ouverture / Fermeture)
├── admin.html           → page cachée de configuration
├── css/
│   └── style.css        → tous les styles du site
├── js/
│   ├── firebase-config.js  → VOS clés Firebase + EmailJS (à remplir)
│   ├── main.js              → logique de la page employés
│   └── admin.js             → logique de la page admin
├── assets/
│   └── logo.png          → votre logo
└── README.md             → ce guide
```

Le site est 100 % statique (HTML/CSS/JS), il peut être hébergé gratuitement sur
GitHub Pages. Il s'appuie sur deux services gratuits :

- **Firebase** (Google) : stocke les questions et l'adresse e-mail, et protège
  la page admin par un vrai compte (pas un mot de passe écrit dans le code).
- **EmailJS** : envoie l'e-mail directement depuis le navigateur, sans serveur.

Aucun des deux n'est facturé pour ce volume d'utilisation (quelques envois par
jour).

---

## Étape 1 — Créer le projet Firebase

1. Allez sur [console.firebase.google.com](https://console.firebase.google.com)
   et cliquez sur **Ajouter un projet**. Donnez-lui un nom (ex. `le-voyage-heure`).
2. Une fois le projet créé, dans le menu de gauche, allez dans
   **Compilation > Firestore Database**, cliquez sur **Créer une base de
   données**, choisissez une région proche de vous, et démarrez **en mode
   production**.
3. Onglet **Règles** de Firestore : remplacez le contenu par ceci, puis
   **Publier** :

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /config/{document} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

   → Tout le monde peut *lire* la configuration (nécessaire pour que la page
   employés affiche les questions), mais seule une personne *connectée*
   (vous, via la page admin) peut la *modifier*.

4. Dans le menu de gauche, allez dans **Compilation > Authentication**,
   cliquez sur **Commencer**, puis activez le fournisseur **E-mail/Mot de
   passe**.
5. Toujours dans Authentication, onglet **Users**, cliquez sur **Ajouter un
   utilisateur** : c'est ici que vous créez *votre* identifiant admin (l'email
   et le mot de passe qui protégeront `admin.html`). Vous pouvez en créer
   plusieurs si besoin.
6. Retournez dans **Paramètres du projet** (icône ⚙️ en haut à gauche) >
   onglet **Général**, descendez jusqu'à **Vos applications**, cliquez sur
   l'icône **</>** (Web) pour ajouter une application web, donnez-lui un nom,
   puis copiez l'objet `firebaseConfig` qui s'affiche.
7. Collez ces valeurs dans `js/firebase-config.js`, à la place de
   `REMPLACER_API_KEY`, etc.

## Étape 2 — Créer le compte EmailJS

1. Allez sur [emailjs.com](https://www.emailjs.com) et créez un compte gratuit.
2. **Email Services** > **Add New Email Service** : connectez votre Gmail,
   Outlook, ou autre adresse d'envoi. Notez le **Service ID** généré.
3. **Email Templates** > **Create New Template**. C'est ce modèle qui définit
   le contenu de l'e-mail reçu. Exemple :

   - **To Email** (dans les réglages du template, pas dans le corps) :
     `{{to_email}}`
   - **Subject** : `Check-list {{list_type}} — {{date}}`
   - **Content** (le champ `{{content}}` liste automatiquement TOUTES les
     questions de la check-list remplie, avec leur réponse — case cochée,
     non cochée, ou texte saisi — sans que vous ayez à modifier ce template
     quand vous ajoutez/supprimez des questions dans l'admin) :
     ```
     Check-list : {{list_type}}
     Rempli par : {{employee_name}}
     Date : {{date}}

     <pre style="font-family: inherit; white-space: pre-wrap;">{{content}}</pre>
     ```
     La balise `<pre>` est nécessaire : sans elle, les emails HTML
     ignorent les retours à la ligne et tout le contenu s'afficherait sur une
     seule ligne.
   Notez le **Template ID**.
4. **Account > API Keys** : copiez la **Public Key**.
5. Collez ces trois valeurs (`EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`,
   `EMAILJS_PUBLIC_KEY`) dans `js/firebase-config.js`.

## Étape 3 — Configurer les check-lists

1. Ouvrez `admin.html` (en local, ou une fois déployé — voir étape 4).
2. Connectez-vous avec l'e-mail/mot de passe créé à l'étape 1.5.
3. Pour chacun des trois onglets (Ouverture / Fin de service / Fermeture du
   bar) : cliquez sur **Charger des exemples** pour démarrer avec des
   questions types, puis modifiez-les,
   ajoutez-en, supprimez-en, changez leur type (case à cocher ou champ texte),
   réordonnez-les avec les flèches. Cliquez sur **Enregistrer les
   modifications**.
4. Dans **Paramètres**, indiquez l'adresse e-mail qui doit recevoir les
   check-lists remplies, puis **Enregistrer l'adresse**.

Toutes ces modifications sont immédiatement visibles par vos employés sur
`index.html`, sans aucune action technique de votre part par la suite.

## Étape 4 — Déployer sur GitHub Pages

1. Créez un nouveau dépôt GitHub et poussez-y tout le contenu de ce dossier.
2. Dans le dépôt : **Settings > Pages**. Sous **Source**, choisissez la
   branche `main` et le dossier `/ (root)`, puis **Save**.
3. Après une à deux minutes, votre site est accessible à l'adresse
   `https://votre-nom-utilisateur.github.io/nom-du-depot/`.

## Points de sécurité à connaître

- Avec l'offre gratuite de GitHub Pages, le **dépôt est public** : n'importe
  qui peut consulter le code source, y compris le contenu de
  `firebase-config.js`.
- Ce n'est pas un problème en soi : les clés qui s'y trouvent sont des clés
  **publiques**, conçues pour être utilisées depuis un navigateur. La vraie
  protection vient des **règles Firestore** (étape 1.3) et du **compte
  Firebase Authentication** (étape 1.4-1.5) : sans identifiant/mot de passe
  valide, impossible de modifier la configuration.
- Personne ne peut lire les questions ou l'adresse e-mail configurées
  autrement qu'en passant par le site — les données elles-mêmes ne sont pas
  dans le code, elles sont dans Firestore.
- Si vous préférez un dépôt privé (donc un code totalement invisible), il
  vous faudra un autre hébergeur que l'offre gratuite de GitHub Pages
  (Netlify, Vercel, ou GitHub Pages avec un compte GitHub payant).

## Limites actuelles (évolutions possibles)

- Il n'y a pas d'historique des check-lists envoyées dans le site : la seule
  trace est l'e-mail reçu. Un historique consultable en ligne (via Firestore)
  pourrait être ajouté plus tard si besoin.
- EmailJS gratuit est limité à 200 e-mails/mois, largement suffisant pour un
  usage quotidien (~90/mois pour les trois check-lists remplies chaque
  jour), mais à surveiller si vous avez plusieurs établissements.
- Un seul type de champ texte est disponible (texte libre) ; pas de nombres,
  listes déroulantes, etc. pour rester simple.
