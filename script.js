const POWER_AUTOMATE_GET_URL =
"https://default6c281272115b4a9282c345fc975fcf.9a.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/be60b0bff73244ed961f62e7c57d3a0c/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Y3VvQyz69A_4O7t1a9YMaklVR-0beFN9ci61O-bmQBk";

const POWER_AUTOMATE_POST_URL =
"https://default6c281272115b4a9282c345fc975fcf.9a.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/47229d4087384ab5a00b7981153d6c98/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=2XkwpURx12VZ0WVXClcAN_jUf-_X_xZoiTGOTfwpRy4";

const params = new URLSearchParams(window.location.search);
const token = params.get("token") || "";

const el = (id) => document.getElementById(id);

let surveyData = null;

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
  if (card) {
    card.classList.add("hidden");
  }
}

async function loadSurvey() {

  if (!token) {
    setStatus("Missing survey token.");
    return;
  }

  try {

    const res = await fetch(
      `${POWER_AUTOMATE_GET_URL}&token=${encodeURIComponent(token)}`,
      {
        method: "POST"
      }
    );

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

    setStatus(
      "Unable to load survey. The link may be invalid or expired."
    );
  }
}

function applyHeader() {

  el("surveyTitle").textContent =
    surveyData.formName || "Customer Satisfaction Survey";

  el("surveySubtitle").textContent =
    "Your feedback helps us improve our services.";

  el("clientName").textContent =
    surveyData.clientName || "—";

  el("projectName").textContent =
    surveyData.projectName || "—";

  const engineerMeta = el("engineerMeta");

  if (surveyData.engineerName && engineerMeta) {

    engineerMeta.style.display = "block";

    el("engineerName").textContent =
      surveyData.engineerName;

  } else if (engineerMeta) {

    engineerMeta.style.display = "none";
  }

  el("token").value = token;
}

function makeFieldName(q) {
  return q.Question_ID || q.questionId;
}

function renderQuestion(q) {

  const type =
    q.Question_Type?.Value ||
    q.Question_Type ||
    "Text";

  const label =
    q.Question_Text ||
    q.questionText ||
    "";

  const role =
    q.Question_Role ||
    "";

  if (role === "Prefill") {
    return null;
  }

  const card = document.createElement("section");

  card.className = "question-card";

  card.dataset.question = makeFieldName(q);

  const title = document.createElement("h3");

  title.className = "question-title";

  title.innerHTML = label;

  card.appendChild(title);

  if (type === "NPS") {

    const scale = document.createElement("div");

    scale.className = "scale nps";

    for (let i = 0; i <= 10; i++) {
      scale.appendChild(
        makeRadio(q, i, String(i))
      );
    }

    card.appendChild(scale);

  } else if (type === "Numeric") {

    const scale = document.createElement("div");

    scale.className = "scale rating4";

    for (let i = 1; i <= 4; i++) {
      scale.appendChild(
        makeRadio(q, i, String(i))
      );
    }

    card.appendChild(scale);

  } else if (type === "Yes/No") {

    const scale = document.createElement("div");

    scale.className = "scale yesno";

    scale.appendChild(
      makeRadio(q, "Yes", "Yes")
    );

    scale.appendChild(
      makeRadio(q, "No", "No")
    );

    card.appendChild(scale);

  } else {

    const textarea = document.createElement("textarea");

    textarea.name = makeFieldName(q);

    textarea.placeholder =
      "Type your answer here...";

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

  const span = document.createElement("span");

  span.textContent = text;

  label.appendChild(input);

  label.appendChild(span);

  return label;
}

function renderSurvey() {

  const grid = el("questionGrid");

  grid.innerHTML = "";

  const questions = surveyData.questions || [];

  questions.forEach((q) => {

    const rendered = renderQuestion(q);

    if (rendered) {
      grid.appendChild(rendered);
    }
  });
}

function collectResponses() {

  const responses = [];

  const questions = surveyData.questions || [];

  questions.forEach((q) => {

    const type =
      q.Question_Type?.Value ||
      q.Question_Type ||
      "Text";

    const role =
      q.Question_Role ||
      "";

    if (role === "Prefill") return;

    let value = "";

    if (
      type === "Text"
    ) {

      value =
        document.querySelector(
          `[name="${makeFieldName(q)}"]`
        )?.value || "";

    } else {

      value =
        document.querySelector(
          `input[name="${makeFieldName(q)}"]:checked`
        )?.value || "";
    }

    responses.push({
      questionId: makeFieldName(q),
      question: q.Question_Text,
      type,
      value
    });
  });

  return {
    token,
    surveyId: surveyData.surveyId,
    surveyConfigKey: surveyData.surveyConfigKey,
    clientName: surveyData.clientName,
    projectName: surveyData.projectName,
    engineerName: surveyData.engineerName,
    responses
  };
}

async function submitSurvey(event) {

  event.preventDefault();

  clearStatus();

  const payload = collectResponses();

  try {

    const res = await fetch(
      POWER_AUTOMATE_POST_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

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

    setStatus(
      "Submission failed. Please try again."
    );
  }
}

(async function init() {

  await loadSurvey();

  el("surveyForm")
    ?.addEventListener(
      "submit",
      submitSurvey
    );

})();
