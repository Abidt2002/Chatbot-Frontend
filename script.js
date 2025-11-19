// script.js (Updated Chat Widget Version)

const chatBtn = document.getElementById("chatbot-btn");
const widget = document.getElementById("chatbot-widget");
const closeBtn = document.getElementById("close-chat");
const sendBtn = document.getElementById("send-btn");
const chatBody = document.getElementById("chat-body");
const input = document.getElementById("chat-input");
const suggests = document.querySelectorAll(".suggest");

// Open widget
chatBtn.onclick = () => widget.classList.remove("hidden");

// Close widget
closeBtn.onclick = () => widget.classList.add("hidden");

// Typing animation
function typeMessage(text) {
  let box = document.createElement("div");
  box.className = "bot-msg";
  chatBody.appendChild(box);
  let idx = 0;

  let interval = setInterval(() => {
    box.textContent += text[idx];
    idx++;
    if (idx >= text.length) clearInterval(interval);
    chatBody.scrollTop = chatBody.scrollHeight;
  }, 20);
}

// Ask backend via GitHub Actions
async function ask(question) {
  chatBody.innerHTML += `<div class="user-msg">${question}</div>`;
  chatBody.scrollTop = chatBody.scrollHeight;

  // Trigger GitHub Action workflow
  const res = await fetch(
    "https://api.github.com/repos/Abidt2002/Chatbot-Backend/actions/workflows/chatbot.yml/dispatches",
    {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": "Bearer YOUR_PUBLIC_GITHUB_TOKEN"
      },
      body: JSON.stringify({
        ref: "main",
        inputs: { question }
      })
    }
  );

  typeMessage("Thinking...");

  // Wait for GitHub Action to complete
  await new Promise(r => setTimeout(r, 5000));

  // Fetch Action logs
  const runs = await fetch(
    "https://api.github.com/repos/Abidt2002/Chatbot-Backend/actions/runs"
  ).then(r => r.json());

  const runId = runs.workflow_runs[0].id;

  const logs = await fetch(
    `https://api.github.com/repos/Abidt2002/Chatbot-Backend/actions/runs/${runId}/logs`
  ).then(r => r.text());

  const answer = logs.split("
").slice(-5).join("
");

  typeMessage(answer.replace(/[^a-zA-Z0-9.,? ]/g, ""));
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
