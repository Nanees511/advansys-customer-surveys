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
    if (
      obj &&
      obj[key] !== undefined &&
      obj[key] !== null &&
      obj[key] !== ""
    ) {
      if (
        typeof obj[key] === "object" &&
        obj[key].Value !== undefined
      ) {
        return obj[key].Value;
      }

      return obj[key];
    }
  }

  return fallback;
}

function surveyVal(keys, fallback = "") {
  return getValue(surveyData || {}, keys, fallback);
}

function getQuestionId(q) {
  return getValue(
    q,
    ["Question_ID", "Title", "questionId", "id"],
    ""
  );
}

function getQuestionText(q) {
  return getValue(
    q,
    ["Question_Text", "field_7", "questionText", "label"],
    ""
  );
}

function getQuestionType(q) {
  return getValue(
    q,
    ["Question_Type", "field_8", "type"],
    "Text"
  );
}

function getQuestionRole(q) {
  return getValue(
    q,
    ["Question_Role", "field_9", "role"],
    ""
  );
}

function normalizeType(q) {
  return String(getQuestionType(q))
    .trim()
    .toLowerCase();
}

function isRequired(q) {
  const val = getValue(
    q,
    ["Required", "Is_Required", "required"],
    "Yes"
  );

  return String(val).toLowerCase() !== "no";
}

function setStatus(message, isError = true) {

  const card = el("statusCard");

  if (!card) return;

  card.textContent = message;

  card.classList.remove("hidden");

  card.style.color = isError
    ? "#b42318"
    : "#0f8f5f";

  card.style.background = isError
    ? "#fff7f6"
    : "#f1fff8";

  card.style.borderColor = isError
    ? "#ffd6d2"
    : "#b8efd6";
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
      POWER_AUTOMATE_GET_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
      }
    );

    surveyData = await res.json();

    console.log("Survey Data:", surveyData);

    // COMPLETED SURVEY
    if (!surveyData.success && (surveyData.completed || surveyData.locked)) {

      el("surveyForm").style.display = "none";
      el("metaCard").style.display = "none";

      clearStatus();

      const thankYou = el("thankYou");

      thankYou.classList.remove("hidden");

      thankYou.innerHTML = `
        <div class="success-icon">✓</div>
        <h2>Thank You</h2>
        <p>
          This survey has already been completed and submitted successfully.
        </p>
      `;

      return;
    }

    // INVALID TOKEN
    if (!res.ok || !surveyData.success) {
      throw new Error("Invalid survey");
    }

    applyHeader();
    renderSurvey();
    setupConditionalQuestions();
    updateProgress();

  } catch (err) {

    console.error(err);

    setStatus(
      "Unable to load survey. The link may be invalid or expired."
    );
  }
}

function applyHeader() {

  const formName = surveyVal(
    ["formName", "Form_Name", "field_11"],
    "Customer Satisfaction Survey"
  );

  const clientName = surveyVal(
    ["clientName", "Client_Name", "field_3"],
    "—"
  );

  const projectName = surveyVal(
    ["projectName", "Project_Name", "field_6"],
    "—"
  );

  const engineerName = surveyVal(
    ["engineerName", "Engineer_Name", "field_7"],
    ""
  );

  el("surveyTitle").textContent = formName;

  el("surveySubtitle").textContent =
    "Your feedback helps us improve our services.";

  el("clientName").textContent =
    clientName || "—";

  el("projectName").textContent =
    projectName || "—";

  const engineerMeta = el("engineerMeta");

  if (engineerName && engineerMeta) {

    engineerMeta.style.display = "block";

    el("engineerName").textContent =
      engineerName;

  } else if (engineerMeta) {

    engineerMeta.style.display = "none";
  }

  if (el("token")) {
    el("token").value = token;
  }

  if (el("surveyType")) {

    el("surveyType").value =
      surveyVal(
        ["surveyType", "Survey_Scope", "field_10"],
        ""
      );
  }
}

function makeFieldName(q) {
  return getQuestionId(q);
}

function isRenderableQuestion(q) {

  const type = normalizeType(q);

  const role = String(
    getQuestionRole(q)
  )
    .trim()
    .toLowerCase();

  return !(
    role === "prefill" ||
    type === "prefill / metadata"
  );
}

function makeRadio(q, value, text) {

  const label = document.createElement("label");

  label.className = "option";

  const input = document.createElement("input");

  input.type = "radio";

  input.name = makeFieldName(q);

  input.value = value;

  if (isRequired(q)) {
    input.required = true;
  }

  input.addEventListener("change", () => {
    handleConditionalQuestions();
    updateProgress();
  });

  const span = document.createElement("span");

  span.textContent = text;

  label.appendChild(input);

  label.appendChild(span);

  return label;
}

function renderQuestion(q) {

  const type = normalizeType(q);

  const label = getQuestionText(q);

  if (!isRenderableQuestion(q)) {
    return null;
  }

  const card = document.createElement("section");

  const wide =
    type === "nps" ||
    type === "text" ||
    label.length > 150;

  card.className =
    `question-card ${wide ? "wide" : ""}`;

  card.dataset.questionText =
    label.toLowerCase();

  card.dataset.questionType = type;

  const title = document.createElement("h3");

  title.className = "question-title";

  title.innerHTML =
    `${label}${isRequired(q)
      ? ' <span class="required">*</span>'
      : ""
    }`;

  card.appendChild(title);

  // NPS
  if (type === "nps") {

    const scale = document.createElement("div");

    scale.className = "scale nps";

    for (let i = 0; i <= 10; i++) {
      scale.appendChild(
        makeRadio(q, i, String(i))
      );
    }

    card.appendChild(scale);

    const labels =
      document.createElement("div");

    labels.className = "scale-labels";

    labels.innerHTML =
      "<span>Not at all likely</span><span>Extremely likely</span>";

    card.appendChild(labels);

  // NUMERIC
  } else if (type === "numeric") {

    const scale =
      document.createElement("div");

    scale.className = "scale rating4";

    for (let i = 1; i <= 4; i++) {
      scale.appendChild(
        makeRadio(q, i, String(i))
      );
    }

    card.appendChild(scale);

  // YES/NO
  } else if (
    type === "yes/no" ||
    type === "yesno"
  ) {

    const scale =
      document.createElement("div");

    scale.className = "scale yesno";

    scale.appendChild(
      makeRadio(q, "Yes", "Yes")
    );

    scale.appendChild(
      makeRadio(q, "No", "No")
    );

    card.appendChild(scale);

  // TEXT
  } else {

    const textarea =
      document.createElement("textarea");

    textarea.name =
      makeFieldName(q);

    textarea.placeholder =
      "Type your answer here…";

    if (isRequired(q)) {
      textarea.required = true;
    }

    textarea.addEventListener(
      "input",
      updateProgress
    );

    card.appendChild(textarea);
  }

  return card;
}

function renderNumericGrid(group) {

  const card =
    document.createElement("section");

  card.className =
    "question-card wide rating-grid-card";

  const title =
    document.createElement("h3");

  title.className = "question-title";

  title.textContent =
    "Please rate the following";

  card.appendChild(title);

  const table =
    document.createElement("table");

  table.className = "rating-grid";

  const thead =
    document.createElement("thead");

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

  const tbody =
    document.createElement("tbody");

  group.forEach((q) => {

    const row =
      document.createElement("tr");

    const questionCell =
      document.createElement("td");

    questionCell.className =
      "rating-grid-question";

    questionCell.innerHTML =
      `${getQuestionText(q)}${isRequired(q)
        ? ' <span class="required">*</span>'
        : ""
      }`;

    row.appendChild(questionCell);

    for (let i = 1; i <= 4; i++) {

      const cell =
        document.createElement("td");

      cell.className =
        "rating-grid-choice";

      cell.appendChild(
        makeRadio(q, i, String(i))
      );

      row.appendChild(cell);
    }

    tbody.appendChild(row);
  });

  table.appendChild(tbody);

  card.appendChild(table);

  return card;
}

function renderSurvey() {

  const grid = el("questionGrid");

  grid.innerHTML = "";

  const questions =
    (surveyData.questions || [])
      .filter(isRenderableQuestion);

  let numericGroup = [];

  function flushNumericGroup() {

    if (!numericGroup.length) return;

    if (numericGroup.length >= 2) {

      grid.appendChild(
        renderNumericGrid(numericGroup)
      );

    } else {

      const rendered =
        renderQuestion(numericGroup[0]);

      if (rendered) {
        grid.appendChild(rendered);
      }
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

    const rendered =
      renderQuestion(q);

    if (rendered) {
      grid.appendChild(rendered);
    }
  });

  flushNumericGroup();

  renderProgressDots();
}

function renderProgressDots() {

  const dots = el("progressDots");

  if (!dots) return;

  dots.innerHTML = "";

  for (let i = 0; i < 4; i++) {

    const dot =
      document.createElement("span");

    dots.appendChild(dot);
  }
}

function getVisibleRequiredQuestions() {

  return [
    ...document.querySelectorAll(".question-card")
  ].filter(card => {

    if (card.classList.contains("hidden")) {
      return false;
    }

    const inputs =
      [...card.querySelectorAll("input, textarea")];

    return inputs.some(
      input => input.required
    );
  });
}

function isCardAnswered(card) {

  const radios =
    [...card.querySelectorAll("input[type='radio']")];

  const textareas =
    [...card.querySelectorAll("textarea")];

  if (radios.length) {

    const names =
      [...new Set(radios.map(r => r.name))];

    return names.every(name =>
      !!document.querySelector(
        `input[name="${name}"]:checked`
      )
    );
  }

  if (textareas.length) {

    return textareas.every(t =>
      !t.required || !!t.value.trim()
    );
  }

  return true;
}

function updateProgress() {

  const requiredCards =
    getVisibleRequiredQuestions();

  const answeredCards =
    requiredCards.filter(isCardAnswered);

  const label =
    el("progressLabel");

  const dots =
    el("progressDots");

  if (label) {

    label.textContent =
      `${answeredCards.length} of ${requiredCards.length} required questions completed`;
  }

  if (dots) {

    const pct =
      requiredCards.length
        ? answeredCards.length /
          requiredCards.length
        : 1;

    const activeDots =
      Math.ceil(pct * 4);

    [...dots.children]
      .forEach((dot, i) => {

        dot.className =
          i < activeDots
            ? "active"
            : "";
      });
  }
}

function setupConditionalQuestions() {
  handleConditionalQuestions();
}

function handleConditionalQuestions() {

  const cards =
    [...document.querySelectorAll(".question-card")];

  const incidentYesNoCard =
    cards.find(card => {

      const text =
        card.dataset.questionText || "";

      const type =
        card.dataset.questionType || "";

      return (
        text.includes("incident") &&
        (
          type === "yes/no" ||
          type === "yesno"
        )
      );
    });

  const incidentTextCard =
    cards.find(card => {

      const text =
        card.dataset.questionText || "";

      const type =
        card.dataset.questionType || "";

      return (
        text.includes("incident") &&
        type === "text"
      );
    });

  if (
    !incidentYesNoCard ||
    !incidentTextCard
  ) {
    updateProgress();
    return;
  }

  const checked =
    incidentYesNoCard.querySelector(
      "input[type='radio']:checked"
    );

  const showText =
    checked &&
    checked.value === "Yes";

  const textarea =
    incidentTextCard.querySelector(
      "textarea"
    );

  if (showText) {

    incidentTextCard.classList.remove("hidden");

    if (textarea) {
      textarea.required = true;
    }

  } else {

    incidentTextCard.classList.add("hidden");

    if (textarea) {

      textarea.required = false;

      textarea.value = "";
    }
  }

  updateProgress();
}

function collectResponses() {

  const responses = [];

  const questions =
    (surveyData.questions || [])
      .filter(isRenderableQuestion);

  questions.forEach((q) => {

    const type =
      normalizeType(q);

    let value = "";

    if (type === "text") {

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
      questionId:
        makeFieldName(q),

      question:
        getQuestionText(q),

      type:
        getQuestionType(q),

      value
    });
  });

    const npsAnswer = responses.find(
    r => String(r.type).toLowerCase() === "nps"
  );

  const npsScore = npsAnswer
    ? Number(npsAnswer.value)
    : null;
  const npsScore = npsAnswer
  ? Number(npsAnswer.value)
  : null;

const numericResponses = responses
  .filter(r =>
    String(r.type).toLowerCase() === "numeric" &&
    r.value !== ""
  )
  .map(r => Number(r.value));

const lowestScore =
  numericResponses.length
    ? Math.min(...numericResponses)
    : null;

const requiresQA =
  lowestScore !== null &&
  lowestScore <= 2;

  return {
    token,
    surveyId:
      surveyVal(
        ["surveyId", "Survey_ID", "field_1"],
        ""
      ),

    surveyConfigKey:
      surveyVal(
        ["surveyConfigKey", "Survey_Config_Key"],
        ""
      ),

    batchId:
      surveyVal(
        ["batchId", "Batch_ID", "field_2"],
        ""
      ),

    clientName:
      surveyVal(
        ["clientName", "Client_Name", "field_3"],
        ""
      ),

    clientEmail:
      surveyVal(
        ["clientEmail", "Client_Email", "field_4"],
        ""
      ),

    projectId:
      surveyVal(
        ["projectId", "Project_ID", "field_5"],
        ""
      ),

    projectName:
      surveyVal(
        ["projectName", "Project_Name", "field_6"],
        ""
      ),

    engineerName:
      surveyVal(
        ["engineerName", "Engineer_Name", "field_7"],
        ""
      ),

    engineerEmail:
      surveyVal(
        ["engineerEmail", "Engineer_Email", "field_8"],
        ""
      ),

    department:
      surveyVal(
        ["department", "Department", "field_9"],
        ""
      ),

    surveyType:
      surveyVal(
        ["surveyType", "Survey_Scope", "field_10"],
        ""
      ),

    formName:
      surveyVal(
        ["formName", "Form_Name", "field_11"],
        ""
      ),

    reviewQuarter:
      surveyVal(
        ["reviewQuarter", "Review_Quarter"],
        ""
      ),

    reviewYear:
      surveyVal(
        ["reviewYear", "Review_Year"],
        ""
      ),
     npsScore,
     lowestScore,
    requiresQA,
    responses
  };
}

async function submitSurvey(event) {

  event.preventDefault();

  clearStatus();

  handleConditionalQuestions();

  const form =
    el("surveyForm");

  if (
    form &&
    !form.reportValidity()
  ) {
    return;
  }

  const payload =
    collectResponses();

  try {

    const res =
      await fetch(
        POWER_AUTOMATE_POST_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body:
            JSON.stringify(payload)
        }
      );

    if (!res.ok) {
      throw new Error("Submit failed");
    }

    el("surveyForm").style.display =
      "none";

    el("thankYou")
      .classList.remove("hidden");

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
