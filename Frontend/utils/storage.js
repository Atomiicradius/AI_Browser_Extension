// Chrome Storage API wrapper

const MyStorageManager = {
  // Save summary
  async saveSummary(url, summary) {
    const data = {
      url,
      summary,
      timestamp: Date.now()
    };
    
    // Get existing summaries
    const result = await chrome.storage.local.get(['summaries']);
    const summaries = result.summaries || [];
    
    // Add new summary
    summaries.unshift(data);
    
    // Keep only last 50 summaries
    const trimmed = summaries.slice(0, 50);
    
    await chrome.storage.local.set({ summaries: trimmed });
    return data;
  },
  
  // Get all summaries
  async getSummaries() {
    const result = await chrome.storage.local.get(['summaries']);
    return result.summaries || [];
  },
  
  // Save settings
  async saveSettings(settings) {
    await chrome.storage.local.set({ settings });
  },
  
  // Get settings
  async getSettings() {
    const result = await chrome.storage.local.get(['settings']);
    return result.settings || {
      summarization: true,
      distractionDetection: true,
      sidebar: true,
      textUtilities: true
    };
  },
  
  // Clear all data
  async clearAll() {
    await chrome.storage.local.clear();
  }
};

// Export for use in extension
if (typeof chrome !== 'undefined') {
  window.MyStorageManager = MyStorageManager;
}
