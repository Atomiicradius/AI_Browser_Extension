// Chrome Storage API wrapper for managing summaries

const MyStorageManager = {
  // Save a summary
  async saveSummary(url, data) {
    try {
      // Get existing summaries
      const result = await chrome.storage.local.get(['summaries']);
      const summaries = result.summaries || [];
      
      // Check if URL already exists, update if so
      const existingIndex = summaries.findIndex(item => item.url === url);
      
      if (existingIndex !== -1) {
        // Update existing
        summaries[existingIndex] = {
          url: url,
          title: data.title,
          summary: data.summary,
          timestamp: data.timestamp || new Date().toISOString()
        };
      } else {
        // Add new
        summaries.push({
          url: url,
          title: data.title,
          summary: data.summary,
          timestamp: data.timestamp || new Date().toISOString()
        });
      }
      
      // Save back to storage
      await chrome.storage.local.set({ summaries: summaries });
      console.log('Summary saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving summary:', error);
      throw error;
    }
  },

  // Get all summaries
  async getAllSummaries() {
    try {
      const result = await chrome.storage.local.get(['summaries']);
      return result.summaries || [];
    } catch (error) {
      console.error('Error getting summaries:', error);
      throw error;
    }
  },

  // Get summary for specific URL
  async getSummary(url) {
    try {
      const summaries = await this.getAllSummaries();
      return summaries.find(item => item.url === url);
    } catch (error) {
      console.error('Error getting summary:', error);
      throw error;
    }
  },

  // Delete a summary
  async deleteSummary(url) {
    try {
      const summaries = await this.getAllSummaries();
      const filtered = summaries.filter(item => item.url !== url);
      await chrome.storage.local.set({ summaries: filtered });
      console.log('Summary deleted');
      return true;
    } catch (error) {
      console.error('Error deleting summary:', error);
      throw error;
    }
  },

  // Clear all summaries
  async clearAllSummaries() {
    try {
      await chrome.storage.local.set({ summaries: [] });
      console.log('All summaries cleared');
      return true;
    } catch (error) {
      console.error('Error clearing summaries:', error);
      throw error;
    }
  },

  // Get summary count
  async getCount() {
    try {
      const summaries = await this.getAllSummaries();
      return summaries.length;
    } catch (error) {
      console.error('Error getting count:', error);
      return 0;
    }
  }
};

// Make it available globally
if (typeof window !== 'undefined') {
  window.MyStorageManager = MyStorageManager;
}
