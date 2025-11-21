document.addEventListener('DOMContentLoaded', () => {
  const summarizeBtn = document.getElementById('summarizeBtn');
  const result = document.getElementById('result');

  summarizeBtn.addEventListener('click', () => {
    result.innerText = "Summarization will appear here!";
    // In future: call content script or backend to do summary
  });
});
// Save a test summary when the popup loads
MyStorageManager.saveSummary(window.location.href, "This is a test summary.")
  .then(data => console.log("Saved summary:", data))
  .catch(err => console.error("Error saving summary:", err));

// Retrieve and log all summaries
MyStorageManager.getSummaries()
  .then(summaries => console.log("All summaries:", summaries))
  .catch(err => console.error("Error getting summaries:", err));
