const POWER_AUTOMATE_GET_URL =
"https://default6c281272115b4a9282c345fc975fcf.9a.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/be60b0bff73244ed961f62e7c57d3a0c/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Y3VvQyz69A_4O7t1a9YMaklVR-0beFN9ci61O-bmQBk";

const POWER_AUTOMATE_POST_URL =
"https://default6c281272115b4a9282c345fc975fcf.9a.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/47229d4087384ab5a00b7981153d6c98/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=2XkwpURx12VZ0WVXClcAN_jUf-_X_xZoiTGOTfwpRy4";

const params = new URLSearchParams(window.location.search);
const token = params.get("token") || "";
const el = (id) => document.getElementById(id);

let surveyData = null;

function getValue(obj, keys, fallback = "") {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) {
      if (typeof obj[key] === "object" && obj[key].Value !== undefined) {
        return obj[key].Value;
      }
      return obj[key];
    }
  }
  return fallback;
}

function getQuestionId(q) {
  return getValue(q, ["Question_ID", "Title", "questionId", "id"], "");
}

function getQuestionText(q) {
  return getValue(q, ["Question_Text", "field_7", "questionText", "label"], "");
}

function getQuestionType(q) {
  return getValue(q, ["Question_Type", "field_8", "type"], "Text");
}

function getQuestionRole(q) {
  return getValue(q, ["Question_Role", "field_9", "role"], "");
}

function normalizeType(q) {
  return String(getQuestionType(q)).trim().toLowerCase();
}

function isRequired(q) {
  const val = getValue(q, ["Required", "Is_Required", "required"], "Yes");
  return String(val).toLowerCase() !== "no";
}

function setStatus(message, isError = true) {
  const card = el("statusCard");
  if (!card) return;

  card.textContent = message;
  card.classList.remove("hidden");
  card.style.color = isError ? "#b42318" : "#0f8f5f";
  card.style.background = isError ? "#fff7f6" : "#f1fff8";
  card.style.borderColor = isError ? "#ffd6d2" : "#b8efd6";
}

function clearStatus() {
  const card = el("statusCard");
  if (card) card.classList.add("hidden");
}

async function loadSurvey() {
  if (!token) {
    setStatus("Missing survey token.");
    return;
  }

  try {
    const res = await fetch(POWER_AUTOMATE_GET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token })
    });

    if (!res.ok) {
      throw new Error(`Flow failed ${res.status}`);
    }

    surveyData = await res.json();
    console.log("Survey Data:", surveyData);

    if (!surveyData.success) {
      throw new Error("Invalid survey");
    }

    applyHeader();
    renderSurvey();
  } catch (err) {
    console.error(err);
    setStatus("Unable to load survey. The link may be invalid or expired.");
  }
}

function applyHeader() {
  el("surveyTitle").textContent =
    surveyData.formName || "Customer Satisfaction Survey";

  el("surveySubtitle").textContent =
    "Your feedback helps us improve our services.";

  el("clientName").textContent = surveyData.clientName || "—";
  el("projectName").textContent = surveyData.projectName || "—";

  const engineerMeta = el("engineerMeta");

  if (surveyData.engineerName && engineerMeta) {
    engineerMeta.style.display = "block";
    el("engineerName").textContent = surveyData.engineerName;
  } else if (engineerMeta) {
    engineerMeta.style.display = "none";
  }

  if (el("token")) {
    el("token").value = token;
  }
}

function makeFieldName(q) {
  return getQuestionId(q);
}

function isRenderableQuestion(q) {
  const type = normalizeType(q);
  const role = String(getQuestionRole(q)).trim().toLowerCase();

  return !(role === "prefill" || type === "prefill / metadata");
}

function renderQuestion(q) {
  const type = normalizeType(q);
  const label = getQuestionText(q);

  if (!isRenderableQuestion(q)) {
    return null;
  }

  const card = document.createElement("section");
  const wide = type === "nps" || type === "text" || label.length > 150;

  card.className = `question-card ${wide ? "wide" : ""}`;
  card.dataset.question = makeFieldName(q);

  const title = document.createElement("h3");
  title.className = "question-title";
  title.innerHTML = `${label}${isRequired(q) ? ' <span class="required">*</span>' : ""}`;
  card.appendChild(title);

  if (type === "nps") {
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

  } else if (type === "numeric") {
    const scale = document.createElement("div");
    scale.className = "scale rating4";

    for (let i = 1; i <= 4; i++) {
      scale.appendChild(makeRadio(q, i, String(i)));
    }

    card.appendChild(scale);

  } else if (type === "yes/no" || type === "yesno") {
    const scale = document.createElement("div");
    scale.className = "scale yesno";

    scale.appendChild(makeRadio(q, "Yes", "Yes"));
    scale.appendChild(makeRadio(q, "No", "No"));

    card.appendChild(scale);

  } else {
    const textarea = document.createElement("textarea");

    textarea.name = makeFieldName(q);
    textarea.placeholder = "Type your answer here…";
    textarea.dataset.label = label;

    if (isRequired(q)) {
      textarea.required = true;
    }

    card.appendChild(textarea);
  }

  return card;
}

function renderNumericGrid(group) {
  const card = document.createElement("section");
  card.className = "question-card wide rating-grid-card";

  const title = document.createElement("h3");
  title.className = "question-title";
  title.textContent = "Please rate the following";
  card.appendChild(title);

  const table = document.createElement("table");
  table.className = "rating-grid";

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Question</th>
      <th>1</th>
      <th>2</th>
      <th>3</th>
      <th>4</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  group.forEach((q) => {
    const row = document.createElement("tr");

    const questionCell = document.createElement("td");
    questionCell.className = "rating-grid-question";
    questionCell.innerHTML = `${getQuestionText(q)}${isRequired(q) ? ' <span class="required">*</span>' : ""}`;
    row.appendChild(questionCell);

    for (let i = 1; i <= 4; i++) {
      const cell = document.createElement("td");
      cell.className = "rating-grid-choice";
      cell.appendChild(makeRadio(q, i, String(i)));
      row.appendChild(cell);
    }

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  card.appendChild(table);

  return card;
}

function makeRadio(q, value, text) {
  const label = document.createElement("label");
  label.className = "option";

  const input = document.createElement("input");
  input.type = "radio";
  input.name = makeFieldName(q);
  input.value = value;
  input.dataset.label = getQuestionText(q);

  if (isRequired(q)) {
    input.required = true;
  }

  const span = document.createElement("span");
  span.textContent = text;

  label.appendChild(input);
  label.appendChild(span);

  return label;
}

function renderSurvey() {
  const grid = el("questionGrid");
  grid.innerHTML = "";

  const questions = (surveyData.questions || []).filter(isRenderableQuestion);

  let numericGroup = [];

  function flushNumericGroup() {
    if (!numericGroup.length) return;

    if (numericGroup.length >= 2) {
      grid.appendChild(renderNumericGrid(numericGroup));
    } else {
      const rendered = renderQuestion(numericGroup[0]);
      if (rendered) grid.appendChild(rendered);
    }

    numericGroup = [];
  }

  questions.forEach((q) => {
    const type = normalizeType(q);

    if (type === "numeric") {
      numericGroup.push(q);
      return;
    }

    flushNumericGroup();

    const rendered = renderQuestion(q);
    if (rendered) grid.appendChild(rendered);
  });

  flushNumericGroup();

  if (!questions.length) {
    setStatus("No active questions were found for this survey type.");
  }
}

function collectResponses() {
  const responses = [];
  const questions = (surveyData.questions || []).filter(isRenderableQuestion);

  questions.forEach((q) => {
    const type = normalizeType(q);

    let value = "";

    if (type === "text") {
      value =
        document.querySelector(`[name="${makeFieldName(q)}"]`)?.value || "";
    } else {
      value =
        document.querySelector(`input[name="${makeFieldName(q)}"]:checked`)?.value || "";
    }

    responses.push({
      questionId: makeFieldName(q),
      question: getQuestionText(q),
      type: getQuestionType(q),
      value
    });
  });

  return {
    token,
    surveyId: surveyData.surveyId,
    surveyConfigKey: surveyData.surveyConfigKey,
    batchId: surveyData.batchId,
    clientName: surveyData.clientName,
    clientEmail: surveyData.clientEmail,
    projectId: surveyData.projectId,
    projectName: surveyData.projectName,
    engineerName: surveyData.engineerName,
    engineerEmail: surveyData.engineerEmail,
    department: surveyData.department,
    surveyType: surveyData.surveyType,
    formName: surveyData.formName,
    reviewQuarter: surveyData.reviewQuarter,
    reviewYear: surveyData.reviewYear,
    responses
  };
}

async function submitSurvey(event) {
  event.preventDefault();
  clearStatus();

  const form = el("surveyForm");
  if (form && !form.reportValidity()) return;

  const payload = collectResponses();

  try {
    const res = await fetch(POWER_AUTOMATE_POST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error("Submit failed");
    }

    el("surveyForm").style.display = "none";
    el("thankYou").classList.remove("hidden");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  } catch (err) {
    console.error(err);
    setStatus("Submission failed. Please try again.");
  }
}

(async function init() {
  await loadSurvey();

  el("surveyForm")
    ?.addEventListener("submit", submitSurvey);
})();
