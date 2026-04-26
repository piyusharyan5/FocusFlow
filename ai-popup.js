/* ================================================================
   ai-popup.js  —  AI Schedule Manager popup for FocusFlow
   Linked from home.html as: <script src="ai-popup.js"></script>
   ================================================================ */

(function () {

    const floatBtn = document.getElementById('aiFloatBtn');
    const overlay  = document.getElementById('aiPopupOverlay');
    const closeBtn = document.getElementById('aiPopupClose');
    const chat     = document.getElementById('aiPopupChat');
    const input    = document.getElementById('aiPopupInput');
    const sendBtn  = document.getElementById('aiPopupSend');
    const chips    = document.querySelectorAll('.ai-popup-chip');

    /* ── Open / Close ── */
    floatBtn.addEventListener('click', () => {
        overlay.classList.add('open');
        if (!chat.children.length) greet();
        setTimeout(() => input.focus(), 350);
    });

    closeBtn.addEventListener('click', () => overlay.classList.remove('open'));

    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
    });

    /* Escape key closes popup */
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') overlay.classList.remove('open');
    });

    /* ── Welcome message ── */
    function greet() {
        addMsg('ai', `Hey! 👋 I'm your <strong>AI Schedule Manager</strong>.<br>
            Tell me what you need today — I can plan your day, add focus blocks, or check conflicts.<br><br>
            Or tap one of the quick actions above! ✦`);
    }

    /* ── Add message bubble ── */
    function addMsg(who, html) {
        const wrap = document.createElement('div');
        wrap.className = `ai-msg ${who === 'user' ? 'user' : ''}`;
        wrap.innerHTML = `
            <div class="ai-msg-avatar">${who === 'user' ? '👤' : '✦'}</div>
            <div class="ai-msg-bubble">${html}</div>`;
        chat.appendChild(wrap);
        chat.scrollTop = chat.scrollHeight;
    }

    /* ── Typing indicator ── */
    function showTyping() {
        const el = document.createElement('div');
        el.className = 'ai-msg ai-typing';
        el.id = 'aiTyping';
        el.innerHTML = `
            <div class="ai-msg-avatar">✦</div>
            <div class="ai-msg-bubble">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>`;
        chat.appendChild(el);
        chat.scrollTop = chat.scrollHeight;
    }

    function hideTyping() {
        const el = document.getElementById('aiTyping');
        if (el) el.remove();
    }

    /* ── Send message to Claude API ── */
    async function send(text) {
        if (!text.trim()) return;

        addMsg('user', text);
        input.value = '';
        input.style.height = 'auto';
        showTyping();

        try {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1000,
                    system: `You are FocusFlow's AI Schedule Manager — a smart, friendly productivity assistant.
Help users plan their day, create schedule blocks, optimize focus time, and manage tasks.
Keep responses concise (2-4 sentences max unless creating a schedule).
When creating a schedule, format it as clean HTML using a div with class "ai-schedule-block" like:
<div class="ai-schedule-block"><strong>📅 Your Plan</strong>9:00–9:25 · Deep Work — Design 🟣<br>9:25–9:30 · Break 🔵<br>9:30–10:00 · Email & Comms 🟠<br></div>
Use emojis naturally. Be warm, energetic, and helpful. Never be verbose.`,
                    messages: [{ role: 'user', content: text }]
                })
            });

            const data = await res.json();
            hideTyping();

            const reply = data.content?.map(b => b.text || '').join('') 
                || "Sorry, I couldn't respond right now. Try again!";
            addMsg('ai', reply);

        } catch (err) {
            hideTyping();
            addMsg('ai', '⚠ Connection issue. Please check your internet and try again.');
            console.error('AI Popup error:', err);
        }
    }

    /* ── Event listeners ── */
    sendBtn.addEventListener('click', () => send(input.value));

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send(input.value);
        }
    });

    /* Auto-resize textarea */
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 80) + 'px';
    });

    /* Quick-action chips */
    chips.forEach(chip =>
        chip.addEventListener('click', () => send(chip.dataset.msg))
    );

})();
