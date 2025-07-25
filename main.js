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
function generateJunkVar() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  return '_' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function renameVariables(code) {
  let varIndex = 0;
  const varMap = {};
  return code.replace(/\blocal\s+(\w+)/g, (_, name) => {
    if (!varMap[name]) varMap[name] = generateJunkVar();
    return `local ${varMap[name]}`;
  }).replace(/\b(\w+)\b/g, (match) => {
    return varMap[match] || match;
  });
}

function injectJunkLines(count = 3) {
  const lines = [];
  for (let i = 0; i < count; i++) {
    const v = generateJunkVar();
    const value = Math.random() > 0.5 ? `"${generateJunkVar()}"` : Math.floor(Math.random() * 9999);
    lines.push(`local ${v} = ${value}`);
  }
  return lines.join("\n");
}

function obfuscateLuau() {
  const input = document.getElementById("luauInput").value.trim();
  const outputBox = document.getElementById("obfuscatorOutput");
  if (!input) {
    outputBox.textContent = "Please enter a script.";
    outputBox.classList.remove("hidden");
    return;
  }

  let obf = "-- Obfuscated by RedFox Obfuscator for Wave\n";
  obf += injectJunkLines(4) + "\n\n";
  obf += renameVariables(input) + "\n\n";
  obf += injectJunkLines(3);
  obf += "\n-- End Obfuscation";

  outputBox.textContent = obf;
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
