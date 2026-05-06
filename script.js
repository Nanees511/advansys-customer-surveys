const POWER_AUTOMATE_GET_URL = "";   // Optional later: paste HTTP GET/POST endpoint to load token metadata
const POWER_AUTOMATE_POST_URL = "";  // Required for final wiring: paste HTTP POST endpoint for response submission

const params = new URLSearchParams(window.location.search);
const token = params.get("token") || "";
const surveySlug = params.get("survey") || params.get("type") || "mechanical-project";

const el = (id) => document.getElementById(id);
const survey = window.SURVEY_DEFINITIONS[surveySlug] || window.SURVEY_DEFINITIONS["mechanical-project"];

let metadata = {
  token,
  surveyType: surveySlug,
  clientName: params.get("client") || "Client name will load after wiring",
  projectName: params.get("project") || "Project name will load after wiring",
  engineerName: params.get("engineer") || "Engineer name will load after wiring",
  referenceId: token ? "Secure token detected" : "Missing token"
};

function setStatus(message, isError = true) {
  const card = el("statusCard");
  card.textContent = message;
  card.classList.remove("hidden");
  card.style.color = isError ? "#b42318" : "#0f8f5f";
  card.style.background = isError ? "#fff7f6" : "#f1fff8";
  card.style.borderColor = isError ? "#ffd6d2" : "#b8efd6";
}

function clearStatus() {
  el("statusCard").classList.add("hidden");
}

function normaliseText(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}

async function loadMetadata() {
  if (!token || !POWER_AUTOMATE_GET_URL) return;
  try {
    const res = await fetch(`${POWER_AUTOMATE_GET_URL}?token=${encodeURIComponent(token)}`, {
      method: "GET"
    });
    if (!res.ok) throw new Error(`Metadata load failed: ${res.status}`);
    const data = await res.json();
    metadata = { ...metadata, ...data };
    if (data.surveyType && window.SURVEY_DEFINITIONS[data.surveyType]) {
      metadata.surveyType = data.surveyType;
    }
  } catch (err) {
    console.warn(err);
    setStatus("We could not load the survey details yet. You can still preview the form, but final submission needs the Power Automate wiring.");
  }
}

function applyHeader() {
  const activeSurvey = window.SURVEY_DEFINITIONS[metadata.surveyType] || survey;
  el("surveyCategory").textContent = `${activeSurvey.category} · ${activeSurvey.quarter}`;
  el("surveyTitle").textContent = activeSurvey.title;
  el("surveySubtitle").textContent = activeSurvey.context === "engineer"
    ? "Your feedback helps us develop stronger delivery teams — takes ~3 minutes"
    : "Your feedback helps us deliver better outcomes — takes ~3 minutes";

  el("clientName").textContent = metadata.clientName || "—";
  el("projectName").textContent = metadata.projectName || "—";
  el("engineerName").textContent = metadata.engineerName || "—";
  el("referenceId").textContent = metadata.referenceId || "Secure token detected";
  el("engineerMeta").style.display = activeSurvey.context === "engineer" ? "block" : "none";
  el("token").value = metadata.token || "";
  el("surveyType").value = metadata.surveyType;
}

function makeFieldName(q) {
  return q.id;
}

function renderQuestion(q) {
  const card = document.createElement("section");
  const wide = q.type === "nps" || q.type === "text" || q.label.length > 150;
  card.className = `question-card ${wide ? "wide" : ""}`;
  card.dataset.required = q.required ? "true" : "false";
  card.dataset.question = q.id;

  const title = document.createElement("h3");
  title.className = "question-title";
  title.innerHTML = `${q.label} ${q.required ? '<span class="required">*</span>' : ""}`;
  card.appendChild(title);

  if (q.type === "nps") {
    const scale = document.createElement("div");
    scale.className = "scale nps";
    for (let i = 0; i <= 10; i++) {
      scale.appendChild(makeRadio(q, i, String(i)));
    }
    card.appendChild(scale);
    const labels = document.createElement("div");
    labels.className = "scale-labels";
    labels.innerHTML = "<span>Not at all likely</span><span>Extremely likely</span>";
    card.appendChild(labels);
  } else if (q.type === "rating4") {
    const scale = document.createElement("div");
    scale.className = "scale rating4";
    for (let i = 1; i <= 4; i++) {
      scale.appendChild(makeRadio(q, i, String(i)));
    }
    card.appendChild(scale);
  } else if (q.type === "yesno") {
    const scale = document.createElement("div");
    scale.className = "scale yesno";
    scale.appendChild(makeRadio(q, "Yes", "Yes"));
    scale.appendChild(makeRadio(q, "No", "No"));
    card.appendChild(scale);
  } else {
    const textarea = document.createElement("textarea");
    textarea.name = makeFieldName(q);
    textarea.placeholder = "Type your answer here…";
    textarea.dataset.label = q.label;
    if (q.required && !q.label.toLowerCase().includes("incident")) textarea.required = true;
    textarea.addEventListener("input", updateProgress);
    card.appendChild(textarea);
  }

  return card;
}

function makeRadio(q, value, text) {
  const label = document.createElement("label");
  label.className = "option";
  const input = document.createElement("input");
  input.type = "radio";
  input.name = makeFieldName(q);
  input.value = value;
  input.dataset.label = q.label;
  input.required = q.required;
  input.addEventListener("change", () => {
    handleConditionalFields();
    updateProgress();
  });
  const span = document.createElement("span");
  span.textContent = text;
  label.appendChild(input);
  label.appendChild(span);
  return label;
}

function renderSurvey() {
  const activeSurvey = window.SURVEY_DEFINITIONS[metadata.surveyType] || survey;
  const grid = el("questionGrid");
  grid.innerHTML = "";
  activeSurvey.questions.forEach(q => grid.appendChild(renderQuestion(q)));
  renderProgressDots();
  handleConditionalFields();
  updateProgress();
}

function renderProgressDots() {
  const dots = el("progressDots");
  dots.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const dot = document.createElement("span");
    if (i === 0) dot.className = "active";
    dots.appendChild(dot);
  }
}

function handleConditionalFields() {
  const activeSurvey = window.SURVEY_DEFINITIONS[metadata.surveyType] || survey;
  const incidentQuestion = activeSurvey.questions.find(q => q.type === "yesno" && q.label.toLowerCase().includes("incident"));
  const incidentText = activeSurvey.questions.find(q => q.type === "text" && q.label.toLowerCase().includes("incident"));
  if (!incidentQuestion || !incidentText) return;

  const answer = document.querySelector(`input[name="${incidentQuestion.id}"]:checked`)?.value;
  const textCard = document.querySelector(`[data-question="${incidentText.id}"]`);
  const textarea = document.querySelector(`textarea[name="${incidentText.id}"]`);
  if (!textCard || !textarea) return;

  if (answer === "Yes") {
    textCard.classList.remove("hidden");
    textarea.required = true;
  } else {
    textCard.classList.add("hidden");
    textarea.required = false;
    textarea.value = "";
  }
}

function updateProgress() {
  const activeSurvey = window.SURVEY_DEFINITIONS[metadata.surveyType] || survey;
  const required = activeSurvey.questions.filter(q => q.required && !document.querySelector(`[data-question="${q.id}"]`)?.classList.contains("hidden"));
  const answered = required.filter(q => {
    if (q.type === "text") return !!document.querySelector(`[name="${q.id}"]`)?.value?.trim();
    return !!document.querySelector(`input[name="${q.id}"]:checked`);
  });

  const pct = required.length ? answered.length / required.length : 1;
  const activeDots = Math.max(1, Math.ceil(pct * 4));
  [...el("progressDots").children].forEach((dot, i) => dot.className = i < activeDots ? "active" : "");
  el("progressLabel").textContent = `${answered.length} of ${required.length} required questions completed`;
}

function collectResponses() {
  const activeSurvey = window.SURVEY_DEFINITIONS[metadata.surveyType] || survey;
  const responses = {};
  const responseList = [];

  activeSurvey.questions.forEach(q => {
    let value = "";
    if (q.type === "text") {
      value = document.querySelector(`[name="${q.id}"]`)?.value?.trim() || "";
    } else {
      value = document.querySelector(`input[name="${q.id}"]:checked`)?.value || "";
    }
    responses[q.id] = value;
    responseList.push({
      questionId: q.id,
      question: q.label,
      type: q.type,
      value
    });
  });

  const npsQuestion = activeSurvey.questions.find(q => q.type === "nps");
  const nps = npsQuestion ? responses[npsQuestion.id] : null;

  return {
    token: metadata.token,
    surveyType: metadata.surveyType,
    submittedAt: new Date().toISOString(),
    metadata,
    nps,
    responses,
    responseList
  };
}

async function submitSurvey(event) {
  event.preventDefault();
  clearStatus();

  if (!token) {
    setStatus("Missing secure survey token. Please open the survey from the email link.");
    return;
  }

  handleConditionalFields();
  const form = el("surveyForm");
  if (!form.reportValidity()) return;

  const payload = collectResponses();
  el("submitBtn").disabled = true;
  el("submitBtn").textContent = "Submitting…";

  try {
    if (!POWER_AUTOMATE_POST_URL) {
      console.log("Preview payload:", payload);
      setStatus("Preview mode: the survey UI works. Add the Power Automate POST URL in script.js to save responses.", false);
      el("submitBtn").disabled = false;
      el("submitBtn").textContent = "Submit feedback →";
      return;
    }

    const res = await fetch(POWER_AUTOMATE_POST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
    form.classList.add("hidden");
    el("metaCard").classList.add("hidden");
    el("thankYou").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error(err);
    setStatus("Submission failed. Please try again or contact Advansys.");
    el("submitBtn").disabled = false;
    el("submitBtn").textContent = "Submit feedback →";
  }
}

(async function init() {
  await loadMetadata();
  applyHeader();
  renderSurvey();
  el("surveyForm").addEventListener("submit", submitSurvey);
})();
