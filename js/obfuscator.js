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
// MODULE 1: AST-ASSISTED VARIABLE RENAMER (SAFE)
//  - Uses luaparse to find LOCAL identifiers
//  - Only renames locals (node.isLocal === true)
//  - NEVER renames inside strings / comments
// ============================================================
function renameVariables(code) {
    if (typeof luaparse === "undefined") {
        console.warn("[RedFox] luaparse not found, skipping AST rename.");
        return code;
    }

    var mapping = Object.create(null);

    // Names we never want to touch
    var skip = new Set([
        "game","workspace","script","self",
        "math","table","string","coroutine","debug","task","os",
        "pairs","ipairs","print","warn","error","pcall","xpcall",
        "_G","shared","Enum","Vector3","CFrame","Instance",
        "tick","time","wait","spawn","delay",
        "_RF_DEC","_RF_VM_RUN","_RF_VM","_RF_ANTIDEBUG"
    ]);

    // Common Roblox service / API names – keep ultra-safe
    [
        "Players","ReplicatedStorage","ServerStorage","Lighting","StarterGui",
        "StarterPlayer","TweenService","RunService","UserInputService",
        "ContextActionService","SoundService","Teams","HttpService",
        "TeleportService","MarketplaceService","CollectionService",
        "LocalPlayer","Character","Humanoid","HumanoidRootPart"
    ].forEach(function (s) { skip.add(s); });

    function addName(name) {
        if (!name) return;
        if (skip.has(name)) return;
        if (name.startsWith("_RF_")) return;
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return;
        if (!mapping[name]) {
            mapping[name] = rfRandomIdent(8);
        }
    }

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

        // If this identifier is used as a property (foo.Bar), NEVER rename that name
        if (node.type === "MemberExpression" &&
            node.identifier &&
            node.identifier.type === "Identifier") {

            var propName = node.identifier.name;
            if (!skip.has(propName)) {
                skip.add(propName);
                if (mapping[propName]) {
                    delete mapping[propName];
                }
            }
        }

        // Protect GetService("ServiceName") names too
        if (node.type === "CallExpression" &&
            node.base &&
            node.base.type === "MemberExpression" &&
            node.base.identifier &&
            node.base.identifier.name === "GetService" &&
            Array.isArray(node.arguments)) {

            node.arguments.forEach(function (arg) {
                if (arg && arg.type === "StringLiteral") {
                    skip.add(arg.value);
                    if (mapping[arg.value]) delete mapping[arg.value];
                }
            });
        }

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

    function escapeReg(s) {
        return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    }

    var pattern = new RegExp("\\b(" + allNames.map(escapeReg).join("|") + ")\\b", "g");

    // Only apply mapping in real code, not strings/comments
    function applyMapping(text) {
        return text.replace(pattern, function (full, name) {
            return mapping[name] || full;
        });
    }

    var result = "";
    var last = 0;
    var i = 0;

    while (i < code.length) {
        var ch = code[i];

        // comments: --
        if (ch === "-" && code[i + 1] === "-") {
            result += applyMapping(code.slice(last, i));

            var j = i + 2;
            var isLong = (code[i + 2] === "[" && code[i + 3] === "[");
            if (isLong) {
                j = code.indexOf("]]", i + 4);
                if (j === -1) { result += code.slice(i); return result; }
                j += 2;
            } else {
                while (j < code.length && code[j] !== "\n") j++;
            }

            result += code.slice(i, j);
            i = j;
            last = i;
            continue;
        }

        // long string [[ ... ]]
        if (ch === "[" && code[i + 1] === "[") {
            result += applyMapping(code.slice(last, i));

            var j2 = code.indexOf("]]", i + 2);
            if (j2 === -1) { result += code.slice(i); return result; }
            j2 += 2;

            result += code.slice(i, j2);
            i = j2;
            last = i;
            continue;
        }

        // '...' or "..."
        if (ch === '"' || ch === "'") {
            result += applyMapping(code.slice(last, i));

            var quote = ch;
            var j3 = i + 1;
            while (j3 < code.length) {
                if (code[j3] === "\\" && j3 + 1 < code.length) {
                    j3 += 2;
                    continue;
                }
                if (code[j3] === quote) {
                    j3++;
                    break;
                }
                j3++;
            }

            result += code.slice(i, j3);
            i = j3;
            last = i;
            continue;
        }

        i++;
    }

    result += applyMapping(code.slice(last));
    return result;
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
    let v = rfRandomIdent(5);

    let junk = [
        `do local ${v} = ${r1} end`,
        `do local ${v} = ${r2}*${r3} end`,
        `do local ${v} = "${r1}.${r2}.${r3}" end`,
        `do for _=1,1 do local ${v}=${r3} end end`,
        `do if ${opaquePredicate()} then local ${v} = ${r1} end end`,
    ];

    return junk[Math.floor(Math.random() * junk.length)];
}

// ============================================================
// MODULE 2: INSANE CONTROL FLOW FLATTENING (STATE MACHINE)
// ============================================================
function controlFlowFlattenInsane(code) {

    // split into logical code blocks instead of single lines
    let blocks = code
        .replace(/\r\n/g, "\n")
        .split(/\n+/)
        .map(l => l.trim())
        .filter(l => l.length > 0);

    let flat = [];
    let state = 0;

    flat.push("local _STATE = 0");
    flat.push("while true do");

    for (let i = 0; i < blocks.length; i++) {
        flat.push(`    if _STATE == ${state} then`);
        flat.push(`        ${blocks[i]}`);
        state++;
        flat.push(`        _STATE = ${state}`);
        flat.push("    end");
    }

    flat.push(`    if _STATE == ${state} then break end`);
    flat.push("end");

    return flat.join("\n");
}
// ============================================================
// MODULE 3: Extra Junk Node Injection
// ============================================================
function injectJunkNodes(code) {
    let lines = code.split("\n");
    let out = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        out.push(line);

        // don't inject before / after empty lines
        if (trimmed.length === 0) continue;

        const next = lines[i + 1] || "";
        const nextTrim = next.trim();

        // NEVER inject:
        //  - after lines ending with '.' or ':'  (chained calls, labels)
        //  - before lines starting with '.' or ')'  (method chains/ends)
        //  - inside "end", "else", "elseif" lines
        const badAfter =
            trimmed.endsWith(".") ||
            trimmed.endsWith(":") ||
            trimmed === "end" ||
            trimmed.startsWith("else") ||
            nextTrim.startsWith(".") ||
            nextTrim.startsWith(")");

        if (badAfter) continue;

        if (Math.random() < 0.5) {
            out.push(generateJunkLua());
        }
    }

    return out.join("\n");
}

// ============================================================
// STRING ENCRYPTION USING _RF_DEC (XOR)
//  (NOTE: _RF_DEC MUST BE GLOBAL IN THE WRAPPER)
// ============================================================
function encryptStrings(code) {
    return code.replace(/"(.-)"/g, function (_, str, offset, full) {

        // DO NOT encrypt strings inside GetService("...")
        var before = full.slice(Math.max(0, offset - 30), offset);
        if (before.includes("GetService(")) {
            return "\"" + str + "\"";
        }

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

    // normalize Lua payload so that byte offsets are consistent
    code = code.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // convert each character to its UTF-8 byte
    let encoder = new TextEncoder();
    let bytes = Array.from(encoder.encode(code));

    let lua = [];
    lua.push("local _RF_VM = {" + bytes.join(",") + "}");
    lua.push("local function _RF_VM_RUN(t)");
    lua.push("    local buf = table.create(#t)");
    lua.push("    for i = 1, #t do");
    lua.push("        buf[i] = string.char(t[i])");
    lua.push("    end");
    lua.push("    local chunk = table.concat(buf)");
    lua.push("    return loadstring(chunk)()");
    lua.push("end");
    lua.push("_RF_VM_RUN(_RF_VM)");

    return lua.join(\"\\n\");
}
// ============================================================
// ROBLOX-FOCUSED ANTI-DEBUG HEADER
// ============================================================
function buildAntiDebugHeaderRoblox() {
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
            (opts.vmMode ? 2 : 0) +
            (opts.junkNodes ? 1 : 0) +
            (opts.antiDebug ? 1 : 0) +
            (opts.antiTamper ? 1 : 0);

        var antiDebugChunk = opts.antiDebug ? buildAntiDebugHeaderRoblox() : "";

        var wrapped = `
-- RedFox Hybrid Engine
function _RF_DEC(b,k)
    local out = ""
    for num in string.gmatch(b, "%d+") do
        local n = tonumber(num)
        out = out .. string.char(bit32.bxor(n, k))
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

        // Banner on its own line, everything else as one line
        var lines = wrapped.split("\n");
        var banner = "";
        var bodyLines = [];
        for (var li = 0; li < lines.length; li++) {
            var line = lines[li];
            if (banner === "" && line.trim().length > 0) {
                banner = line.trim();
            } else {
                bodyLines.push(line);
            }
        }

        var bodySingle = bodyLines
            .map(function (l) { return l.replace(/\s+/g, " ").trim(); })
            .filter(function (l) { return l.length > 0; })
            .join(" ");

        wrapped = banner + "\n" + bodySingle;

        return {
            output: wrapped,
            hexLength: hex.length,
            layers: layers
        };
    }
};
