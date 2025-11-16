/* ui.js – RedFox Obfuscator UI controller */
console.log("UI.JS LOADED");

document.addEventListener("DOMContentLoaded", () => {
    const input  = document.getElementById("lua-input");
    const output = document.getElementById("lua-output");
    const button = document.getElementById("btn-obfuscate");
    const stats  = document.getElementById("obf-stats");

    const getOpt = id => {
        const el = document.getElementById(id);
        return el ? el.checked : false;
    };

    button.addEventListener("click", () => {
        console.log("BUTTON CLICKED");
        const code = input.value.trim();
        if (!code) {
            alert("Paste a script first!");
            return;
        }

        const opts = {
            variableRename:     getOpt("opt-rename"),
            stringEncrypt:      getOpt("opt-strenc"),
            controlFlowFlatten: getOpt("opt-flatten"),
            vmMode:             getOpt("opt-vm"),
            junkNodes:          getOpt("opt-junk"),
            antiDebug:          getOpt("opt-antidebug"),
            antiTamper:         getOpt("opt-antitamper")
        };

        const result = RedFoxObfuscator.obfuscate(code, opts);
        console.log("OBFUSCATE RESULT:", result);

        output.value = result.output;
        stats.textContent = `Size: ${code.length} → ${result.output.length} chars | Layers: ${result.layers}`;
    });
});
