// TAB SWITCHING
function openTab(tabId, event) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.remove('hidden');
  event.currentTarget.classList.add('active');
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

function copyScript() {
  const code = document.getElementById("codeOutput").textContent;
  navigator.clipboard.writeText(code).then(() => {
    alert("📋 Script copied to clipboard!");
  });
}

// LUAU OBFUSCATOR
function runObfuscator() {
  const input = document.getElementById("luauInput").value.trim();
  const output = document.getElementById("obfOutput");
  const copyBtn = document.getElementById("copyObf");

  if (!input) {
    output.textContent = "-- Please enter Luau code.";
    copyBtn.style.display = "none";
    return;
  }

  const bytes = input.split('').map(c => c.charCodeAt(0));
  const encoded = `local code = { ${bytes.join(", ")} }\nloadstring(string.char(unpack(code)))()`;

  output.textContent = encoded;
  copyBtn.style.display = "inline-block";
}

function copyObfText() {
  const code = document.getElementById("obfOutput").textContent;
  navigator.clipboard.writeText(code).then(() => {
    alert("📋 Obfuscated script copied!");
  });
}

// VERSION CHECK
function checkForUpdate() {
  const versionURL = "https://raw.githubusercontent.com/Syr0nix/RedFoxScripts.com/refs/heads/main/version.txt";
  fetch(versionURL + "?t=" + Date.now())
    .then(res => res.text())
    .then(ver => {
      document.getElementById("versionTag").textContent = "Version: " + ver.trim();
    })
    .catch(() => {
      document.getElementById("versionTag").textContent = "Version: Unknown";
    });
}

checkForUpdate();
setInterval(checkForUpdate, 15000);

// WINDOWS TOOLS TAB
if (currentPage === "windows-tools") {
  const container = document.getElementById("winops-list");

  fetch("https://api.github.com/repos/Syr0nix/WinOps/contents/")
    .then(res => res.json())
    .then(files => {
      const tools = files.filter(f =>
        f.name.endsWith(".exe") ||
        f.name.endsWith(".bat") ||
        f.name.endsWith(".ps1")
      );

      if (tools.length === 0) {
        container.innerHTML = "<p>No tools found in WinOps repo.</p>";
        return;
      }

      container.innerHTML = tools.map(tool => `
        <div class="tool-box">
          <strong>${tool.name}</strong>
          <a href="${tool.download_url}" download class="download-btn">Download</a>
        </div>
      `).join("");
    })
    .catch(() => {
      container.innerHTML = "<p>⚠️ Failed to load WinOps tools.</p>";
    });

  // version fetch
  fetch("https://raw.githubusercontent.com/Syr0nix/WinOps/main/version.txt")
    .then(res => res.text())
    .then(version => {
      document.getElementById("winops-version").innerText = version.trim();
    })
    .catch(() => {
      document.getElementById("winops-version").innerText = "Unavailable";
    });
}
