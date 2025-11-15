// js/ui.js
document.addEventListener("DOMContentLoaded", function () {
    var input  = document.getElementById("lua-input");
    var output = document.getElementById("lua-output");
    var button = document.getElementById("btn-obfuscate");
    var stats  = document.getElementById("obf-stats");
    var modeSelector = document.getElementById("obf-mode"); // optional <select>

    if (!input || !output || !button) {
        console.error("Missing UI elements. Check IDs in index.html");
        return;
    }

    button.addEventListener("click", function () {
        var code = input.value;
        if (!code.trim()) {
            alert("Paste your Luau script first.");
            return;
        }

        var mode = "max";
        if (modeSelector && modeSelector.value) {
            mode = modeSelector.value;
        }

        try {
            var result = RedFoxObfuscator.obfuscateLuau(code, { level: mode });
            output.value = result.output;

            if (stats) {
                stats.textContent =
                    "Mode: " + result.mode +
                    " | Encoded length: " + result.hexLength + " chars";
            }
        } catch (err) {
            console.error(err);
            alert("Obfuscation failed: " + err.message);
        }
    });
});
