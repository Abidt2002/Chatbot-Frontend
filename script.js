// script.js — Updated Chat Widget Version (token placeholder; DO NOT commit a real token)
const chatBtn = document.getElementById("chatbot-btn");
const widget = document.getElementById("chatbot-widget");
const closeBtn = document.getElementById("close-chat");
const sendBtn = document.getElementById("send-btn");
const chatBody = document.getElementById("chat-body");
const input = document.getElementById("chat-input");
const suggests = document.querySelectorAll(".suggest");

// LOGO URL (path you uploaded). Your deployment process should replace this local path with a public URL.
const LOGO_URL = "/mnt/data/0a3d0d7c-23dd-4aa1-8f6c-975dda3c03fe.png";

// FRONTEND TOKEN PLACEHOLDER (will be replaced during CI)
// Your GitHub secret name is: CHATBOT_FRONTEND_TOKEN
// During CI, replace "__FRONTEND_GH_TOKEN__" with ${{ secrets.CHATBOT_FRONTEND_TOKEN }}
const FRONTEND_GH_TOKEN = "__FRONTEND_GH_TOKEN__";

// Open widget
chatBtn.onclick = () => widget.classList.remove("hidden");

// Close widget
closeBtn.onclick = () => widget.classList.add("hidden");

// Typing animation (simulated)
function typeMessage(text) {
  let box = document.createElement("div");
  box.className = "bot-msg";
  chatBody.appendChild(box);
  let idx = 0;

  let interval = setInterval(() => {
    if (idx < text.length) {
      box.textContent += text[idx++];
      chatBody.scrollTop = chatBody.scrollHeight;
    } else {
      clearInterval(interval);
    }
  }, 20);
}

// Ask backend via GitHub Actions (workflow dispatch)
async function ask(question) {
  // show user message
  chatBody.innerHTML += `<div class="user-msg">${escapeHtml(question)}</div>`;
  chatBody.scrollTop = chatBody.scrollHeight;

  // Trigger GitHub Action workflow (workflow_dispatch)
  const dispatchUrl = "https://api.github.com/repos/Abidt2002/Chatbot-Backend/actions/workflows/chatbot.yml/dispatches";
  try {
    await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": `Bearer ${FRONTEND_GH_TOKEN}`
      },
      body: JSON.stringify({
        ref: "main",
        inputs: { question }
      })
    });
  } catch (e) {
    console.error("Dispatch error:", e);
    typeMessage("⚠️ Failed to trigger backend. Please try again later.");
    return;
  }

  // show temporary typing bubble
  typeMessage("Thinking...");

  // WAIT & POLL: The Action will run asynchronously — poll workflow runs for the latest run
  const runsUrl = "https://api.github.com/repos/Abidt2002/Chatbot-Backend/actions/runs";
  let answer = null;
  const maxPolls = 12;        // total wait ~ 12 * 5s = 60s
  const pollDelayMs = 5000;

  for (let i = 0; i < maxPolls; i++) {
    await sleep(pollDelayMs);

    try {
      const runsRes = await fetch(runsUrl, {
        headers: { "Accept": "application/vnd.github.v3+json" }
      });
      const runsJson = await runsRes.json();
      const latest = runsJson.workflow_runs && runsJson.workflow_runs[0];
      if (!latest) continue;

      // if the latest run is recent (within last 2 minutes) try to fetch logs
      const runAgeMs = Date.now() - new Date(latest.created_at).getTime();
      if (runAgeMs > 5 * 60 * 1000) {
        continue;
      }

      // Fetch processed output file
      const rawOutputUrl = `https://raw.githubusercontent.com/Abidt2002/Chatbot-Backend/main/chatbot_output.txt?timestamp=${Date.now()}`;
      const rawRes = await fetch(rawOutputUrl);
      if (rawRes.ok) {
        const text = await rawRes.text();
        if (text && text.trim().length > 0) {
          answer = text.trim(); 
          break;
        }
      }
    } catch (err) {
      console.warn("Poll error", err);
    }
  }

  if (answer) {
    chatBody.innerHTML += `<div class="bot-msg">${escapeHtml(answer)}</div>`;
    chatBody.scrollTop = chatBody.scrollHeight;
  } else {
    chatBody.innerHTML += `<div class="bot-msg">⚠️ No response yet. Please try again in a moment.</div>`;
    chatBody.scrollTop = chatBody.scrollHeight;
  }
}

// helper sleep
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// escape simple HTML
function escapeHtml(s){ return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

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


