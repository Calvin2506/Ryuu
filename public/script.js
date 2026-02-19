    const BACKEND_URL = 'https://chatbot-autoscale.vercel.app/api/chat'; // Vercel serverless function

    let isOpen    = false;
    let isBusy    = false;
    let history   = [];   // [{role:'user'|'assistant', content:'...'}]

    const launcher    = document.getElementById('cb-launcher');
    const win         = document.getElementById('cb-window');
    const msgBox      = document.getElementById('cb-messages');
    const inputEl     = document.getElementById('cb-input');
    const sendBtn     = document.getElementById('cb-send');
    const badge       = document.getElementById('cb-badge');
    const suggestions = document.getElementById('cb-suggestions');
    const charCount   = document.getElementById('cb-char-count');

    function toggleChat(open) {
      isOpen = open ?? !isOpen;
      launcher.classList.toggle('active', isOpen);
      win.classList.toggle('open', isOpen);
      if (isOpen) {
        badge.style.display = 'none';
        setTimeout(() => inputEl.focus(), 350);
        if (history.length === 0) addBotMessage(
          "Hello! 👋 I'm Ryuu, a fast and free — ask me anything!"
        );
      }
    }

    launcher.addEventListener('click', () => toggleChat());
    document.getElementById('cb-close').addEventListener('click', () => toggleChat(false));

    // Clear chat
    document.getElementById('cb-clear').addEventListener('click', () => {
      history = [];
      msgBox.innerHTML = '<div class="cb-date-sep">Today</div>';
      suggestions.style.display = 'flex';
      addBotMessage("Chat cleared! How can I help you?");
    });

    inputEl.addEventListener('input', () => {
      // Auto-grow
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
      // Char count
      const len = inputEl.value.length;
      charCount.textContent = len > 100 ? `${len}/2000` : '';
    });

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    sendBtn.addEventListener('click', sendMessage);

    // Suggestion chips
    suggestions.querySelectorAll('.cb-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        inputEl.value = chip.textContent.replace(/^[^\w]+/, '').trim();
        suggestions.style.display = 'none';
        sendMessage();
      });
    });

    function getTime() {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function scrollToBottom() {
      msgBox.scrollTop = msgBox.scrollHeight;
    }

    function escapeHTML(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function createRow(sender) {
      const row = document.createElement('div');
      row.className = `cb-row ${sender}`;
      return row;
    }

    function addBotMessage(text) {
      const row = createRow('bot');
      row.innerHTML = `
        <div class="cb-mini-avatar">✦</div>
        <div style="align-items:flex-start">
          <div class="cb-bubble">${escapeHTML(text)}</div>
          <div class="cb-meta">${getTime()}</div>
        </div>`;
      msgBox.appendChild(row);
      scrollToBottom();
    }

    function addUserMessage(text) {
      const row = createRow('user');
      row.innerHTML = `
        <div style="align-items:flex-end">
          <div class="cb-bubble">${escapeHTML(text)}</div>
          <div class="cb-meta">${getTime()}</div>
        </div>
        <div class="cb-mini-avatar">👤</div>`;
      msgBox.appendChild(row);
      scrollToBottom();
    }

    function addErrorMessage(text) {
      const row = createRow('error');
      row.innerHTML = `
        <div class="cb-mini-avatar">⚠️</div>
        <div style="align-items:flex-start">
          <div class="cb-bubble">${escapeHTML(text)}</div>
          <div class="cb-meta">${getTime()}</div>
        </div>`;
      msgBox.appendChild(row);
      scrollToBottom();
    }

    function showTyping() {
      const row = document.createElement('div');
      row.className = 'cb-typing-row';
      row.id = 'cb-typing';
      row.innerHTML = `
        <div class="cb-mini-avatar">✦</div>
        <div class="cb-typing-bubble">
          <span></span><span></span><span></span>
        </div>`;
      msgBox.appendChild(row);
      scrollToBottom();
    }

    function hideTyping() {
      const el = document.getElementById('cb-typing');
      if (el) el.remove();
    }

    function setLoading(loading) {
      isBusy = loading;
      sendBtn.disabled = loading;
      inputEl.disabled = loading;
    }

    async function sendMessage() {
      const text = inputEl.value.trim();
      if (!text || isBusy) return;

      // Hide chips after first message
      suggestions.style.display = 'none';

      // Clear input
      inputEl.value = '';
      inputEl.style.height = 'auto';
      charCount.textContent = '';

      // Show user message
      addUserMessage(text);
      setLoading(true);
      showTyping();

      try {
        const res = await fetch(BACKEND_URL, {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({ message: text, history })
        });

        hideTyping();

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server error ${res.status}`);
        }

        const data = await res.json();
        addBotMessage(data.reply);

        // Update conversation history
        history.push({ role: 'user',      content: text });
        history.push({ role: 'assistant', content: data.reply });

      } catch (err) {
        hideTyping();

        // Demo fallback when no backend is running
        const demos = [
          "I'm Ryuu, connect me and I'll respond intelligently.",
          "I'd love to help! to answer anything you ask."
        ];
        addBotMessage(demos[Math.floor(Math.random() * demos.length)]);
        console.warn('Backend not reachable — showing demo reply. Error:', err.message);
      }

      setLoading(false);
      inputEl.focus();
    }