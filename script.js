const POWER_AUTOMATE_URL = "PASTE_YOUR_POWER_AUTOMATE_HTTP_POST_URL_HERE";

const form = document.getElementById("surveyForm");
const thankYou = document.getElementById("thankYou");
const errorBox = document.getElementById("errorBox");
const submitBtn = document.getElementById("submitBtn");
const incidentWrap = document.getElementById("incidentDetailsWrap");
const incidentText = document.getElementById("securityIncidentDetails");

const state = {};

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name) || "";
}

function setInitialValuesFromUrl() {
  const token = getQueryParam("token");
  const company = getQueryParam("company");
  const contact = getQueryParam("name");
  const project = getQueryParam("project");
  const service = getQueryParam("service");

  document.getElementById("surveyToken").value = token;
  if (company) document.getElementById("companyName").value = company;
  if (contact) document.getElementById("contactName").value = contact;
  if (project) document.getElementById("projectName").value = project;
  if (service) document.getElementById("serviceUsed").value = service;
}

function buildScales() {
  document.querySelectorAll(".scale[data-name]").forEach(scale => {
    const name = scale.dataset.name;
    const min = Number(scale.dataset.min);
    const max = Number(scale.dataset.max);
    for (let i = min; i <= max; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "score-btn";
      btn.textContent = i;
      btn.dataset.value = i;
      btn.addEventListener("click", () => {
        state[name] = i;
        scale.querySelectorAll(".score-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
      scale.appendChild(btn);
    }
  });
}

function setupChoices() {
  document.querySelectorAll(".choice-group[data-name]").forEach(group => {
    const name = group.dataset.name;
    group.querySelectorAll(".choice").forEach(btn => {
      btn.addEventListener("click", () => {
        const value = btn.dataset.value;
        state[name] = value;
        group.querySelectorAll(".choice").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        if (name === "hasSecurityIncident") {
          const show = value === "Yes";
          incidentWrap.classList.toggle("hidden", !show);
          incidentText.required = show;
          if (!show) incidentText.value = "";
        }
      });
    });
  });
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
  errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
  document.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
}

function validateForm() {
  clearError();

  const requiredInputs = [...form.querySelectorAll("input[required], textarea[required]")];
  for (const input of requiredInputs) {
    if (!input.value.trim()) {
      input.classList.add("invalid");
      showError("Please complete all required fields before submitting.");
      return false;
    }
  }

  const requiredScales = [...document.querySelectorAll(".scale[data-required='true']")];
  for (const scale of requiredScales) {
    if (state[scale.dataset.name] === undefined) {
      showError("Please answer all required rating questions before submitting.");
      return false;
    }
  }

  const requiredChoices = [...document.querySelectorAll(".choice-group[data-required='true']")];
  for (const group of requiredChoices) {
    if (!state[group.dataset.name]) {
      showError("Please answer all required yes/no questions before submitting.");
      return false;
    }
  }

  return true;
}

function buildPayload() {
  return {
    submittedAt: new Date().toISOString(),
    surveyToken: document.getElementById("surveyToken").value,
    surveyType: document.getElementById("surveyType").value,
    contactName: document.getElementById("contactName").value.trim(),
    companyName: document.getElementById("companyName").value.trim(),
    serviceUsed: document.getElementById("serviceUsed").value.trim(),
    projectName: document.getElementById("projectName").value.trim(),
    recommendationScore: state.recommendationScore,
    infoSecurityPractices: state.infoSecurityPractices,
    hasSecurityIncident: state.hasSecurityIncident,
    securityIncidentDetails: incidentText.value.trim(),
    qualitySatisfaction: state.qualitySatisfaction,
    deliverySatisfaction: state.deliverySatisfaction,
    agilitySatisfaction: state.agilitySatisfaction,
    increaseValue: document.getElementById("increaseValue").value.trim(),
    continueDoing: document.getElementById("continueDoing").value.trim(),
    additionalComments: document.getElementById("additionalComments").value.trim()
  };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateForm()) return;

  const payload = buildPayload();
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    if (!POWER_AUTOMATE_URL || POWER_AUTOMATE_URL.includes("PASTE_YOUR")) {
      console.log("Survey payload preview:", payload);
      throw new Error("Power Automate URL is not configured yet. Payload was logged in the browser console for testing.");
    }

    const response = await fetch(POWER_AUTOMATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Submission failed. Please try again.");

    form.classList.add("hidden");
    thankYou.classList.remove("hidden");
    thankYou.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    showError(error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Feedback";
  }
});

setInitialValuesFromUrl();
buildScales();
setupChoices();
