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

function generateJunkVar(len = 5) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return "_" + Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function scrambleCode(code) {
  return code
    .replace(/\blocal\s+([a-zA-Z_]\w*)/g, () => "local " + generateJunkVar())
    .replace(/\bfunction\s+([a-zA-Z_]\w*)/g, () => "function " + generateJunkVar())
    .replace(/\s{2,}/g, () => Math.random() > 0.5 ? "\n" : "  ");
}

function injectJunkLines(count = 5) {
  const lines = [];
  for (let i = 0; i < count; i++) {
    const v = generateJunkVar();
    const val = Math.random() > 0.5 ? `"${generateJunkVar(6)}"` : Math.floor(Math.random() * 99999);
    lines.push(`local ${v} = ${val}`);
  }
  return lines.join(Math.random() > 0.5 ? "\n" : " ");
}

function fakeControlFlowWrap(code) {
  const junk = generateJunkVar();
  return `
if ${junk} ~= nil then
  while true do
    if ${junk} == nil then break end;
    ${injectJunkLines(3)};
    ${code}
    break;
  end;
end;`;
}

function obfuscateLuau() {
  const input = document.getElementById("luauInput").value.trim();
  const outputBox = document.getElementById("obfuscatorOutput");
  if (!input) {
    outputBox.textContent = "Paste a script to obfuscate.";
    outputBox.classList.remove("hidden");
    return;
  }

  let scrambled = scrambleCode(input);
  let withJunk = injectJunkLines(4) + "\n" + fakeControlFlowWrap(scrambled) + "\n" + injectJunkLines(4);
  let ugly = withJunk.replace(/;/g, () => Math.random() > 0.5 ? ";;" : ";").replace(/\n/g, () => Math.random() > 0.5 ? "\n\n" : "\n");

  outputBox.textContent = "--[[RedFox Obfuscator]]\n" + ugly + "\n--[[End]]";
  outputBox.classList.remove("hidden");
}
// COPY OBFUSCATED TEXT
function copyObfText() {
  const code = document.getElementById("obfuscatorOutput").textContent;
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
