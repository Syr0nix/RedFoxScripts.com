// === TAB SWITCHING ===
function showTab(tabId) {
  document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  event.currentTarget.classList.add('active');
}

// === SCRIPT VIEWER ===
function showScript(name, url) {
  const viewer = document.getElementById("viewer");
  const output = document.getElementById("codeOutput");
  const label = document.getElementById("scriptName");

  output.textContent = `loadstring(game:HttpGet("${url}"))()`;
  label.textContent = name + " Script";
  viewer.classList.remove("hidden");
}

function copyScript() {
  const code = document.getElementById("codeOutput").textContent;
  navigator.clipboard.writeText(code).then(() => {
    alert("📋 Script copied to clipboard!");
  });
}

// === VERSION CHECK (WinOps tab) ===
const currentPage = document.getElementById("windows-tools");
if (currentPage) {
  fetch("https://raw.githubusercontent.com/Syr0nix/WinOps/main/version.txt")
    .then(res => res.text())
    .then(version => {
      document.getElementById("winops-version").innerText = version.trim();
    })
    .catch(() => {
      document.getElementById("winops-version").innerText = "Unavailable";
    });
}
