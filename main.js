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
function obfuscateLuau() {
  const input = document.getElementById("luauInput").value.trim();
  const outputBox = document.getElementById("obfuscatorOutput");

  if (!input) {
    outputBox.textContent = "Please enter a script.";
    outputBox.classList.remove("hidden");
    return;
  }

  // Simple Base64 encoding as fake "obfuscation"
  const encoded = btoa(unescape(encodeURIComponent(input)));

  // You can wrap this however you like — here’s one that does NOT use loadstring
  const fakeObfuscated = `
-- Base64-encoded Luau
local encoded = "${encoded}"
-- Decode manually or in your tool (not with loadstring)
print("Decoded content requires a custom decoder.")
`;

  outputBox.textContent = fakeObfuscated.trim();
  outputBox.classList.remove("hidden");
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
