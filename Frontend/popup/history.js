document.addEventListener('DOMContentLoaded', async () => {
  const themeToggle = document.getElementById('themeToggle');
  const switchBall = document.querySelector('.switch-ball');
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');
  const historyList = document.getElementById('historyList');
  const emptyState = document.getElementById('emptyState');
  const backBtn = document.getElementById('backBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const BODY = document.body;

  // --- Sync dark mode from localStorage (used in popup)
  const currentTheme = localStorage.getItem('ai_theme_switch') || 'light';
  setTheme(currentTheme);

  themeToggle.addEventListener('click', () => {
    const isLight = BODY.classList.contains('theme-light');
    setTheme(isLight ? 'dark' : 'light');
    localStorage.setItem('ai_theme_switch', isLight ? 'dark' : 'light');
  });

  function setTheme(theme) {
    BODY.classList.toggle('theme-dark', theme === 'dark');
    BODY.classList.toggle('theme-light', theme === 'light');
    if (theme === 'dark') {
      sunIcon.style.opacity = ".22";
      moonIcon.style.opacity = "1";
      switchBall.style.left = "22px";
      switchBall.style.background = "#334155";
    } else {
      sunIcon.style.opacity = "1";
      moonIcon.style.opacity = ".34";
      switchBall.style.left = "2px";
      switchBall.style.background = "#fff";
    }
    BODY.style.transition = "background 0.4s";
    document.querySelector('.background-gradient').style.transition = "opacity 0.4s";
  }

  // --- Back Button Logic ---
backBtn.onclick = () => {
  window.location.href = "popup.html";
};

  // --- Clear All Button Logic ---
  clearAllBtn.onclick = async () => {
    if (!confirm("Clear all summaries? This cannot be undone.")) return;
    try {
      await MyStorageManager.clearAllSummaries();
      document.querySelectorAll('.summary-card').forEach(card => {
        card.classList.add("remove-animate");
        setTimeout(() => card.remove(), 300);
      });
      emptyState.classList.remove('hidden');
    } catch (e) {
      alert("Error clearing summaries.");
    }
  };

  // --- Load and display summaries from storage
  try {
    const summaries = await MyStorageManager.getAllSummaries();
    renderHistory(summaries);
  } catch (err) {
    historyList.innerHTML = `<p style="color: #ff4444;">Error loading history.</p>`;
    emptyState.classList.remove('hidden');
  }

  // --- Render history cards
  function renderHistory(summaries) {
    historyList.innerHTML = "";
    if (!summaries || Object.keys(summaries).length === 0) {
      emptyState.classList.remove('hidden');
      return;
    } else {
      emptyState.classList.add('hidden');
    }
    // Sort by most recent date (descending)
    const sortedSummaries = Object.values(summaries).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    sortedSummaries.forEach(summaryObj => {
      const { title, summary, faviconUrl = "", timestamp } = summaryObj;

      // Build summary card
      const card = document.createElement('div');
      card.className = "summary-card";

      card.innerHTML = `
        <div class="summary-date">${formatDate(timestamp)}</div>
        <div class="summary-header-row">
          ${faviconUrl ? `<img src="${faviconUrl}" class="favicon" style="width:16px;height:16px;margin-right:7px;border-radius:4px;vertical-align:middle;box-shadow:0 2px 5px rgba(59,130,246,.10);">` : ""}
          <svg class="summary-icon" width="18" height="18" fill="none" stroke="#667eea" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;">
            <rect x="4" y="3" width="13" height="18" rx="3"/>
          </svg>
          <span>${escapeHtml(title)}</span>
        </div>
        <div class="summary-content">${formatSummary(summary)}</div>
        <div class="history-actions">
          <button class="btn-icon" title="Copy">
            <svg width="17" height="17" fill="none" stroke="#38bdf8" stroke-width="2.2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
          <button class="btn-icon" title="Delete">
            <svg width="17" height="17" fill="none" stroke="#ef4444" stroke-width="2.2" viewBox="0 0 24 24"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
          </button>
        </div>
      `;
      // --- Animate in
      card.style.opacity = "0";
      setTimeout(() => { card.style.opacity = "1"; }, 60);

      // --- Copy summary handler
      card.querySelector('[title="Copy"]').onclick = () => {
        navigator.clipboard.writeText(summary);
        showCopyNotification(card, "Copied summary!");
      };
      // --- Delete summary handler
      card.querySelector('[title="Delete"]').onclick = async () => {
        await MyStorageManager.deleteSummary(summaryObj.url);
        card.classList.add("remove-animate");
        setTimeout(() => card.remove(), 420);
        // If last card removed, show empty state
        if (!historyList.querySelector('.summary-card')) emptyState.classList.remove('hidden');
      };

      historyList.appendChild(card);
    });
  }

  // --- Copy notification inside the card
  function showCopyNotification(card, msg) {
    const notif = document.createElement('div');
    notif.className = 'copy-notification';
    notif.textContent = msg;
    notif.style.position = 'absolute';
    notif.style.top = '12px';
    notif.style.right = '22px';
    card.appendChild(notif);
    setTimeout(() => notif.remove(), 1600);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // --- Format date
  function formatDate(dtStr) {
    try {
      const dateObj = new Date(dtStr);
      return dateObj.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return dtStr;
    }
  }

  // --- Format summary: bullets & text
  function formatSummary(summary) {
    const lines = summary.split('\n').filter(x => x.trim());
    const bullets = lines.filter(line => line.startsWith("*") || line.startsWith("-"));
    if (bullets.length > 0) {
      return `<ul>${bullets.map(x => `<li>${escapeHtml(x.replace(/^(\*|-)\s*/, ""))}</li>`).join('')}</ul>`;
    } else {
      return `<p>${escapeHtml(summary).replace(/\n/g,"<br>")}</p>`;
    }
  }
});
