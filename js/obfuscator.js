console.log("RedFox Obfuscator Loaded.");

// ------------------------------
// Helper: random identifier
// ------------------------------
function rfRandomIdent(len) {
    var chars = "lI1O0";
    var out = "_";
    for (var i = 0; i < len; i++) {
        out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
}

// ------------------------------
// Module 1: Variable Renaming
//  - Renames locals, local functions,
//    and for-loop variables.
//  - Best effort (text-based), not a full AST.
// ------------------------------
function renameVariables(code) {
    var mapping = Object.create(null);

    // Globals / names we DO NOT want to mess with
    var skip = new Set([
        "game","workspace","script","self",
        "math","table","string","coroutine","debug","task","os",
        "pairs","ipairs","print","warn","error","pcall","xpcall",
        "_G","shared","Enum","Vector3","CFrame","Instance",
        "tick","time","wait","spawn","delay",
        "_RF_DEC" // our helper, do NOT touch
    ]);

    function addName(name) {
        if (!name) return;
        if (skip.has(name)) return;
        if (name.startsWith("_RF_")) return; // don't rename our internals
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return;
        if (!mapping[name]) {
            mapping[name] = rfRandomIdent(8);
        }
    }

    // --- find local function names ---
    var localFuncRe = /\blocal\s+function\s+([A-Za-z_][A-Za-z0-9_]*)/g;
    var m;
    while ((m = localFuncRe.exec(code)) !== null) {
        addName(m[1]);
    }

    // --- find local variable declarations like: local a, b, c = ... ---
    var localVarRe = /\blocal\s+((?:[A-Za-z_][A-Za-z0-9_]*\s*(?:,\s*[A-Za-z_][A-Za-z0-9_]*)*))\s*=/g;
    while ((m = localVarRe.exec(code)) !== null) {
        var namesPart = m[1];
        var parts = namesPart.split(",");
        for (var i = 0; i < parts.length; i++) {
            var n = parts[i].trim();
            addName(n);
        }
    }

    // --- numeric for loop: for i = 1, 10 do ---
    var forNumRe = /\bfor\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/g;
    while ((m = forNumRe.exec(code)) !== null) {
        addName(m[1]);
    }

    // --- generic for loop: for k, v in pairs() do ---
    var forGenRe = /\bfor\s+((?:[A-Za-z_][A-Za-z0-9_]*\s*(?:,\s*[A-Za-z_][A-Za-z0-9_]*)*))\s+in\b/g;
    while ((m = forGenRe.exec(code)) !== null) {
        var p2 = m[1].split(",");
        for (var j = 0; j < p2.length; j++) {
            var n2 = p2[j].trim();
            addName(n2);
        }
    }

    // --- function parameters: function foo(a, b, c) ---
    var funcParamRe = /\bfunction\s+[A-Za-z_][A-Za-z0-9_.:]*\s*\(([^)]*)\)/g;
    while ((m = funcParamRe.exec(code)) !== null) {
        var params = m[1].split(",");
        for (var k = 0; k < params.length; k++) {
            var p = params[k].trim();
            if (!p || p === "...") continue;
            addName(p);
        }
    }

    var allNames = Object.keys(mapping);
    if (!allNames.length) {
        return code; // nothing to rename
    }

    // Build a single regex: \b(name1|name2|...)\b
    function escapeReg(s) {
        return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    }

    var pattern = new RegExp("\\b(" + allNames.map(escapeReg).join("|") + ")\\b", "g");

    // Replace identifiers everywhere (NOTE: can hit strings/comments in edge cases)
    var renamed = code.replace(pattern, function (full, name) {
        return mapping[name] || full;
    });

    return renamed;
}

// ------------------------------
// Internal string encryption
// ------------------------------
function encryptStrings(code) {
    // Replace "string" literals with runtime-decrypted calls
    // NOTE: very simple, only double-quoted strings.
    return code.replace(/"(.-)"/g, function(_, str) {

        // XOR key
        var key = Math.floor(Math.random() * 200) + 30;

        var bytes = [];
        for (var i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i) ^ key);
        }

        return '(_RF_DEC("' + bytes.join(",") + '",' + key + "))";
    });
}

// ------------------------------
// Main Obfuscator Interface
// ------------------------------
window.RedFoxObfuscator = {
    obfuscate: function (code, opts) {

        // 1) Variable rename (Module 1)
        if (opts.variableRename) {
            code = renameVariables(code);
        }

        // 2) String encryption
        if (opts.stringEncrypt) {
            code = encryptStrings(code);
        }

        // 3) Hex encode final code
        var hex = "";
        for (var i = 0; i < code.length; i++) {
            hex += code.charCodeAt(i).toString(16).padStart(2, "0");
        }

        var layers =
            (opts.variableRename ? 1 : 0) +
            (opts.stringEncrypt ? 1 : 0) +
            (opts.controlFlowFlatten ? 1 : 0) +
            (opts.vmMode ? 1 : 0) +
            (opts.junkNodes ? 1 : 0) +
            (opts.antiDebug ? 1 : 0) +
            (opts.antiTamper ? 1 : 0);

        var wrapped = `
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
