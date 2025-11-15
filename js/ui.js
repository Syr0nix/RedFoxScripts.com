console.log("UI.JS LOADED");

document.addEventListener("DOMContentLoaded", function () {

    const input  = document.getElementById("lua-input");
    const output = document.getElementById("lua-output");
    const button = document.getElementById("btn-obfuscate");
    const stats  = document.getElementById("obf-stats");

    button.addEventListener("click", function () {

        console.log("BUTTON CLICKED");

        const code = input.value;
        if (!code.trim()) {
            alert("Paste a script first!");
            return;
        }

        const opts = {
            variableRename:  document.getElementById("opt-rename").checked,
            stringEncrypt:   document.getElementById("opt-strenc").checked,
            controlFlowFlatten: document.getElementById("opt-flatten").checked,
            vmMode: document.getElementById("opt-vm").checked,
            junkNodes: document.getElementById("opt-junk").checked,
            antiDebug: document.getElementById("opt-antidebug").checked,
            antiTamper: document.getElementById("opt-antitamper").checked
        };

        const result = RedFoxObfuscator.obfuscate(code, opts);
        console.log("OBFUSCATE RESULT:", result);

        output.value = result.output;

        stats.textContent = `Size: ${code.length} → ${result.output.length} chars | Layers: ${result.layers}`;
    });

});
