/* Nhi's portfolio chat. Messages live in memory only and render as text. */
(function () {
  "use strict";
  const conversation = [];
  // GitHub Pages cannot run the chat API, so it stays on Vercel.
  const apiUrl = location.hostname === "nhidinh2.github.io" ? "https://nhi-universe.vercel.app/api/chat" : "/api/chat";
  const greeting = "welcome to my town! ask me anything about my research, projects, or experience";
  let pending = null;

  function markup() {
    return `<section class="nhi-chat" aria-label="Chat with Nhi">
      <div class="chat-log" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions"></div>
      <form class="chat-form">
        <label for="nhiChatInput">Ask about Nhi</label>
        <div class="chat-compose"><textarea id="nhiChatInput" rows="2" maxlength="1200" placeholder="What does Nhi work on?" required></textarea><button class="btn blue chat-send" type="submit">Send ↗</button></div>
        <p class="chat-status" role="status" aria-live="polite"></p>
      </form>
      <div class="chat-links"><a href="mailto:nhidinh2@illinois.edu">mail me for more details</a><button class="chat-clear" type="button">Clear chat</button></div>
    </section>`;
  }

  function mount(root) {
    const log = root.querySelector(".chat-log");
    const input = root.querySelector("#nhiChatInput");
    const form = root.querySelector(".chat-form");
    const status = root.querySelector(".chat-status");
    const send = root.querySelector(".chat-send");
    const clear = root.querySelector(".chat-clear");
    let disposed = false;
    function append(role, text) {
      const item = document.createElement("div");
      item.className = `chat-message ${role}`;
      if (role === "user") {
        const label = document.createElement("span");
        label.className = "chat-speaker";
        label.textContent = "You";
        item.append(label);
      }
      const message = document.createElement("p");
      message.textContent = text;
      item.append(message); log.append(item);
      while (log.children.length > 21) log.firstElementChild.remove();
      log.scrollTop = log.scrollHeight;
    }
    function busy(value) {
      send.disabled = value;
      clear.disabled = value;
      send.textContent = value ? "Thinking…" : "Send ↗";
      log.setAttribute("aria-busy", String(value));
    }
    append("assistant", greeting);
    conversation.forEach((m) => append(m.role, m.content));

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const question = input.value.trim();
      if (!question || pending) return;
      // Store complete pairs; the server receives at most four pairs plus this question.
      const messages = [...conversation.slice(-8).map(({ role, content }) => ({ role, content })), { role: "user", content: question }];
      append("user", question);
      const userBubble = log.lastElementChild;
      input.value = "";
      status.textContent = "Thinking…";
      busy(true);
      const controller = new AbortController();
      pending = controller;
      const timer = setTimeout(() => controller.abort(), 25000);
      try {
        const response = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }), signal: controller.signal });
        const data = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
        if (!response.ok || !data?.answer) throw new Error(data?.error || "Live chat isn’t connected here yet. Please email me for more details.");
        if (disposed) return;
        const answer = String(data.answer).slice(0, 3000);
        conversation.push({ role: "user", content: question }, { role: "assistant", content: answer });
        conversation.splice(0, Math.max(0, conversation.length - 20));
        append("assistant", answer);
        status.textContent = "";
      } catch (error) {
        if (disposed) return;
        userBubble.remove();
        if (!input.value) input.value = question;
        status.textContent = error.name === "AbortError" ? "That took too long. Please try again." : error.message;
      } finally {
        clearTimeout(timer);
        if (pending === controller) pending = null;
        if (!disposed) busy(false);
      }
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) { event.preventDefault(); form.requestSubmit(); }
    });
    clear.addEventListener("click", () => {
      conversation.length = 0;
      log.replaceChildren(); append("assistant", greeting);
      status.textContent = ""; input.value = ""; input.focus();
    });
    return () => { disposed = true; if (pending) { pending.abort(); pending = null; } };
  }
  window.NhiChat = { markup, mount };
})();
