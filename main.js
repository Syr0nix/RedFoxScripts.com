// === TAB SWITCHING ===
function showTab(tabId, event) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add("active");
  if (event?.currentTarget) event.currentTarget.classList.add("active");
}

// === SCRIPT VIEWER ===
function showScript(name, url) {
  const viewer = document.getElementById("viewer");
  const output = document.getElementById("codeOutput");
  const label = document.getElementById("scriptName");
  if (!viewer || !output || !label) return;
  output.textContent = `loadstring(game:HttpGet("${url}"))()`;
  label.textContent = name + " Script";
  viewer.classList.remove("hidden");
}

// === COPY SCRIPT ===
function copyScript() {
  const codeEl = document.getElementById("codeOutput");
  if (!codeEl) return;
  const code = codeEl.textContent;
  navigator.clipboard.writeText(code)
    .then(() => alert("📋 Script copied to clipboard!"))
    .catch(() => alert("❌ Failed to copy script!"));
}

// === OBFUSCATOR HELPERS ===

function generateRandomName(len = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let name = '_';
  for (let i = 0; i < len; i++) {
    name += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return name;
}

function renameIdentifiers(code) {
  const varMap = {};
  const used = new Set();
  function getName(orig) {
    if (!varMap[orig]) {
      let newName;
      do {
        newName = generateRandomName();
      } while (used.has(newName));
      used.add(newName);
      varMap[orig] = newName;
    }
    return varMap[orig];
  }
  code = code.replace(/\b(local|function)\s+([a-zA-Z_]\w*)/g, (_, kw, name) => `${kw} ${getName(name)}`);
  code = code.replace(/\b([a-zA-Z_]\w*)\b/g, id => varMap[id] || id);
  return code;
}

function injectJunkLines(count = 5) {
  const lines = [];
  for (let i = 0; i < count; i++) {
    const varName = generateRandomName();
    const val = Math.random() > 0.5 ? `"${generateRandomName(8)}"` : Math.floor(Math.random() * 99999);
    lines.push(`local ${varName}=${val}`);
  }
  return lines.join(Math.random() > 0.5 ? "\n" : " ");
}

function addVisualChaos(code) {
  code = code.replace(/;/g, () => (Math.random() > 0.5 ? ';;' : ';'));
  code = code.replace(/\n/g, () => (Math.random() > 0.5 ? '\n\n' : '\n'));
  code = code.replace(/ {2,}/g, () => (Math.random() > 0.5 ? ' ' : '\t'));
  return code;
}

function wrapWithFakeControlFlow(code) {
  const junkVar1 = generateRandomName();
  const junkVar2 = generateRandomName();
  return `
if ${junkVar1}~=nil then
  while true do
    if ${junkVar2}==nil then break end;
    ${injectJunkLines(3)};
    ${code}
    break;
  end;
end;
`;
}

function xorEncryptString(str, key) {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    out += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return out;
}

function generateRuntimeDecryptor(keyName, funcName) {
  return `
local function ${funcName}(str)
  local key="${keyName}";
  local res="";
  for i=1,#str do
    local k = key:byte((i-1) % #key + 1);
    local c = str:byte(i);
    res = res .. string.char(bit32.bxor(c,k));
  end
  return res;
end
`;
}

function escapeString(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function encryptStringsInCode(code, key, decryptName) {
  return code.replace(/"([^"]*)"/g, (_, str) => {
    const encrypted = xorEncryptString(str, key);
    return `${decryptName}("${escapeString(encrypted)}")`;
  });
}

function generateAntiDebug() {
  const checkVar = generateRandomName();
  return `
local ${checkVar} = tick()
local function check()
  if tick() - ${checkVar} > 10 then
    error("Debugger detected")
  end
end
task.spawn(function()
  while true do
    check()
    task.wait(1)
  end
end)
`;
}

function fullObfuscateLuau(code) {
  let obf = renameIdentifiers(code);
  const key = generateRandomName(8);
  const decryptName = generateRandomName(6);
  const decryptor = generateRuntimeDecryptor(key, decryptName);
  obf = encryptStringsInCode(obf, key, decryptName);
  obf = decryptor + '\nlocal decrypt = ' + decryptName + '\n' + obf;
  obf = injectJunkLines(7) + '\n' + obf + '\n' + injectJunkLines(5);
  obf = wrapWithFakeControlFlow(obf);
  obf = generateAntiDebug() + '\n' + obf;
  obf = addVisualChaos(obf);
  return obf;
}

// === COPY OBFUSCATED TEXT ===
function copyObfText() {
  const code = document.getElementById("obfuscatorOutput")?.textContent;
  if (!code) return;
  navigator.clipboard.writeText(code)
    .then(() => alert("📋 Obfuscated script copied!"))
    .catch(() => alert("❌ Failed to copy obfuscated script!"));
}

// === VERSION CHECK ===
function checkForUpdate() {
  fetch("https://raw.githubusercontent.com/Syr0nix/RedFoxScripts.com/refs/heads/main/version.txt?t=" + Date.now())
    .then(res => res.text())
    .then(ver => {
      const el = document.getElementById("versionTag");
      if (el) el.textContent = "Version: " + ver.trim();
    })
    .catch(() => {
      const el = document.getElementById("versionTag");
      if (el) el.textContent = "Version: Unknown";
    });
}

checkForUpdate();
setInterval(checkForUpdate, 5000);
