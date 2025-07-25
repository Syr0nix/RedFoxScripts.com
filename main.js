// TAB SWITCHING
function showTab(tabId, event) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
  event.currentTarget.classList.add("active");
}

// SCRIPT VIEWER
function showScript(name, url) {
  const viewer = document.getElementById("viewer");
  const output = document.getElementById("codeOutput");
  const label = document.getElementById("scriptName");

  output.textContent = `loadstring(game:HttpGet("${url}"))()`;
  label.textContent = name + " Script";
  viewer.classList.remove("hidden");
}

// COPY SCRIPT
function copyScript() {
  const code = document.getElementById("codeOutput").textContent;
  navigator.clipboard.writeText(code).then(() => {
    alert("📋 Script copied to clipboard!");
  });
}

// OBFUSCATOR
function runObfuscator() {
  const input = document.getElementById("luauInput")?.value.trim();
  const output = document.getElementById("obfOutput");
  const copyBtn = document.getElementById("copyObf");

  if (!input) {
    if (output) output.textContent = "-- Please enter Luau code.";
    if (copyBtn) copyBtn.style.display = "none";
    return;
  }

  const bytes = input.split('').map(c => c.charCodeAt(0));
  const encoded = `local code = { ${bytes.join(", ")} }\nloadstring(string.char(unpack(code)))()`;

  if (output) output.textContent = encoded;
  if (copyBtn) copyBtn.style.display = "inline-block";
}

// COPY OBFUSCATED TEXT
function copyObfText() {
  const code = document.getElementById("obfOutput").textContent;
  navigator.clipboard.writeText(code).then(() => {
    alert("📋 Obfuscated script copied!");
  });
}

// VERSION CHECK
function checkForUpdate() {
  fetch("https://raw.githubusercontent.com/Syr0nix/RedFoxScripts.com/refs/heads/main/version.txt?t=" + Date.now())
    .then(res => res.text())
    .then(ver => {
      document.getElementById("versionTag").textContent = "Version: " + ver.trim();
    })
    .catch(() => {
      document.getElementById("versionTag").textContent = "Version: Unknown";
    });
}

checkForUpdate();
setInterval(checkForUpdate, 5000);
