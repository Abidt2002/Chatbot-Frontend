// script.js — Production-ready Embedding-based Chat Widget
const chatBtn = document.getElementById("chatbot-btn");
const widget = document.getElementById("chatbot-widget");
const closeBtn = document.getElementById("close-chat");
const sendBtn = document.getElementById("send-btn");
const chatBody = document.getElementById("chat-body");
const input = document.getElementById("chat-input");
const suggests = document.querySelectorAll(".suggest");

// LOGO URL (optional)
const LOGO_URL = "/mnt/data/0a3d0d7c-23dd-4aa1-8f6c-975dda3c03fe.png";

- name: Inject frontend token
  run: sed -i "s/__FRONTEND_GH_TOKEN__/${{ secrets.CHATBOT_FRONTEND_TOKEN }}/g" path/to/script.js


// Open / Close widget
chatBtn.onclick = () => widget.classList.remove("hidden");
closeBtn.onclick = () => widget.classList.add("hidden");

// Typing animation
function typeMessage(text) {
  const box = document.createElement("div");
  box.className = "bot-msg";
  chatBody.appendChild(box);
  let idx = 0;
  const interval = setInterval(() => {
    if (idx < text.length) {
      box.textContent += text[idx++];
      chatBody.scrollTop = chatBody.scrollHeight;
    } else {
      clearInterval(interval);
    }
  }, 20);
}

// Escape HTML
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// Sleep helper
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Ask backend via GitHub Actions
async function ask(question) {
  // Show user message
  chatBody.innerHTML += `<div class="user-msg">${escapeHtml(question)}</div>`;
  chatBody.scrollTop = chatBody.scrollHeight;

  // Trigger workflow dispatch
  try {
    const dispatchRes = await fetch(
      "https://api.github.com/repos/Abidt2002/Chatbot-Backend/actions/workflows/chatbot.yml/dispatches",
      {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "Authorization": `Bearer ${FRONTEND_GH_TOKEN}`,
        },
        body: JSON.stringify({ ref: "main", inputs: { question } }),
      }
    );

    if (!dispatchRes.ok) throw new Error("Workflow dispatch failed");

  } catch (e) {
    console.error("Dispatch error:", e);
    typeMessage("⚠️ Failed to trigger backend. Please try again later.");
    return;
  }

  typeMessage("Thinking...");

  // Poll workflow runs until we get the correct output
  const maxPolls = 15;
  const pollDelayMs = 5000;
  let answer = null;

  for (let i = 0; i < maxPolls; i++) {
    await sleep(pollDelayMs);

    try {
      const runsRes = await fetch(
        "https://api.github.com/repos/Abidt2002/Chatbot-Backend/actions/runs",
        { headers: { "Accept": "application/vnd.github.v3+json" } }
      );
      const runsJson = await runsRes.json();
      // Pick the latest run created within last 2 minutes
      const latestRun = runsJson.workflow_runs?.find(
        run => new Date() - new Date(run.created_at) < 2 * 60 * 1000
      );
      if (!latestRun) continue;

      // Fetch unique output file
      const rawUrl = `https://raw.githubusercontent.com/Abidt2002/Chatbot-Backend/main/chatbot_output_${latestRun.id}.txt?timestamp=${Date.now()}`;
      const rawRes = await fetch(rawUrl);

      if (rawRes.ok) {
        const text = await rawRes.text();
        if (text && text.trim().length > 0) {
          answer = text.trim();
          break;
        }
      }
    } catch (err) {
      console.warn("Poll error:", err);
    }
  }

  if (answer) {
    chatBody.innerHTML += `<div class="bot-msg">${escapeHtml(answer)}</div>`;
    chatBody.scrollTop = chatBody.scrollHeight;
  } else {
    chatBody.innerHTML += `<div class="bot-msg">⚠️ No response yet. Please try again shortly.</div>`;
    chatBody.scrollTop = chatBody.scrollHeight;
  }
}

// Send message
sendBtn.onclick = () => {
  const q = input.value.trim();
  if (q) {
    ask(q);
    input.value = "";
  }
};

// Quick suggestion buttons
suggests.forEach(btn => btn.onclick = () => ask(btn.textContent));


