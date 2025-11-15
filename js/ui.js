// js/ui.js
document.addEventListener("DOMContentLoaded", function () {
    var input  = document.getElementById("lua-input");
    var output = document.getElementById("lua-output");
    var button = document.getElementById("btn-obfuscate");
    var stats  = document.getElementById("obf-stats");

    function get(id) {
        return document.getElementById(id);
    }

    if (!input || !output || !button) {
        console.error("Missing UI elements, check IDs in index.html");
        return;
    }

    button.addEventListener("click", function () {
        var code = input.value;
        if (!code.trim()) {
            alert("Paste your Luau / Roblox script first.");
            return;
        }

        var opts = {
            variableRename:      get("opt-rename").checked,
            stringEncrypt:       get("opt-strenc").checked,
            controlFlowFlatten:  get("opt-flatten").checked,
            vmMode:              get("opt-vm").checked,
            junkNodes:           get("opt-junk").checked,
            antiDebug:           get("opt-antidebug").checked,
            antiTamper:          get("opt-antitamper").checked
        };

        try {
            var result = RedFoxObfuscator.obfuscate(code, opts);
            output.value = result.output;

            if (stats) {
                stats.textContent =
                    "Size: " + code.length + " → " + result.output.length +
                    " chars | Hex length: " + result.hexLength +
                    " | Layers: " + result.layers;
            }
        } catch (err) {
            console.error(err);
            alert("Obfuscation failed: " + err.message);
        }
    });
});
