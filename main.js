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

// OBFUSCATOR HELPERS
function xorString(str, key = 69) {
  return str.split('').map(char => `\\${char.charCodeAt(0) ^ key}`).join('');
}

function generateJunkVariable() {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  return "_" + Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function renameVariables(code) {
  return code.replace(/\b(local\s+)(\w+)/g, (_, decl, name) => {
    const newName = generateJunkVariable();
    return decl + newName;
  });
}

// MAIN OBFUSCATION FUNCTION
function obfuscateLuau() {
  const input = document.getElementById("luauInput").value.trim();
  const outputBox = document.getElementById("obfOutput");

  if (!input) {
    outputBox.textContent = "Please enter a script.";
    outputBox.classList.remove("hidden");
    return;
  }

  let code = input;

  // Obfuscation pipeline
  code = renameVariables(code);
  code = `--// Obfuscated by RedFox Luau Obfuscator\n` +
         `local ${generateJunkVariable()} = 0x${Math.floor(Math.random()*9999).toString(16)}\n` +
         code +
         `\n-- junk tail\nlocal ${generateJunkVariable()} = "${xorString("RedFox")}"`;

  outputBox.textContent = code;
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
