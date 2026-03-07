// ── Storage helpers ──────────────────────────────────────────────
function getEvents() {
  try { return JSON.parse(localStorage.getItem("unibot_events") || "{}"); }
  catch { return {}; }
}

function saveEvents(events) {
  localStorage.setItem("unibot_events", JSON.stringify(events));
}

// ── State ────────────────────────────────────────────────────────
let current = new Date();
let selectedDate = null;
const today = new Date();
today.setHours(0, 0, 0, 0);

// ── Render calendar ──────────────────────────────────────────────
function renderCalendar() {
  const events = getEvents();
  const year = current.getFullYear();
  const month = current.getMonth();

  document.getElementById("monthTitle").textContent =
    current.toLocaleString("default", { month: "long", year: "numeric" });

  const container = document.getElementById("calendarDays");
  container.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Adjust so week starts Monday (0=Mon ... 6=Sun)
  const startOffset = (firstDay + 6) % 7;

  // Empty cells
  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement("div");
    empty.classList.add("day-cell", "empty");
    container.appendChild(empty);
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const cellDate = new Date(year, month, d);
    const daysUntil = Math.ceil((cellDate - today) / (1000 * 60 * 60 * 24));

    const cell = document.createElement("div");
    cell.classList.add("day-cell");
    if (cellDate.getTime() === today.getTime()) cell.classList.add("today");

    const dayEvents = events[dateKey] || [];
    const hasDeadline = dayEvents.some(e => e.type === "deadline" || e.type === "exam");
    if (hasDeadline) cell.classList.add("has-deadline");
    if (hasDeadline && daysUntil >= 0 && daysUntil <= 3) cell.classList.add("warning");

    const num = document.createElement("div");
    num.classList.add("day-number");
    num.textContent = d;
    cell.appendChild(num);

    dayEvents.slice(0, 3).forEach(ev => {
      const pill = document.createElement("span");
      pill.classList.add("event-pill", ev.type);
      pill.textContent = ev.title;
      cell.appendChild(pill);
    });

    if (dayEvents.length > 3) {
      const more = document.createElement("span");
      more.classList.add("event-pill", "other");
      more.textContent = `+${dayEvents.length - 3} more`;
      cell.appendChild(more);
    }

    cell.addEventListener("click", () => openModal(dateKey, d, month, year));
    container.appendChild(cell);
  }

  renderUpcoming(events);
}

// ── Upcoming sidebar panel ───────────────────────────────────────
function renderUpcoming(events) {
  const list = document.getElementById("upcoming-list");
  list.innerHTML = "";

  const upcoming = [];
  Object.entries(events).forEach(([dateKey, evs]) => {
    const date = new Date(dateKey);
    const daysUntil = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    if (daysUntil >= 0 && daysUntil <= 14) {
      evs.forEach(ev => upcoming.push({ ...ev, dateKey, date, daysUntil }));
    }
  });

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

  if (upcoming.length === 0) {
    list.innerHTML = `<p class="no-events">No events in next 14 days</p>`;
    return;
  }

  upcoming.forEach(ev => {
    const item = document.createElement("div");
    item.classList.add("upcoming-item");
    if (ev.daysUntil <= 3) item.classList.add("warning");

    const label = ev.daysUntil === 0 ? "Today" :
                  ev.daysUntil === 1 ? "Tomorrow" :
                  `In ${ev.daysUntil} days`;

    item.innerHTML = `
      <div class="evt-title">${ev.title}</div>
      <div class="evt-date ${ev.daysUntil <= 3 ? "urgent" : ""}">${label} · ${ev.date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
    `;
    list.appendChild(item);
  });
}

// ── Modal ────────────────────────────────────────────────────────
function openModal(dateKey, day, month, year) {
  selectedDate = dateKey;
  const events = getEvents();
  const dayEvents = events[dateKey] || [];

  const monthName = new Date(year, month).toLocaleString("default", { month: "long" });
  document.getElementById("modal-date-title").textContent = `${day} ${monthName} ${year}`;

  renderModalEvents(dayEvents, dateKey);
  document.getElementById("eventTitle").value = "";
  document.getElementById("modal").classList.remove("hidden");
  document.getElementById("eventTitle").focus();
}

function renderModalEvents(dayEvents, dateKey) {
  const list = document.getElementById("modal-events-list");
  list.innerHTML = "";
  dayEvents.forEach((ev, i) => {
    const item = document.createElement("div");
    item.classList.add("modal-event-item");
    item.innerHTML = `
      <span class="event-pill ${ev.type}" style="margin:0">${ev.title}</span>
      <button onclick="deleteEvent('${dateKey}', ${i})">✕</button>
    `;
    list.appendChild(item);
  });
}

function deleteEvent(dateKey, index) {
  const events = getEvents();
  events[dateKey].splice(index, 1);
  if (events[dateKey].length === 0) delete events[dateKey];
  saveEvents(events);
  renderModalEvents(events[dateKey] || [], dateKey);
  renderCalendar();
}

document.getElementById("addEventBtn").addEventListener("click", () => {
  const title = document.getElementById("eventTitle").value.trim();
  const type = document.getElementById("eventType").value;
  if (!title) return;

  const events = getEvents();
  if (!events[selectedDate]) events[selectedDate] = [];
  events[selectedDate].push({ title, type });
  saveEvents(events);

  document.getElementById("eventTitle").value = "";
  renderModalEvents(events[selectedDate], selectedDate);
  renderCalendar();
});

document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("modal").classList.add("hidden");
});

document.getElementById("eventTitle").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("addEventBtn").click();
});

// Close modal on backdrop click
document.getElementById("modal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("modal")) {
    document.getElementById("modal").classList.add("hidden");
  }
});

// ── Month navigation ─────────────────────────────────────────────
document.getElementById("prevMonth").addEventListener("click", () => {
  current.setMonth(current.getMonth() - 1);
  renderCalendar();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  current.setMonth(current.getMonth() + 1);
  renderCalendar();
});

// ── Init ─────────────────────────────────────────────────────────
renderCalendar();