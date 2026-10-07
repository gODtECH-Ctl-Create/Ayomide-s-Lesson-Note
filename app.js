const CONFIG = {
  dataUrl: "lesson-data.json",
  totalWeeks: 10
};

const state = { data: null, week: 1, subject: "all", search: "" };

const weekSelect = document.getElementById("weekSelect");
const subjectSelect = document.getElementById("subjectSelect");
const searchInput = document.getElementById("searchInput");
const reloadBtn = document.getElementById("syncBtn");
const statusEl = document.getElementById("syncStatus");
const lessonArea = document.getElementById("lessonArea");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const printBtn = document.getElementById("printBtn");
const template = document.getElementById("lessonTemplate");

for (let i = 1; i <= CONFIG.totalWeeks; i++) {
  const option = document.createElement("option");
  option.value = i;
  option.textContent = "Week " + i;
  weekSelect.appendChild(option);
}

function setStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", Boolean(isError));
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function richText(value) {
  if (Array.isArray(value)) {
    return "<ul>" + value.map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("") + "</ul>";
  }

  const text = String(value == null ? "" : value).trim();
  if (!text) return "<p>Not provided.</p>";

  const lines = text.split(/\n/).map(function (line) {
    return line.trim();
  }).filter(Boolean);

  if (lines.length > 1 && lines.every(function (line) {
    return /^[-•*]\s+/.test(line);
  })) {
    return "<ul>" + lines.map(function (line) {
      return "<li>" + escapeHtml(line.replace(/^[-•*]\s+/, "")) + "</li>";
    }).join("") + "</ul>";
  }

  return "<p>" + lines.map(escapeHtml).join("<br>") + "</p>";
}

function normalizeData(data) {
  if (!data || !Array.isArray(data.weeks)) {
    throw new Error("The built-in lesson data is not in the expected format.");
  }
  return data;
}

function populateSubjects() {
  const subjects = new Set();

  state.data.weeks.forEach(function (week) {
    (week.subjects || []).forEach(function (item) {
      subjects.add(item.subject || "");
    });
  });

  subjectSelect.innerHTML = "";

  const all = document.createElement("option");
  all.value = "all";
  all.textContent = "All subjects";
  subjectSelect.appendChild(all);

  Array.from(subjects).sort().forEach(function (subject) {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    subjectSelect.appendChild(option);
  });

  subjectSelect.value = state.subject;
}

function getWeek() {
  return state.data.weeks.find(function (week) {
    return Number(week.week) === Number(state.week);
  }) || state.data.weeks[0];
}

function render() {
  if (!state.data) return;

  const week = getWeek();
  const query = state.search.trim().toLowerCase();

  const lessons = (week.subjects || []).filter(function (item) {
    const subject = item.subject || "";
    const subjectMatches = state.subject === "all" || subject === state.subject;

    const searchable = [
      item.subject,
      item.topic,
      item.behavioralObjectives,
      item.instructionalMaterials,
      item.lessonContent,
      item.teacherLearnerActivities,
      item.evaluation,
      item.assignment
    ].map(function (value) {
      return Array.isArray(value) ? value.join(" ") : String(value == null ? "" : value);
    }).join(" ").toLowerCase();

    return subjectMatches && (!query || searchable.indexOf(query) !== -1);
  });

  lessonArea.innerHTML = "";

  if (!lessons.length) {
    lessonArea.innerHTML =
      '<div class="empty"><strong>No lesson note matched your filters.</strong><br>Try another subject, week, or search term.</div>';
    return;
  }

  lessons.forEach(function (item) {
    const node = template.content.cloneNode(true);

    node.querySelector(".lesson-subject").textContent = item.subject || "Subject";
    node.querySelector(".lesson-topic").textContent = item.topic || "Lesson Topic";
    node.querySelector(".date-badge").textContent = week.dateRange || item.dateRange || "";

    const fields = {
      objectives: item.behavioralObjectives,
      materials: item.instructionalMaterials,
      content: item.lessonContent,
      activities: item.teacherLearnerActivities,
      evaluation: item.evaluation,
      assignment: item.assignment
    };

    Object.keys(fields).forEach(function (field) {
      node.querySelector('[data-field="' + field + '"]').innerHTML = richText(fields[field]);
    });

    lessonArea.appendChild(node);
  });

  prevBtn.disabled = Number(state.week) <= 1;
  nextBtn.disabled = Number(state.week) >= CONFIG.totalWeeks;
  weekSelect.value = state.week;
  subjectSelect.value = state.subject;
}

async function loadLessonNotes() {
  setStatus("Loading built-in lesson notes…", false);

  try {
    const response = await fetch(CONFIG.dataUrl + "?v=" + Date.now(), {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Lesson data could not be loaded (" + response.status + ").");
    }

    state.data = normalizeData(await response.json());
    populateSubjects();
    render();

    const totalEntries = state.data.weeks.reduce(function (sum, week) {
      return sum + (week.subjects || []).length;
    }, 0);

    setStatus("Built into the app • " + totalEntries + " lesson entries", false);
  } catch (error) {
    setStatus(error.message || "Lesson notes could not be loaded.", true);
    lessonArea.innerHTML =
      '<div class="empty"><strong>Lesson notes could not be loaded.</strong><br>' +
      escapeHtml(error.message || "Unknown error.") + "</div>";
  }
}

weekSelect.addEventListener("change", function (event) {
  state.week = Number(event.target.value);
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

subjectSelect.addEventListener("change", function (event) {
  state.subject = event.target.value;
  render();
});

searchInput.addEventListener("input", function (event) {
  state.search = event.target.value;
  render();
});

reloadBtn.addEventListener("click", loadLessonNotes);

prevBtn.addEventListener("click", function () {
  if (state.week > 1) {
    state.week -= 1;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

nextBtn.addEventListener("click", function () {
  if (state.week < CONFIG.totalWeeks) {
    state.week += 1;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

printBtn.addEventListener("click", function () {
  window.print();
});

const params = new URLSearchParams(location.search);
if (params.get("week")) {
  state.week = Math.min(CONFIG.totalWeeks, Math.max(1, Number(params.get("week")) || 1));
}

weekSelect.value = state.week;
loadLessonNotes();
