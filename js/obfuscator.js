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
        "_RF_DEC", "_RF_VM_RUN" // our helpers, do NOT touch
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
// Helpers for INSANE flattening / junk
// ------------------------------
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function randomState(blocks) {
    let b = blocks[Math.floor(Math.random() * blocks.length)];
    return b.id.toString();
}

function opaquePredicate() {
    let a = Math.floor(Math.random() * 50) + 1;
    let b = Math.floor(Math.random() * 50) + 1;
    let c = a + b;
    return `${a} + ${b} == ${c} and ${a} * ${b} > ${a}`;
}

function generateJunkLua() {
    let junk = [
        "local _x = (" + Math.floor(Math.random() * 9999) + ")",
        "for _i=1,1 do end",
        "do local z = " + Math.floor(Math.random() * 9999) + " end",
        "if (" + opaquePredicate() + ") then local q=1 end",
        "local _t = tostring(" + Math.random() + ")",
        "local _ = " + Math.floor(Math.random() * 9999)
    ];
    return junk[Math.floor(Math.random() * junk.length)];
}

// ------------------------------------------------------------
// MODULE 2: INSANE CONTROL FLOW FLATTENING
// ------------------------------------------------------------
function controlFlowFlattenInsane(code) {

    // 1. Split into "rough" blocks by newline
    let lines = code.split(/[\r\n]+/).filter(l => l.trim().length > 0);

    if (lines.length === 0) return code;

    // 2. Convert lines into state blocks
    let blocks = [];
    for (let i = 0; i < lines.length; i++) {
        blocks.push({
            id: i,
            code: lines[i],
            real: true
        });
    }

    // 3. Generate junk states (fake dead blocks)
    let junkCount = Math.floor(lines.length * 1.5) + 10;
    for (let j = 0; j < junkCount; j++) {
        blocks.push({
            id: "junk" + j,
            code: generateJunkLua(),
            real: false
        });
    }

    // 4. Shuffle block order
    shuffleArray(blocks);

    // 5. Build state machine dispatcher
    let dispatcher = [];
    dispatcher.push("local _STATE = \"" + blocks[0].id + "\"");
    dispatcher.push("while true do");

    blocks.forEach((b, idx) => {
        dispatcher.push("    if _STATE == \"" + b.id + "\" then");

        // Insert opaque predicate for INSANE mode
        dispatcher.push("        if ((" + opaquePredicate() + ")) then");

        dispatcher.push("            " + b.code);

        // Next state
        if (idx < blocks.length - 1) {
            dispatcher.push("            _STATE = \"" + blocks[idx + 1].id + "\"");
        } else {
            dispatcher.push("            break");
        }

        dispatcher.push("        else");
        dispatcher.push("            " + generateJunkLua());
        dispatcher.push("            _STATE = \"" + randomState(blocks) + "\"");
        dispatcher.push("        end");

        dispatcher.push("    end");
    });

    dispatcher.push("end");

    return dispatcher.join("\n");
}

// ------------------------------------------------------------
// MODULE 3: Junk node injection (light extra junk)
// ------------------------------------------------------------
function injectJunkNodes(code) {
    let lines = code.split("\n");
    let out = [];
    for (let i = 0; i < lines.length; i++) {
        out.push(lines[i]);
        // random chance to insert extra junk line
        if (Math.random() < 0.4) {
            out.push(generateJunkLua());
        }
    }
    return out.join("\n");
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

// ------------------------------------------------------------
// VM Mode wrapper (Module: VM)
// ------------------------------------------------------------
function wrapInVM(code) {
    let bytes = [];
    for (let i = 0; i < code.length; i++) {
        bytes.push(code.charCodeAt(i));
    }

    let lua = [];
    lua.push("local _RF_VM = {" + bytes.join(",") + "}");
    lua.push("local function _RF_VM_RUN(t)");
    lua.push("    local s = {}");
    lua.push("    for i = 1, #t do");
    lua.push("        s[i] = string.char(t[i])");
    lua.push("    end");
    lua.push("    local chunk = table.concat(s)");
    lua.push("    return loadstring(chunk)()");
    lua.push("end");
    lua.push("");
    lua.push("_RF_VM_RUN(_RF_VM)");

    return lua.join("\n");
}

// ------------------------------------------------------------
// Anti-debug / anti-tamper header generators
// ------------------------------------------------------------
function buildAntiDebugHeader() {
    return [
        "local function _RF_ANTIDEBUG()",
        "    local ok, dbg = pcall(function() return debug end)",
        "    if ok and dbg and dbg.getinfo then",
        "        error('RedFox: debugger detected', 0)",
        "    end",
        "    if hookfunction ~= nil then",
        "        error('RedFox: hookfunction detected', 0)",
        "    end",
        "end",
        "pcall(_RF_ANTIDEBUG)",
        ""
    ].join("\n");
}

function buildAntiTamperHeader(expectedHexLen) {
    // We check the length of 'data' string after it's assigned
    // So this header will be used INSIDE the wrapper, not here.
    // We'll embed expectedHexLen into the wrapper.
    return expectedHexLen; // just pass through; wrapper uses this value
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

        // 2) INSANE control-flow flattening
        if (opts.controlFlowFlatten) {
            code = controlFlowFlattenInsane(code);
        }

        // 3) Junk node injection
        if (opts.junkNodes) {
            code = injectJunkNodes(code);
        }

        // 4) String encryption
        if (opts.stringEncrypt) {
            code = encryptStrings(code);
        }

        // 5) VM mode
        if (opts.vmMode) {
            code = wrapInVM(code);
        }

        // 6) Build Lua pre-header for anti-debug (outside of hex wrapper)
        let luaPayload = code;

        // (anti-debug / anti-tamper will be handled in wrapper phase)
        // At this level, luaPayload is the script we want to run after decode.

        // 7) Hex encode final Lua payload
        var hex = "";
        for (var i = 0; i < luaPayload.length; i++) {
            hex += luaPayload.charCodeAt(i).toString(16).padStart(2, "0");
        }

        var expectedHexLen = hex.length;

        var layers =
            (opts.variableRename ? 1 : 0) +
            (opts.stringEncrypt ? 1 : 0) +
            (opts.controlFlowFlatten ? 1 : 0) +
            (opts.vmMode ? 1 : 0) +
            (opts.junkNodes ? 1 : 0) +
            (opts.antiDebug ? 1 : 0) +
            (opts.antiTamper ? 1 : 0);

        // 8) Build outer wrapper
        var wrapped = `
-- RedFox Hybrid Engine
local function _RF_DEC(b,k)
    local out = ""
    for num in string.gmatch(b, "%d+") do
        out = out .. string.char(tonumber(num) ~ k)
    end
    return out
end

local data = "${hex}"
local out = ""

-- Anti-tamper: length check
${opts.antiTamper ? ("do if #data ~= " + expectedHexLen + " then error('RedFox: tamper detected', 0) end end") : ""}

-- Decode hex payload
for i = 1, #data, 2 do
    local byte = tonumber(data:sub(i, i+1), 16)
    out = out .. string.char(byte)
end

-- Optional anti-debug inside runtime
${opts.antiDebug ? buildAntiDebugHeader() : ""}

return loadstring(out)()
`;

        return {
            output: wrapped,
            hexLength: hex.length,
            layers: layers
        };
    }
};
