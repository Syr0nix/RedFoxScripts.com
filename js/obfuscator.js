// js/obfuscator.js
(function (global) {
    "use strict";

    console.log("RedFox HYBRID Obfuscator Loaded");

    // =========================
    //   Helper functions
    // =========================

    function randomIdent(len) {
        var chars = "lI1O0";
        var out = "_";
        for (var i = 0; i < len; i++) {
            out += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return out;
    }

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function generateKey(len) {
        var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var out = "";
        for (var i = 0; i < len; i++) {
            out += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return out;
    }

    function checksum(str) {
        var h = 0;
        for (var i = 0; i < str.length; i++) {
            h = (h + str.charCodeAt(i) * (i + 17)) % 2147483647;
        }
        return h;
    }

    function toHexXor(str, key) {
        var keyLen = key.length;
        var hex = "";
        for (var i = 0; i < str.length; i++) {
            var b = str.charCodeAt(i);
            var kb = key.charCodeAt(i % keyLen);
            var x = b ^ kb;
            var h = x.toString(16).toUpperCase();
            if (h.length < 2) h = "0" + h;
            hex += h;
        }
        return hex;
    }

    function escapeLuaString(s) {
        return s
            .replace(/\\/g, "\\\\")
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n")
            .replace(/"/g, '\\"');
    }

    // =========================
    //   VM LAYER (inner)
    // =========================
    // Simple bytecode "VM": encodes script bytes with XOR key,
    // decodes in Lua and executes via loadstring.

    function buildVMLayer(source, opts) {
        source = String(source);
        var xorKey = randomInt(1, 255);
        var bytes = [];
        for (var i = 0; i < source.length; i++) {
            var b = source.charCodeAt(i) ^ xorKey;
            bytes.push(b);
        }

        var tblLiteral = "{" + bytes.join(",") + "}";

        // random identifiers (if variableRename enabled)
        var useRen = opts.variableRename !== false;
        var tblVar   = useRen ? randomIdent(9) : "rfBytes";
        var keyVar   = useRen ? randomIdent(7) : "rfK";
        var tmpVar   = useRen ? randomIdent(8) : "rfTmp";
        var bufVar   = useRen ? randomIdent(9) : "rfBuf";
        var srcVar   = useRen ? randomIdent(9) : "rfSrc";
        var fnVar    = useRen ? randomIdent(9) : "rfFn";
        var errVar   = useRen ? randomIdent(9) : "rfErr";

        var lua = "";
        lua += "-- RedFox VM layer\n";
        lua += "local " + keyVar + " = " + xorKey + "\n";
        lua += "local " + tblVar + " = " + tblLiteral + "\n";
        lua += "for i = 1, #" + tblVar + " do\n";
        lua += "    " + tblVar + "[i] = bit32.bxor(" + tblVar + "[i], " + keyVar + ")\n";
        lua += "end\n";
        lua += "local " + bufVar + " = {}\n";
        lua += "for i = 1, #" + tblVar + " do\n";
        lua += "    " + bufVar + "[i] = string.char(" + tblVar + "[i])\n";
        lua += "end\n";
        lua += "local " + srcVar + " = table.concat(" + bufVar + ")\n";
        lua += "local " + fnVar + ", " + errVar + " = loadstring(" + srcVar + ")\n";
        lua += "if not " + fnVar + " then error(" + errVar + ", 0) end\n";
        lua += "return " + fnVar + "()\n";

        return {
            lua: lua,
            byteCount: bytes.length
        };
    }

    // =========================
    //   Outer encrypted loader
    // =========================

    function buildOuterLoader(source, opts) {
        opts = opts || {};
        var useRen   = opts.variableRename      !== false;
        var useEnc   = opts.stringEncrypt       !== false;
        var useCF    = opts.controlFlowFlatten  === true;
        var useJunk  = opts.junkNodes           !== false;
        var useAntiD = opts.antiDebug           !== false;
        var useAntiT = opts.antiTamper          !== false;

        var payload = String(source);

        var keyStr = useEnc ? generateKey(16) : null;
        var hexStr = useEnc ? toHexXor(payload, keyStr) : null;
        var chk    = useEnc ? checksum(hexStr) : checksum(payload);

        // identifiers
        var keyVar   = useRen ? randomIdent(9)  : "rfKey";
        var hexVar   = useRen ? randomIdent(9)  : "rfHex";
        var srcVar   = useRen ? randomIdent(9)  : "rfSrc";
        var fnVar    = useRen ? randomIdent(9)  : "rfFn";
        var errVar   = useRen ? randomIdent(9)  : "rfErr";
        var chkVar   = useRen ? randomIdent(9)  : "rfChk";
        var decFn    = useRen ? randomIdent(10) : "rfDecode";
        var antiFn   = useRen ? randomIdent(10) : "rfAnti";
        var mainFn   = useRen ? randomIdent(10) : "rfMain";
        var stateVar = useRen ? randomIdent(8)  : "rfState";

        var lua = "";

        // header
        lua += "-- Obfuscated with RedFox HYBRID Luau Obfuscator\n";
        lua += "-- https://redfoxscripts.com\n\n";

        // junk locals
        if (useJunk) {
            var junkCount = randomInt(3, 7);
            for (var i = 0; i < junkCount; i++) {
                var jn = useRen ? randomIdent(8) : ("rfJ" + i);
                lua += "local " + jn + " = " + randomInt(0, 999999) + "\n";
                if (Math.random() < 0.6) {
                    lua += "if " + jn + " == " + randomInt(0, 999999) +
                           " then " + jn + " = " + randomInt(0, 999999) + " end\n";
                }
            }
            lua += "\n";
        }

        // anti-debug
        if (useAntiD) {
            var tVar = useRen ? randomIdent(7) : "rfT";
            lua += "task.spawn(function()\n";
            lua += "    local " + tVar + " = os.clock()\n";
            lua += "    while task.wait(0.5) do\n";
            lua += "        local now = os.clock()\n";
            lua += "        if (now - " + tVar + ") > 1.5 then\n";
            lua += "            getfenv(0).game = nil\n";
            lua += "            error('RedFox: debugger detected', 0)\n";
            lua += "        end\n";
            lua += "        " + tVar + " = now\n";
            lua += "    end\n";
            lua += "end)\n\n";
        }

        // tamper
        if (useAntiT) {
            lua += "local " + chkVar + " = " + chk + "\n";
        }

        if (useEnc) {
            lua += "local " + keyVar + " = \"" + keyStr + "\"\n";
            lua += "local " + hexVar + " = \"" + hexStr + "\"\n";
        } else {
            lua += "local " + srcVar + " = \"" + escapeLuaString(payload) + "\"\n";
        }
        lua += "\n";

        // decoder
        if (useEnc) {
            lua += "local function " + decFn + "(hex, k)\n";
            lua += "    local out = {}\n";
            lua += "    local keyLen = #k\n";
            lua += "    local j = 1\n";
            lua += "    for i = 1, #hex, 2 do\n";
            lua += "        local byte = tonumber(hex:sub(i, i+1), 16)\n";
            lua += "        local kbyte = k:byte(((j - 1) % keyLen) + 1)\n";
            lua += "        out[#out + 1] = string.char(bit32.bxor(byte, kbyte))\n";
            lua += "        j = j + 1\n";
            lua += "    end\n";
            lua += "    return table.concat(out)\n";
            lua += "end\n\n";
        }

        // anti-tamper function
        if (useAntiT) {
            lua += "local function " + antiFn + "()\n";
            lua += "    local h = 0\n";
            lua += "    local s = " + (useEnc ? hexVar : srcVar) + "\n";
            lua += "    for i = 1, #s do\n";
            lua += "        h = (h + s:byte(i) * (i + 17)) % 2147483647\n";
            lua += "    end\n";
            lua += "    if h ~= " + chkVar + " then\n";
            lua += "        error('RedFox: tamper detected', 0)\n";
            lua += "    end\n";
            lua += "end\n\n";
        }

        // REGULAR FLOW or CONTROL-FLOW FLATTENED
        if (!useCF) {
            lua += "local function " + mainFn + "()\n";
            if (useAntiT) {
                lua += "    " + antiFn + "()\n";
            }
            if (useEnc) {
                lua += "    local " + srcVar + " = " + decFn + "(" + hexVar + ", " + keyVar + ")\n";
            }
            lua += "    local " + fnVar + ", " + errVar + " = loadstring(" + srcVar + ")\n";
            lua += "    if not " + fnVar + " then error(" + errVar + ", 0) end\n";
            lua += "    return " + fnVar + "()\n";
            lua += "end\n\n";
            lua += "return " + mainFn + "()\n";
        } else {
            // flattened state machine
            lua += "local " + srcVar + " = nil\n";
            lua += "local " + fnVar + ", " + errVar + " = nil, nil\n";
            lua += "local " + stateVar + " = 0\n";
            lua += "while true do\n";
            lua += "    if " + stateVar + " == 0 then\n";
            if (useAntiT) {
                lua += "        " + antiFn + "()\n";
            }
            if (useEnc) {
                lua += "        " + srcVar + " = " + decFn + "(" + hexVar + ", " + keyVar + ")\n";
            }
            lua += "        " + stateVar + " = 1\n";
            lua += "    elseif " + stateVar + " == 1 then\n";
            lua += "        " + fnVar + ", " + errVar + " = loadstring(" + srcVar + ")\n";
            lua += "        if not " + fnVar + " then error(" + errVar + ", 0) end\n";
            lua += "        " + stateVar + " = 2\n";
            lua += "    elseif " + stateVar + " == 2 then\n";
            lua += "        return " + fnVar + "()\n";
            lua += "    end\n";
            lua += "end\n";
        }

        return {
            lua: lua,
            hexLength: useEnc ? hexStr.length : 0
        };
    }

    // =========================
    //   Public API: HYBRID OBF
    // =========================

    function obfuscate(code, userOptions) {
        var opts = userOptions || {};

        // defaults
        if (typeof opts.variableRename      === "undefined") opts.variableRename      = true;
        if (typeof opts.stringEncrypt       === "undefined") opts.stringEncrypt       = true;
        if (typeof opts.controlFlowFlatten  === "undefined") opts.controlFlowFlatten  = true;
        if (typeof opts.vmMode              === "undefined") opts.vmMode              = true;
        if (typeof opts.junkNodes           === "undefined") opts.junkNodes           = true;
        if (typeof opts.antiDebug           === "undefined") opts.antiDebug           = true;
        if (typeof opts.antiTamper          === "undefined") opts.antiTamper          = true;

        var original = String(code);

        var vmLayerSource = original;
        var vmStats = null;

        // inner VM layer
        if (opts.vmMode) {
            vmStats = buildVMLayer(original, opts);
            vmLayerSource = vmStats.lua;
        }

        // outer loader
        var outer = buildOuterLoader(vmLayerSource, opts);

        var layers = opts.vmMode ? 2 : 1;
        var hexLen = outer.hexLength;

        return {
            output: outer.lua,
            hexLength: hexLen,
            layers: layers,
            vmBytes: vmStats ? vmStats.byteCount : 0,
            sourceLength: original.length
        };
    }

    global.RedFoxObfuscator = {
        obfuscate: obfuscate
    };

})(window);
