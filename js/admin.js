(function () {
  "use strict";

  const DEFAULT_EXAMPLES = {
    ouverture: [
      { id: gen(), label: "Allumer les lumières et les enseignes", type: "checkbox", order: 0 },
      { id: gen(), label: "Vérifier le fond de caisse", type: "checkbox", order: 1 },
      { id: gen(), label: "Relever la température des frigos", type: "text", order: 2 },
      { id: gen(), label: "Ouvrir les volets / rideaux", type: "checkbox", order: 3 }
    ],
    fin_service: [
      { id: gen(), label: "Annoncer la dernière commande", type: "checkbox", order: 0 },
      { id: gen(), label: "Arrêter la musique / ambiance", type: "checkbox", order: 1 },
      { id: gen(), label: "Nombre de couverts servis", type: "text", order: 2 },
      { id: gen(), label: "Remarques particulières", type: "text", order: 3 }
    ],
    fermeture: [
      { id: gen(), label: "Fermer et vérifier la caisse du bar", type: "checkbox", order: 0 },
      { id: gen(), label: "Ranger et nettoyer le comptoir", type: "checkbox", order: 1 },
      { id: gen(), label: "Vérifier les stocks de boissons", type: "checkbox", order: 2 },
      { id: gen(), label: "Sortir les poubelles", type: "checkbox", order: 3 },
      { id: gen(), label: "Remarques sur la soirée", type: "text", order: 4 }
    ]
  };

  function gen() {
    return "q_" + Math.random().toString(36).slice(2, 10);
  }

  const state = {
    currentTab: "ouverture",
    items: { ouverture: [], fin_service: [], fermeture: [] },
    settingsEmail: ""
  };

  // ---- Références DOM ------------------------------------------------------
  const loginCard = document.getElementById("login-card");
  const adminPanel = document.getElementById("admin-panel");
  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  const loginBtn = document.getElementById("login-btn");
  const loginNote = document.getElementById("login-note");
  const logoutBtn = document.getElementById("logout-btn");
  const adminUser = document.getElementById("admin-user");

  const switcherButtons = document.querySelectorAll("#admin-panel .switcher__option");
  const editorTitle = document.getElementById("editor-title");
  const editorList = document.getElementById("editor-list");
  const addItemBtn = document.getElementById("add-item-btn");
  const seedBtn = document.getElementById("seed-btn");
  const saveItemsBtn = document.getElementById("save-items-btn");
  const editorNote = document.getElementById("editor-note");

  const settingsEmailInput = document.getElementById("settings-email");
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const settingsNote = document.getElementById("settings-note");

  const historyList = document.getElementById("history-list");
  const refreshHistoryBtn = document.getElementById("refresh-history-btn");

  const TAB_LABELS = {
    ouverture: "Ouverture",
    fin_service: "Fin de service",
    fermeture: "Fermeture du bar"
  };

  // ---- Authentification -------------------------------------------------------
  if (!auth) {
    loginNote.textContent = "Firebase Auth n'est pas chargé. Vérifiez firebase-config.js.";
    loginNote.classList.add("is-error");
  } else {
    auth.onAuthStateChanged((user) => {
      if (user) {
        loginCard.hidden = true;
        adminPanel.hidden = false;
        adminUser.textContent = "Connecté en tant que " + user.email;
        loadConfig();
        loadHistory();
      } else {
        loginCard.hidden = false;
        adminPanel.hidden = true;
      }
    });

    loginBtn.addEventListener("click", () => {
      loginNote.textContent = "";
      loginNote.className = "form-note";
      const email = loginEmail.value.trim();
      const password = loginPassword.value;
      if (!email || !password) {
        loginNote.textContent = "Merci de renseigner l'e-mail et le mot de passe.";
        loginNote.classList.add("is-error");
        return;
      }
      loginBtn.disabled = true;
      auth
        .signInWithEmailAndPassword(email, password)
        .catch((err) => {
          loginNote.textContent = translateAuthError(err.code);
          loginNote.classList.add("is-error");
        })
        .finally(() => {
          loginBtn.disabled = false;
        });
    });

    logoutBtn.addEventListener("click", () => auth.signOut());
  }

  function translateAuthError(code) {
    switch (code) {
      case "auth/invalid-email":
        return "Adresse e-mail invalide.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "E-mail ou mot de passe incorrect.";
      case "auth/too-many-requests":
        return "Trop de tentatives. Réessayez plus tard.";
      default:
        return "Connexion impossible (" + code + ").";
    }
  }

  // ---- Chargement de la configuration ---------------------------------------
  function loadConfig() {
    Promise.all([
      db.collection("config").doc("ouverture").get(),
      db.collection("config").doc("fin_service").get(),
      db.collection("config").doc("fermeture").get(),
      db.collection("config").doc("settings").get()
    ])
      .then(([ouvertureSnap, finServiceSnap, fermetureSnap, settingsSnap]) => {
        state.items.ouverture = (ouvertureSnap.exists && ouvertureSnap.data().items) || [];
        state.items.fin_service = (finServiceSnap.exists && finServiceSnap.data().items) || [];
        state.items.fermeture = (fermetureSnap.exists && fermetureSnap.data().items) || [];
        state.settingsEmail = (settingsSnap.exists && settingsSnap.data().emailTo) || "";
        settingsEmailInput.value = state.settingsEmail;
        renderEditor();
      })
      .catch((err) => {
        console.error(err);
        editorNote.textContent = "Impossible de charger la configuration.";
        editorNote.classList.add("is-error");
      });
  }

  // ---- Onglets ------------------------------------------------------------------
  switcherButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.currentTab = btn.dataset.tab;
      switcherButtons.forEach((b) => {
        const isActive = b.dataset.tab === state.currentTab;
        b.classList.toggle("is-active", isActive);
        b.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      editorNote.textContent = "";
      editorNote.className = "form-note";
      renderEditor();
    });
  });

  // ---- Rendu de l'éditeur de questions -------------------------------------------
  function renderEditor() {
    const tab = state.currentTab;
    editorTitle.textContent = "Questions — " + TAB_LABELS[tab];
    const items = state.items[tab].slice().sort((a, b) => a.order - b.order);

    if (items.length === 0) {
      editorList.innerHTML = '<p class="editor-empty">Aucune question pour le moment.</p>';
      return;
    }

    editorList.innerHTML = "";
    items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "editor-row";
      row.dataset.id = item.id;

      const labelInput = document.createElement("input");
      labelInput.type = "text";
      labelInput.value = item.label;
      labelInput.placeholder = "Intitulé de la question";
      labelInput.addEventListener("input", () => {
        updateItem(item.id, { label: labelInput.value });
      });

      const typeSelect = document.createElement("select");
      typeSelect.innerHTML =
        '<option value="checkbox">Case à cocher</option><option value="text">Champ texte</option>';
      typeSelect.value = item.type;
      typeSelect.addEventListener("change", () => {
        updateItem(item.id, { type: typeSelect.value });
      });

      const moves = document.createElement("div");
      moves.className = "editor-row__moves";
      const upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.textContent = "▲";
      upBtn.title = "Monter";
      upBtn.disabled = index === 0;
      upBtn.addEventListener("click", () => moveItem(item.id, -1));
      const downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.textContent = "▼";
      downBtn.title = "Descendre";
      downBtn.disabled = index === items.length - 1;
      downBtn.addEventListener("click", () => moveItem(item.id, 1));
      moves.appendChild(upBtn);
      moves.appendChild(downBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "editor-row__delete";
      deleteBtn.textContent = "✕";
      deleteBtn.title = "Supprimer";
      deleteBtn.addEventListener("click", () => removeItem(item.id));

      row.appendChild(labelInput);
      row.appendChild(typeSelect);
      row.appendChild(moves);
      row.appendChild(deleteBtn);
      editorList.appendChild(row);
    });
  }

  function updateItem(id, patch) {
    const tab = state.currentTab;
    const item = state.items[tab].find((i) => i.id === id);
    if (item) Object.assign(item, patch);
  }

  function removeItem(id) {
    const tab = state.currentTab;
    state.items[tab] = state.items[tab].filter((i) => i.id !== id);
    reindex(tab);
    renderEditor();
  }

  function moveItem(id, direction) {
    const tab = state.currentTab;
    const items = state.items[tab].slice().sort((a, b) => a.order - b.order);
    const index = items.findIndex((i) => i.id === id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const tmp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = tmp;
    items.forEach((item, i) => (item.order = i));
    state.items[tab] = items;
    renderEditor();
  }

  function reindex(tab) {
    state.items[tab]
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((item, i) => (item.order = i));
  }

  addItemBtn.addEventListener("click", () => {
    const tab = state.currentTab;
    state.items[tab].push({
      id: gen(),
      label: "",
      type: "checkbox",
      order: state.items[tab].length
    });
    renderEditor();
  });

  seedBtn.addEventListener("click", () => {
    const tab = state.currentTab;
    if (state.items[tab].length > 0) {
      const confirmed = window.confirm(
        "Cela remplacera les questions actuelles de l'onglet « " +
          TAB_LABELS[tab] +
          " » par des exemples. Continuer ?"
      );
      if (!confirmed) return;
    }
    state.items[tab] = DEFAULT_EXAMPLES[tab].map((item) => Object.assign({}, item, { id: gen() }));
    renderEditor();
  });

  saveItemsBtn.addEventListener("click", () => {
    const tab = state.currentTab;
    reindex(tab);
    editorNote.textContent = "Enregistrement…";
    editorNote.className = "form-note";
    db.collection("config")
      .doc(tab)
      .set({ items: state.items[tab] })
      .then(() => {
        editorNote.textContent = "Modifications enregistrées.";
        editorNote.classList.add("is-success");
      })
      .catch((err) => {
        console.error(err);
        editorNote.textContent = "Erreur lors de l'enregistrement.";
        editorNote.classList.add("is-error");
      });
  });

  // ---- Historique des envois -------------------------------------------------
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function loadHistory() {
    historyList.innerHTML = '<p class="editor-empty">Chargement…</p>';
    db.collection("submissions")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get()
      .then((snap) => {
        if (snap.empty) {
          historyList.innerHTML =
            '<p class="editor-empty">Aucun envoi enregistré pour le moment.</p>';
          return;
        }
        historyList.innerHTML = "";
        snap.forEach((doc) => {
          const d = doc.data();
          const date = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : null;
          const dateStr = date
            ? date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
            : "date inconnue";
          const statusBadge =
            d.emailStatus === "sent"
              ? '<span class="badge badge--sent">E-mail envoyé</span>'
              : d.emailStatus === "failed"
              ? '<span class="badge badge--failed">Échec e-mail</span>'
              : '<span class="badge badge--pending">En cours</span>';

          const item = document.createElement("div");
          item.className = "history-item";

          const metaBits = [];
          if (d.device) metaBits.push("Appareil : " + escapeHtml(d.device));

          item.innerHTML =
            '<div class="history-item__header">' +
            '<span class="history-item__name">' +
            escapeHtml(d.employeeName || "Non renseigné") +
            "</span>" +
            '<span class="badge badge--tab">' +
            escapeHtml(TAB_LABELS[d.tab] || d.tab || "") +
            "</span>" +
            statusBadge +
            "<span>" +
            dateStr +
            "</span>" +
            "</div>" +
            (metaBits.length
              ? '<p class="history-item__meta">' + metaBits.join(" · ") + "</p>"
              : "") +
            '<pre class="history-item__content">' +
            escapeHtml(d.content || "") +
            "</pre>";
          historyList.appendChild(item);
        });
      })
      .catch((err) => {
        console.error(err);
        historyList.innerHTML = '<p class="editor-empty">Impossible de charger l\'historique.</p>';
      });
  }

  refreshHistoryBtn.addEventListener("click", loadHistory);

  // ---- Paramètres (adresse e-mail) -----------------------------------------
  saveSettingsBtn.addEventListener("click", () => {
    const email = settingsEmailInput.value.trim();
    settingsNote.textContent = "";
    settingsNote.className = "form-note";
    if (!email) {
      settingsNote.textContent = "Merci de renseigner une adresse e-mail.";
      settingsNote.classList.add("is-error");
      return;
    }
    settingsNote.textContent = "Enregistrement…";
    db.collection("config")
      .doc("settings")
      .set({ emailTo: email }, { merge: true })
      .then(() => {
        state.settingsEmail = email;
        settingsNote.textContent = "Adresse enregistrée.";
        settingsNote.classList.add("is-success");
      })
      .catch((err) => {
        console.error(err);
        settingsNote.textContent = "Erreur lors de l'enregistrement.";
        settingsNote.classList.add("is-error");
      });
  });
})();
