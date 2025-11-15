console.log("RedFox Obfuscator Loaded.");

// ============================================================
// HELPER: Random identifier (lIIIIIIIll style)
// ============================================================
function rfRandomIdent(len) {
    // all confusion chars: l, I, 1
    var chars = "lI1";
    var out = "l"; // start with a 'l'
    for (var i = 0; i < len; i++) {
        out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // end with "ll" to get lIIIIIIIll vibe
    out += "ll";
    return "_" + out;
}

// ============================================================
// MODULE 1: AST-ASSISTED VARIABLE RENAMER
//  - Uses luaparse (if available) to find LOCAL identifiers
//  - Only renames locals (node.isLocal === true)
//  - Then does text replacement on those names
// ============================================================
function renameVariables(code) {
    // Require luaparse global
    if (typeof luaparse === "undefined") {
        console.warn("[RedFox] luaparse not found, skipping AST rename.");
        return code;
    }

    var mapping = Object.create(null);

    // Globals / names we DO NOT want to mess with
    var skip = new Set([
        "game","workspace","script","self",
        "math","table","string","coroutine","debug","task","os",
        "pairs","ipairs","print","warn","error","pcall","xpcall",
        "_G","shared","Enum","Vector3","CFrame","Instance",
        "tick","time","wait","spawn","delay",
        "_RF_DEC","_RF_VM_RUN","_RF_VM","_RF_ANTIDEBUG"
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

    // Parse with scope tracking
    var ast;
    try {
        ast = luaparse.parse(code, {
            luaVersion: "5.1",
            locations: false,
            ranges: false,
            comments: false,
            scope: true
        });
    } catch (e) {
        console.warn("[RedFox] AST parse failed, skipping rename:", e);
        return code;
    }

    function walk(node) {
        if (!node || typeof node !== "object") return;
        if (node.type === "Identifier" && node.isLocal) {
            addName(node.name);
        }
        for (var key in node) {
            if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
            var child = node[key];
            if (!child) continue;
            if (Array.isArray(child)) {
                for (var i = 0; i < child.length; i++) {
                    if (child[i] && typeof child[i] === "object") walk(child[i]);
                }
            } else if (child && typeof child === "object" && typeof child.type === "string") {
                walk(child);
            }
        }
    }

    walk(ast);

    var allNames = Object.keys(mapping);
    if (!allNames.length) return code;

    // Build a single regex: \b(name1|name2|...)\b
    function escapeReg(s) {
        return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    }

    var pattern = new RegExp("\\b(" + allNames.map(escapeReg).join("|") + ")\\b", "g");

    var renamed = code.replace(pattern, function (full, name) {
        return mapping[name] || full;
    });

    return renamed;
}

// ============================================================
// HELPERS (Junk, shuffle, opaque predicates)
// ============================================================
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

// UPGRADED OPAQUE PREDICATE: more complex but always true.
function opaquePredicate() {
    let a = Math.floor(Math.random() * 50) + 10;
    let b = Math.floor(Math.random() * 50) + 5;
    let c = a + b;
    let d = a * b;
    // Always true, but messy.
    return `((( ${a} + ${b} ) == ${c}) and ( ( ${a} * ${b} ) == ${d}) and ( ( ${a} * ${a} ) + ( ${b} * ${b} ) > ${a} ))`;
}

// SUPER JUNK generation
function generateJunkLua() {
    let r1 = Math.floor(Math.random() * 9999);
    let r2 = Math.floor(Math.random() * 9999);
    let r3 = Math.floor(Math.random() * 9999);

    let junk = [
        "local _x = (" + r1 + ")",
        "for _i=1,1 do end",
        "do local z = " + r2 + " end",
        "if (" + opaquePredicate() + ") then local q=" + r3 + " end",
        "local _t = tostring(" + Math.random() + ")",
        "local _ = " + r1,
        // fake function
        "local function " + rfRandomIdent(6) + "() return " + r2 + " end",
        // fake table
        "local " + rfRandomIdent(5) + " = { " + r1 + ", " + r2 + ", " + r3 + " }",
        // fake metatable
        "setmetatable({}, {__index = function() return " + r3 + " end})",
        // fake closure
        "do local a=" + r1 + "; local function " + rfRandomIdent(4) + "() return a end end"
    ];
    return junk[Math.floor(Math.random() * junk.length)];
}

// ============================================================
// MODULE 2: INSANE CONTROL FLOW FLATTENING (STATE MACHINE)
// ============================================================
function controlFlowFlattenInsane(code) {
    let lines = code.split(/[\r\n]+/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return code;

    let blocks = [];
    for (let i = 0; i < lines.length; i++) {
        blocks.push({
            id: i,
            code: lines[i],
            real: true
        });
    }

    let junkCount = Math.floor(lines.length * 1.5) + 10;
    for (let j = 0; j < junkCount; j++) {
        blocks.push({
            id: "junk" + j,
            code: generateJunkLua(),
            real: false
        });
    }

    shuffleArray(blocks);

    let dispatcher = [];
    dispatcher.push("local _STATE = \"" + blocks[0].id + "\"");
    dispatcher.push("while true do");

    blocks.forEach((b, idx) => {
        dispatcher.push("    if _STATE == \"" + b.id + "\" then");
        dispatcher.push("        if ((" + opaquePredicate() + ")) then");
        dispatcher.push("            " + b.code);
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

// ============================================================
// MODULE 3: Extra Junk Node Injection
// ============================================================
function injectJunkNodes(code) {
    let lines = code.split("\n");
    let out = [];
    for (let i = 0; i < lines.length; i++) {
        out.push(lines[i]);
        if (Math.random() < 0.5) { // extra aggressive
            out.push(generateJunkLua());
        }
    }
    return out.join("\n");
}

// ============================================================
// STRING ENCRYPTION USING _RF_DEC (XOR)
// ============================================================
function encryptStrings(code) {
    return code.replace(/"(.-)"/g, function(_, str) {
        var key = Math.floor(Math.random() * 200) + 30;
        var bytes = [];
        for (var i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i) ^ key);
        }
        return '(_RF_DEC("' + bytes.join(",") + '",' + key + "))";
    });
}

// ============================================================
// DEEP VM WRAPPER (virtual layer)
// ============================================================
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

// ============================================================
// ROBLOX-FOCUSED ANTI-DEBUG HEADER
// ============================================================
function buildAntiDebugHeaderRoblox() {
    // This returns a Lua string; minified later.
    return [
        "local function _RF_ANTIDEBUG()",
        "    local ok_dbg, dbg = pcall(function() return debug end)",
        "    if ok_dbg and dbg and dbg.getinfo then",
        "        local info = dbg.getinfo(2)",
        "        if info and info.what == 'Lua' then error('RedFox: debugger detected', 0) end",
        "    end",
        "    local ok_genv, ggv = pcall(function() return getgenv end)",
        "    if ok_genv and type(ggv) == 'function' then",
        "        error('RedFox: exploit env detected', 0)",
        "    end",
        "    local suspicious = {'getrenv','getgc','getreg','getupvalues','hookfunction'}",
        "    local env = getfenv and getfenv(0) or _G",
        "    for _, name in ipairs(suspicious) do",
        "        local ok2, fn = pcall(function() return env[name] end)",
        "        if ok2 and type(fn) == 'function' then",
        "            error('RedFox: exploit API detected', 0)",
        "        end",
        "    end",
        "end",
        "task.spawn(function()",
        "    while true do",
        "        pcall(_RF_ANTIDEBUG)",
        "        task.wait(5)",
        "    end",
        "end)",
        ""
    ].join("\n");
}

// ============================================================
// MAIN OBFUSCATOR INTERFACE
// ============================================================
window.RedFoxObfuscator = {
    obfuscate: function (code, opts) {

        // 1) AST variable renaming
        if (opts.variableRename) {
            code = renameVariables(code);
        }

        // 2) INSANE control-flow flattening
        if (opts.controlFlowFlatten) {
            code = controlFlowFlattenInsane(code);
        }

        // 3) Super junk injection
        if (opts.junkNodes) {
            code = injectJunkNodes(code);
        }

        // 4) String encryption
        if (opts.stringEncrypt) {
            code = encryptStrings(code);
        }

        // 5) Deep VM + Multilayer
        if (opts.vmMode) {
            // If also flattened & junk: multilayer VM
            if (opts.controlFlowFlatten && opts.junkNodes) {
                code = wrapInVM(code);
                code = wrapInVM(code); // double layer
            } else {
                code = wrapInVM(code);
            }
        }

        // This is the Lua payload we want to hex-encode
        let luaPayload = code;

        // 6) Hex encode payload
        var hex = "";
        for (var i = 0; i < luaPayload.length; i++) {
            hex += luaPayload.charCodeAt(i).toString(16).padStart(2, "0");
        }
        var expectedHexLen = hex.length;

        var layers =
            (opts.variableRename ? 1 : 0) +
            (opts.stringEncrypt ? 1 : 0) +
            (opts.controlFlowFlatten ? 1 : 0) +
            (opts.vmMode ? 2 : 0) + // count multilayer as extra
            (opts.junkNodes ? 1 : 0) +
            (opts.antiDebug ? 1 : 0) +
            (opts.antiTamper ? 1 : 0);

        // 7) Build anti-debug header string if enabled
        var antiDebugChunk = opts.antiDebug ? buildAntiDebugHeaderRoblox() : "";

        // 8) Build outer wrapper (multi-line first)
      var wrapped = `
--[[ RedFox Hybrid Engine ]]
local function _RF_DEC(b,k)
    local out = ""
    for num in string.gmatch(b, "%d+") do
        out = out .. string.char(tonumber(num) ~ k)
    end
    return out
end

local data = "${hex}"
local out = ""

${opts.antiTamper ? ("do if #data ~= " + expectedHexLen + " then error('RedFox: tamper detected', 0) end end") : ""}

for i = 1, #data, 2 do
    local byte = tonumber(data:sub(i, i+1), 16)
    out = out .. string.char(byte)
end

${antiDebugChunk}

return loadstring(out)()
`;


        // 9) SINGLE-LINE OUTPUT
        wrapped = wrapped
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(l => {
        if (l.startsWith("--")) return "--[[" + l.slice(2).trim() + "]]";
        return l;
    })
    .join(" ");



        return {
            output: wrapped,
            hexLength: hex.length,
            layers: layers
        };
    }
};
