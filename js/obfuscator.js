console.log("RedFox Obfuscator Loaded.");

// ------------------------------
// Internal string encryption
// ------------------------------
function encryptStrings(code) {
    return code.replace(/"(.-)"/g, function(_, str) {

        // XOR key
        let key = Math.floor(Math.random() * 200) + 30;

        // convert characters
        let bytes = [];
        for (let i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i) ^ key);
        }

        return `(_RF_DEC("${bytes.join(",")}",${key}))`;
    });
}


// ------------------------------
// Main Obfuscator Interface
// ------------------------------
window.RedFoxObfuscator = {
    obfuscate: function (code, opts) {

        // Apply string encryption BEFORE hex wrapping
        if (opts.stringEncrypt) {
            code = encryptStrings(code);
        }

        // Hex encode final code
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

        // Output
        let wrapped = `
-- RedFox Hybrid TEMP Engine
local function _RF_DEC(b,k)
    local out = ""
    for num in string.gmatch(b, "%d+") do
        out = out .. string.char(tonumber(num) ~ k)
    end
    return out
end

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
