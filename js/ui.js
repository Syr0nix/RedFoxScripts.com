// js/ui.js
document.addEventListener("DOMContentLoaded", function () {
    var input = document.getElementById("lua-input");
    var output = document.getElementById("lua-output");
    var button = document.getElementById("btn-obfuscate");
    var stats = document.getElementById("obf-stats");

    if (!input || !output || !button) {
        console.error("UI elements not found. Check your IDs in index.html");
        return;
    }

    button.addEventListener("click", function () {
        var code = input.value;

        if (!code.trim()) {
            alert("Paste your Lua script first.");
            return;
        }

        try {
            var result = RedFoxObfuscator.obfuscate(code, {});

            output.value = result.output;

            if (stats) {
                stats.textContent =
                    "Key: " + result.key +
                    " | Encoded length: " + result.hexLength +
                    " chars";
            }
        } catch (err) {
            console.error(err);
            alert("Obfuscation failed: " + err.message);
        }
    });
});
