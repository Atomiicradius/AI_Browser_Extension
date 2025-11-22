console.log("Content script loaded!");

function extractPageContext() {
  return {
    title: document.title,
    url: window.location.href,
    description: document.querySelector('meta[name="description"]')?.content || '',
    mainContent: document.body.innerText.slice(0, 5000),
    headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent)
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContext') {
    sendResponse(extractPageContext());
  }
});
