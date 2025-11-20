document.addEventListener('DOMContentLoaded', () => {
  const summarizeBtn = document.getElementById('summarizeBtn');
  const result = document.getElementById('result');

  summarizeBtn.addEventListener('click', () => {
    result.innerText = "Summarization will appear here!";
    // In future: call content script or backend to do summary
  });
});
