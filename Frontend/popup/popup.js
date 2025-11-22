document.addEventListener('DOMContentLoaded', () => {
  // DOM references for tabbing
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Tab switching logic
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // DOM references for theme and summarization
  const themeToggle = document.getElementById('themeToggle');
  const summarizeBtn = document.getElementById('summarizeBtn');
  const resultDiv = document.getElementById('result');

  // --- Hero entrance animation for top container ---
  document.querySelector('.container').classList.add('hero-animate');

  // --- Dark mode switch logic ---
  const theme = localStorage.getItem('ai_theme_switch') || 'light';
  setTheme(theme);

  themeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.contains('theme-light');
    setTheme(isLight ? 'dark' : 'light');
    localStorage.setItem('ai_theme_switch', isLight ? 'dark' : 'light');
  });

  function setTheme(newTheme) {
    document.body.classList.toggle('theme-light', newTheme === 'light');
    document.body.classList.toggle('theme-dark', newTheme === 'dark');
  }

  // --- Button ripple effect for Summarize button ---
  if (summarizeBtn) {
    summarizeBtn.addEventListener('mousedown', function(e) {
      this.classList.add('ripple');
      setTimeout(() => this.classList.remove('ripple'), 450);
    });
  }

  // --- Main summarization logic ---
  if (summarizeBtn) {
    summarizeBtn.addEventListener('click', async () => {
      try {
        setLoadingState(true);
        resultDiv.innerHTML = '';

        // Get active tab info (title, url, favicon)
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const faviconUrl = tab.favIconUrl || '';

        // Inject content extractor
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['utils/contentExtractor.js']
        });

        // Extract summary-ready content
        const [{ result: content }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => (typeof extractMainContent === 'function' ? extractMainContent() : document.body.innerText)
        });

        if (!content || content.trim().length < 100) throw new Error('Page content is too short or empty');

        // Send to backend
        const response = await fetch('http://localhost:3000/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });
        if (!response.ok) throw new Error((await response.json()).error || `Backend returned error: ${response.statusText}`);

        const data = await response.json();
        if (!data.summary) throw new Error('No summary received from backend');

        // Save to storage (pinned false by default)
        await saveSummaryToStorage(tab.url, tab.title, data.summary, false, faviconUrl);

        // Animated summary display with all effects!
        displaySummary(tab.url, tab.title, data.summary, false, faviconUrl);

      } catch (error) {
        displayError(error.message);
      } finally {
        setLoadingState(false);
      }
    });
  }

  async function saveSummaryToStorage(url, title, summary, pinned, faviconUrl) {
    try {
      await MyStorageManager.saveSummary(url, {
        title: title || 'Untitled Page',
        summary,
        pinned: !!pinned,
        faviconUrl: faviconUrl || '',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to save summary:', error);
    }
  }

  function setLoadingState(isLoading) {
    if (summarizeBtn) {
      summarizeBtn.disabled = !!isLoading;
      summarizeBtn.classList.toggle('loading', !!isLoading);
    }
  }

  async function displaySummary(url, title, summary, pinned, faviconUrl) {
    const timestamp = new Date().toLocaleString();
    resultDiv.innerHTML = `
      <div class="summary animated-summary scale-in">
        <div class="summary-header">
          <span class="summary-title">
            ${getSummaryIcon()} Summary
            <button class="pin-btn${pinned ? ' active' : ''}" id="pinBtn" aria-label="Pin summary" title="Pin summary">
              ${getPinIcon(pinned)}
            </button>
          </span>
          <div class="summary-actions">
            <button class="btn-icon" id="copyBtn" title="Copy">${getCopyIcon()}</button>
            <button class="btn-icon" id="clearBtn" title="Clear">${getClearIcon()}</button>
          </div>
        </div>
        <div class="summary-content">
          ${faviconUrl ? `<img class="favicon" src="${faviconUrl}" onerror="this.style.display='none'" alt="favicon">` : ''}
          ${formatSummary(summary)}
        </div>
        <div class="summary-footer">${timestamp}</div>
      </div>
    `;
    animateSummary();

    document.getElementById('pinBtn').addEventListener('click', async function () {
      this.classList.toggle('active');
      await MyStorageManager.saveSummary(url, {
        title, summary,
        pinned: this.classList.contains('active'),
        faviconUrl,
        timestamp: new Date().toISOString()
      });
      this.innerHTML = getPinIcon(this.classList.contains('active'));
    });

    document.getElementById('copyBtn').addEventListener('click', () => copyToClipboard(summary));
    document.getElementById('clearBtn').addEventListener('click', () => { resultDiv.innerHTML = ''; });
  }

  function animateSummary() {
    const summary = document.querySelector('.animated-summary');
    if (summary) {
      summary.classList.remove('scale-in');
      void summary.offsetWidth;
      summary.classList.add('scale-in');
    }
    Array.from(document.querySelectorAll('.summary-content li')).forEach((li, idx) => {
      li.style.setProperty('--i', idx);
    });
  }

  function formatSummary(summary) {
    const lines = summary.split('\n').filter(line => line.trim());
    const bullets = lines.filter(line => line.trim().startsWith('*') || line.trim().startsWith('-'));
    if (bullets.length > 0) {
      return `<ul>${bullets.map((line, idx) => {
        const text = line.replace(/^[*-]\s*/, '').trim();
        return `<li style="--i:${idx}">${escapeHtml(text)}</li>`;
      }).join('')}</ul>`;
    }
    return `<p>${escapeHtml(summary).replace(/\n/g, '<br>')}</p>`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function displayError(message) {
    resultDiv.innerHTML = `
      <div class="error">
        ${getErrorIcon()}
        <span><strong>Error:</strong> ${message}</span>
      </div>
    `;
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => showCopyNotification());
  }

  function showCopyNotification() {
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.innerHTML = `
      <svg width="18" height="18" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:8px;">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Copied to clipboard!
    `;
    document.body.appendChild(notification);
    setTimeout(() => { notification.remove(); }, 2200);
  }

  // SVG icon helpers
  function getPinIcon(active) {
    return active
      ? `<svg width="19" height="19" fill="#fbbf24" stroke="#fbbf24" stroke-width="2.2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
      : `<svg width="19" height="19" fill="none" stroke="#fbbf24" stroke-width="2.2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  }
  function getSummaryIcon() {
    return `<svg width="20" height="20" fill="none" stroke="#1e3c72" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>`;
  }
  function getCopyIcon() {
    return `<svg width="18" height="18" stroke="#1e3c72" fill="none" stroke-width="2.5" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;
  }
  function getClearIcon() {
    return `<svg width="18" height="18" stroke="#ef4444" fill="none" stroke-width="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>`;
  }
  function getErrorIcon() {
    return `<svg width="22" height="22" fill="none" stroke="#ef4444" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  }

  // --- Quick Action Buttons for Page Chat ---
// --- Quick Action Buttons for Page Chat (Structured Bullet Points) ---
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const pageContext = await getPageContext(tab.id);

    const promptType = btn.getAttribute('data-prompt');
    let actionLabel = '';
    let prompt = '';
    // Truncate content to prevent too-large input
    const truncatedContent = pageContext.mainContent.slice(0, 2000);

    if (promptType === "Summarize this page") {
      actionLabel = "📝 Summarize";
      prompt = `Summarize this page in exactly 3-5 clear bullet points using dashes (-) only. Do NOT include any introductory text, conclusion, or repeated asterisks. Only reply with:
- Main point 1
- Main point 2
Content:
${truncatedContent}`;
    } else if (promptType === "What are the main points?") {
      actionLabel = "💡 Extract key points";
      prompt = `List the most important key points with keywords from this page, responding ONLY with 3-5 bullet points using dashes (-). No introduction, no extra text:
- Key point 1
- Key point 2
- Keywords
Content:
${truncatedContent}`;
    } else if (promptType === "Explain this in simple terms") {
      actionLabel = "🎯 Simplify";
      prompt = `Explain the main ideas from this page in simple language for a beginner. Only use bullet points (dashes), no extra explanation, introduction, or asterisks. Use at least 3 points, but no more than 6:
- Simple point 1
- Simple point 2
Content:
${truncatedContent}`;
    } else {
      actionLabel = "⏳ Processing...";
      prompt = promptType;
    }

    // Only show the action label in chat, not the whole prompt!
    addChatMessage('user', actionLabel);
    sendButton.disabled = true;
    const loadingId = addChatMessage('assistant', '...', true);

    try {
      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          pageContext,
          conversationHistory
        })
      });
      const result = await response.json();
      document.getElementById(loadingId)?.remove();
      addChatMessage('assistant', result.reply || 'No reply received.');
      conversationHistory.push({ role: 'assistant', content: result.reply });
    } catch (err) {
      document.getElementById(loadingId)?.remove();
      addChatMessage('assistant', 'Error: ' + err.message);
    }
    sendButton.disabled = false;
  });
});


  // --- (Optional) Chat tab logic can be added here ---

  // When you're ready to add Page Chat logic, you can start by:
  // - Handling "Send" button click in the chat tab
  // - Displaying messages in #chatMessages
  // - Integrating your backend for AI replies

});
// --- Page Chat Step 1: Basic UI & Send Handler ---
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendMessage');
const chatMessages = document.getElementById('chatMessages');
const clearChatBtn = document.getElementById('clearChat');

// Chat history array
let conversationHistory = [];

// Send message handler
function getPageContext(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action: 'getPageContext' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

async function handleSendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  addChatMessage('user', message);
  chatInput.value = '';
  sendButton.disabled = true;
  const loadingId = addChatMessage('assistant', '...', true);

  let pageContext = {};
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    pageContext = await getPageContext(tab.id);

    // --- Send to backend ---
    const response = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        pageContext,
        conversationHistory  // (if you want context for multi-turn)
      })
    });
    const result = await response.json();

    document.getElementById(loadingId)?.remove();
    addChatMessage('assistant', result.reply || 'No reply received.');
    conversationHistory.push({ role: 'assistant', content: result.reply });
  } catch (err) {
    document.getElementById(loadingId)?.remove();
    addChatMessage('assistant', 'Error: ' + err.message);
  }
  sendButton.disabled = false;
}



// Utility: Add message to chatMessages panel
function addChatMessage(role, content, isLoading = false) {
  const messageId = `msg-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${role}`;
  messageDiv.id = messageId;
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  if (isLoading) {
    contentDiv.innerHTML = `
      <span class="loading-indicator"></span>
      <span class="loading-indicator"></span>
      <span class="loading-indicator"></span>`;
  } else {
    contentDiv.textContent = content;
  }
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  // Remove welcome message if still visible
  const welcomeMsg = chatMessages.querySelector('.welcome-message');
  if (welcomeMsg) welcomeMsg.remove();
  return messageId;
}

// Handle send button click
sendButton.addEventListener('click', handleSendMessage);
// Handle Enter key
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSendMessage();
  }
});

// Clear chat history
clearChatBtn.addEventListener('click', () => {
  conversationHistory = [];
  chatMessages.innerHTML = `<div class="welcome-message"><p>👋 Chat cleared! Ask me anything about this page.</p></div>`;
});
