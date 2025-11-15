// js/obfuscator.js
console.log("RedFox Obfuscator Loaded");

// Create global object so ui.js can use it
window.RedFoxObfuscator = {
    obfuscate: function (code, opts) {

        // TEMP engine so the UI works immediately
        let hex = "";
        for (let i = 0; i < code.length; i++) {
            hex += code.charCodeAt(i).toString(16).padStart(2, "0");
        }

        let layers =
            (opts.variableRename ? 1 : 0) +
            (opts.stringEncrypt ? 1 : 0) +
            (opts.controlFlowFlatten ? 1 : 0) +
            (opts.vmMode ? 1 : 0) +
            (opts.junkNodes ? 1 : 0) +
            (opts.antiDebug ? 1 : 0) +
            (opts.antiTamper ? 1 : 0);

        let wrapped = `
-- RedFox Obfuscator (TEMP ENGINE)
local data = "${hex}"
local out = ""

for i = 1, #data, 2 do
    local byte = tonumber(data:sub(i, i+1), 16)
    out = out .. string.char(byte)
end

return loadstring(out)()
`;

        return {
            output: wrapped,
            hexLength: hex.length,
            layers: layers
        };
    }
};
