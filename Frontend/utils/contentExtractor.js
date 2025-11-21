// Content extraction utilities

function extractMainContent() {
  // Remove noise elements
  const removeSelectors = [
    'script', 'style', 'nav', 'header', 'footer', 
    'aside', '.ad', '.advertisement', '.sidebar'
  ];
  
  // Clone body to avoid modifying page
  const clone = document.body.cloneNode(true);
  
  // Remove noise
  removeSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });
  
  // Extract text from main content areas
  const contentSelectors = ['article', 'main', '.content', '#content'];
  let mainContent = null;
  
  for (let selector of contentSelectors) {
    mainContent = clone.querySelector(selector);
    if (mainContent) break;
  }
  
  // Fallback to body if no main content found
  const content = mainContent || clone;
  
  // Get text content
  const text = content.innerText || content.textContent;
  
  // Clean up whitespace
  return text.replace(/\s+/g, ' ').trim();
}

function truncateContent(text, maxTokens = 2000) {
  // Rough token estimation: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4;
  return text.slice(0, maxChars);
}

function getPageMetadata() {
  return {
    title: document.title,
    url: window.location.href,
    domain: window.location.hostname
  };
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractMainContent,
    truncateContent,
    getPageMetadata
  };
}
