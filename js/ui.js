document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("input");
  const output = document.getElementById("output");
  const status = document.getElementById("status");
  const obfuscateBtn = document.getElementById("obfuscate");
  const copyBtn = document.getElementById("copy");
  const clearBtn = document.getElementById("clear");

  function showStatus(msg, isError = false) {
    status.textContent = msg;
    status.style.color = isError ? "#f85149" : "#58a6ff";
    setTimeout(() => status.textContent = "", 3000);
  }

  obfuscateBtn.addEventListener("click", () => {
    const code = input.value.trim();
    if (!code) return showStatus("Enter Luau code first!", true);
    
    try {
      const result = window.obfuscateLuau(code);
      output.value = result;
      showStatus("Obfuscated successfully!");
    } catch (e) {
      showStatus("Error: " + e.message, true);
    }
  });

  copyBtn.addEventListener("click", () => {
    if (!output.value) return showStatus("Nothing to copy!", true);
    output.select();
    document.execCommand("copy");
    showStatus("Copied to clipboard!");
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    output.value = "";
    showStatus("Cleared!");
  });
});
