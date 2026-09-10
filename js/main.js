(function () {
  "use strict";

  const TAB_LABELS = {
    ouverture: "Ouverture",
    fin_service: "Fin de service",
    fermeture: "Fermeture du bar"
  };

  const TAB_TITLES = {
    ouverture: "Check-list d'ouverture",
    fin_service: "Check-list de fin de service",
    fermeture: "Check-list de fermeture du bar"
  };

  const state = {
    currentTab: "ouverture",
    items: { ouverture: [], fin_service: [], fermeture: [] },
    settings: { emailTo: "" },
    loaded: false
  };

  // ---- Références DOM -----------------------------------------------------
  const switcherButtons = document.querySelectorAll(".switcher__option");
  const checklistTitle = document.getElementById("checklist-title");
  const checklistDate = document.getElementById("checklist-date");
  const checklistItemsEl = document.getElementById("checklist-items");
  const employeeNameInput = document.getElementById("employee-name");
  const submitBtn = document.getElementById("submit-btn");
  const formNote = document.getElementById("form-note");

  const checklistCard = document.getElementById("checklist-card");
  const successCard = document.getElementById("success-card");
  const successText = document.getElementById("success-text");
  const newChecklistBtn = document.getElementById("new-checklist-btn");

  // ---- Chargement de la configuration depuis Firestore ---------------------
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
        state.settings = (settingsSnap.exists && settingsSnap.data()) || { emailTo: "" };
        state.loaded = true;
        renderChecklist();
      })
      .catch((err) => {
        console.error(err);
        checklistItemsEl.innerHTML =
          '<p class="checklist__empty">Impossible de charger la check-list. Vérifiez la connexion ou contactez l\'administrateur.</p>';
      });
  }

  // ---- Rendu de la check-list active ---------------------------------------
  function renderChecklist() {
    const tab = state.currentTab;
    checklistTitle.textContent = TAB_TITLES[tab];

    checklistDate.textContent = new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });

    const items = (state.items[tab] || []).slice().sort((a, b) => a.order - b.order);

    if (!state.loaded) {
      checklistItemsEl.innerHTML = '<p class="checklist__empty">Chargement de la check-list…</p>';
      return;
    }

    if (items.length === 0) {
      checklistItemsEl.innerHTML =
        '<p class="checklist__empty">Aucune question configurée pour cette check-list. Contactez l\'administrateur.</p>';
      return;
    }

    checklistItemsEl.innerHTML = items
      .map((item) => {
        if (item.type === "text") {
          return (
            '<label class="text-item">' +
            "<span>" + escapeHtml(item.label) + "</span>" +
            '<input type="text" data-id="' + item.id + '" data-type="text">' +
            "</label>"
          );
        }
        return (
          '<label class="check-item">' +
          '<input type="checkbox" data-id="' + item.id + '" data-type="checkbox">' +
          "<span>" + escapeHtml(item.label) + "</span>" +
          "</label>"
        );
      })
      .join("");

    // Style visuel quand une case est cochée
    checklistItemsEl.querySelectorAll('.check-item input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener("change", () => {
        cb.closest(".check-item").classList.toggle("is-checked", cb.checked);
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  // ---- Appareil (facultatif, sans permission requise) -----------------------
  function getDeviceInfo() {
    const ua = navigator.userAgent;
    let os = "Appareil inconnu";
    if (/Windows/i.test(ua)) os = "Windows";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
    else if (/Macintosh/i.test(ua)) os = "Mac";
    else if (/Linux/i.test(ua)) os = "Linux";

    let browser = "";
    if (/Edg\//i.test(ua)) browser = "Edge";
    else if (/OPR\//i.test(ua)) browser = "Opera";
    else if (/Chrome\//i.test(ua)) browser = "Chrome";
    else if (/Firefox\//i.test(ua)) browser = "Firefox";
    else if (/Safari\//i.test(ua)) browser = "Safari";

    return browser ? os + " – " + browser : os;
  }

  // ---- Changement d'onglet --------------------------------------------------
  function switchTab(tab) {
    state.currentTab = tab;
    switcherButtons.forEach((btn) => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    formNote.textContent = "";
    formNote.className = "form-note";
    renderChecklist();
  }

  switcherButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // ---- Validation et envoi ---------------------------------------------------
  function collectAnswers() {
    const tab = state.currentTab;
    const items = (state.items[tab] || []).slice().sort((a, b) => a.order - b.order);
    const answers = [];
    let missingText = false;

    items.forEach((item) => {
      const input = checklistItemsEl.querySelector('[data-id="' + item.id + '"]');
      if (!input) return;
      if (item.type === "text") {
        const value = input.value.trim();
        if (!value) missingText = true;
        answers.push({ type: "text", label: item.label, value });
      } else {
        answers.push({ type: "checkbox", label: item.label, checked: input.checked });
      }
    });

    return { answers, missingText };
  }

  function buildEmailContent(employeeName, answers) {
    const lines = answers.map((a) => {
      if (a.type === "checkbox") {
        return (a.checked ? "[x] " : "[ ] ") + a.label;
      }
      return a.label + " : " + (a.value || "(non renseigné)");
    });
    return lines.join("\n");
  }

  submitBtn.addEventListener("click", () => {
    const tab = state.currentTab;
    const employeeName = employeeNameInput.value.trim();
    const { answers, missingText } = collectAnswers();

    formNote.className = "form-note";

    if (answers.length === 0) {
      formNote.textContent = "Aucune question à envoyer.";
      formNote.classList.add("is-error");
      return;
    }

    if (!employeeName) {
      formNote.textContent = "Merci d'indiquer votre nom avant de valider.";
      formNote.classList.add("is-error");
      employeeNameInput.focus();
      return;
    }

    if (missingText) {
      formNote.textContent = "Merci de compléter tous les champs texte avant de valider.";
      formNote.classList.add("is-error");
      return;
    }

    const uncheckedCount = answers.filter((a) => a.type === "checkbox" && !a.checked).length;
    if (uncheckedCount > 0) {
      const confirmed = window.confirm(
        uncheckedCount +
          " tâche(s) ne sont pas cochées. Envoyer la check-list quand même ?"
      );
      if (!confirmed) return;
    }

    const content = buildEmailContent(employeeName, answers);
    const dateStr = new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

    const templateParams = {
      to_email: state.settings.emailTo || "",
      employee_name: employeeName,
      list_type: TAB_LABELS[tab],
      date: dateStr,
      content: content
    };

    if (!templateParams.to_email) {
      formNote.textContent =
        "Aucune adresse e-mail de réception n'est configurée. Contactez l'administrateur.";
      formNote.classList.add("is-error");
      return;
    }

    submitBtn.disabled = true;
    formNote.textContent = "Enregistrement…";

    const deviceInfo = getDeviceInfo();
    templateParams.device = deviceInfo;

    // On enregistre d'abord la check-list dans Firestore : même si l'envoi de
    // l'e-mail échoue ensuite, la saisie n'est jamais perdue et reste
    // consultable dans l'historique de la page admin.
    db.collection("submissions")
      .add({
        tab: tab,
        employeeName: employeeName,
        content: content,
        device: deviceInfo,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        emailStatus: "pending"
      })
      .then((docRef) => {
        formNote.textContent = "Envoi de l'e-mail…";
        return emailjs
          .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
          .then(() => {
            docRef.update({ emailStatus: "sent" }).catch(() => {});
            successText.textContent =
              "La check-list « " + TAB_LABELS[tab] + " » a été envoyée par e-mail.";
            checklistCard.hidden = true;
            successCard.hidden = false;
            formNote.textContent = "";
          })
          .catch((err) => {
            console.error(err);
            docRef
              .update({ emailStatus: "failed", emailError: String((err && err.text) || err) })
              .catch(() => {});
            successText.textContent =
              "La check-list a bien été enregistrée, mais l'e-mail n'a pas pu être envoyé. " +
              "Le gérant pourra la consulter dans l'historique de l'administration.";
            checklistCard.hidden = true;
            successCard.hidden = false;
            formNote.textContent = "";
          });
      })
      .catch((err) => {
        console.error(err);
        formNote.textContent = "L'enregistrement a échoué. Vérifiez la connexion et réessayez.";
        formNote.classList.add("is-error");
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });

  newChecklistBtn.addEventListener("click", () => {
    employeeNameInput.value = "";
    formNote.textContent = "";
    formNote.className = "form-note";
    successCard.hidden = true;
    checklistCard.hidden = false;
    renderChecklist();
  });

  // ---- Démarrage --------------------------------------------------------------
  renderChecklist();
  loadConfig();
})();
