const messagesEl = document.getElementById("messages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// Auto-resize textarea as user types
userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = userInput.scrollHeight + "px";
});

// Send on Enter (Shift+Enter for new line)
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

// Quick topic buttons
document.querySelectorAll(".topic-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const msg = btn.getAttribute("data-msg");
    userInput.value = msg;
    sendMessage();
  });
});

function appendMessage(role, text) {
  const msg = document.createElement("div");
  msg.classList.add("message", role);

  const avatar = document.createElement("div");
  avatar.classList.add("avatar");
  avatar.textContent = role === "bot" ? "U" : "Me";

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.textContent = text;

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  return msg;
}

function showTyping() {
  const msg = document.createElement("div");
  msg.classList.add("message", "bot", "typing");
  msg.id = "typing-indicator";

  const avatar = document.createElement("div");
  avatar.classList.add("avatar");
  avatar.textContent = "U";

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTyping() {
  const indicator = document.getElementById("typing-indicator");
  if (indicator) indicator.remove();
}

function getCalendarContext() {
  try {
    const events = JSON.parse(localStorage.getItem("unibot_events") || "{}");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = [];

    Object.entries(events).forEach(([dateKey, evs]) => {
      const date = new Date(dateKey);
      const daysUntil = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
      if (daysUntil >= 0) {
        evs.forEach(ev => {
          upcoming.push(`- ${ev.title} (${ev.type}) on ${date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} — in ${daysUntil} day(s)`);
        });
      }
    });

    if (upcoming.length === 0) return "";
    return `\n\nThe student's upcoming calendar events are:\n${upcoming.join("\n")}`;
  } catch {
    return "";
  }
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  userInput.value = "";
  userInput.style.height = "auto";
  sendBtn.disabled = true;

  appendMessage("user", text);
  showTyping();

  try {
    const calendarContext = getCalendarContext();
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, calendarContext }),
    });

    const data = await response.json();
    removeTyping();

    if (!response.ok) {
      appendMessage("bot", `Sorry, something went wrong: ${data.error || "Unknown error"}`);
    } else {
      appendMessage("bot", data.reply);
    }
  } catch (err) {
    removeTyping();
    appendMessage("bot", "Sorry, I couldn't connect to the server. Make sure it's running.");
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
}