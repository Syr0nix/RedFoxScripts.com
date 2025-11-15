// js/obfuscator.js
;(function (global) {
    "use strict";

    // ======== helpers ========

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

    function checksum(str) {
        var h = 0;
        for (var i = 0; i < str.length; i++) {
            h = (h + str.charCodeAt(i) * (i + 17)) % 2147483647;
        }
        return h;
    }

    function generateKey(len) {
        var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var out = "";
        for (var i = 0; i < len; i++) {
            out += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return out;
    }

    function toHexXor(str, key) {
        var keyLen = key.length;
        var hex = "";

        for (var i = 0; i < str.length; i++) {
            var byte = str.charCodeAt(i);
            var kbyte = key.charCodeAt(i % keyLen);
            var x = byte ^ kbyte;
            var h = x.toString(16).toUpperCase();
            if (h.length < 2) h = "0" + h;
            hex += h;
        }

        return hex;
    }

    function escapeLuaString(s) {
        return s
            .replace(/\\/g, "\\\\")
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/'/g, "\\'");
    }

    // ======== Lua loader builder ========

    function buildLoaderLua(source, opts) {
        opts = opts || {};

        var useEncrypt = opts.stringEncrypt !== false; // default true
        var key = generateKey(16);
        var hex = useEncrypt ? toHexXor(source, key) : null;
        var chksum = useEncrypt ? checksum(hex) : checksum(source);

        // random identifiers (variable "renaming" inside the loader)
        var keyVar   = opts.variableRename ? randomIdent(9)  : "rfKey";
        var hexVar   = opts.variableRename ? randomIdent(9)  : "rfHex";
        var srcVar   = opts.variableRename ? randomIdent(9)  : "rfSrc";
        var funVar   = opts.variableRename ? randomIdent(9)  : "rfFn";
        var errVar   = opts.variableRename ? randomIdent(9)  : "rfErr";
        var chkVar   = opts.variableRename ? randomIdent(9)  : "rfChk";
        var decFn    = opts.variableRename ? randomIdent(10) : "rfDecode";
        var antiFn   = opts.variableRename ? randomIdent(10) : "rfAnti";
        var mainFn   = opts.variableRename ? randomIdent(10) : "rfMain";
        var stateVar = opts.variableRename ? randomIdent(7)  : "rfState";

        var junk = "";
        if (opts.junkNodes) {
            for (var i = 0; i < 6; i++) {
                var jn = randomIdent(8);
                junk += "local " + jn + " = " + randomInt(0, 999999) + "\n";
                if (Math.random() < 0.5) {
                    junk += "if " + jn + " == " + randomInt(0, 999999) + " then " +
                            jn + " = " + randomInt(0, 999999) + " end\n";
                }
            }
        }

        var antiDebugCode = "";
        if (opts.antiDebug) {
            var tVar = opts.variableRename ? randomIdent(7) : "rfT";
            antiDebugCode = ""
                + "task.spawn(function()\n"
                + "    local " + tVar + " = os.clock()\n"
                + "    while task.wait(0.5) do\n"
                + "        local now = os.clock()\n"
                + "        if (now - " + tVar + ") > 1.5 then\n"
                + "            getfenv(0).game = nil\n"
                + "            error('RedFox: debugger detected', 0)\n"
                + "        end\n"
                + "        " + tVar + " = now\n"
                + "    end\n"
                + "end)\n\n";
        }

        var antiTamperCode = "";
        if (opts.antiTamper) {
            antiTamperCode = ""
                + "local function " + antiFn + "()\n"
                + "    local h = 0\n"
                + "    local s = " + (useEncrypt ? hexVar : srcVar) + "\n"
                + "    for i = 1, #s do\n"
                + "        h = (h + s:byte(i) * (i + 17)) % 2147483647\n"
                + "    end\n"
                + "    if h ~= " + chkVar + " then\n"
                + "        error('RedFox: tamper detected', 0)\n"
                + "    end\n"
                + "end\n\n";
        } else {
            antiFn = null;
        }

        var decoderCode = "";
        if (useEncrypt) {
            decoderCode =
                "local function " + decFn + "(hex, k)\n" +
                "    local out = {}\n" +
                "    local keyLen = #k\n" +
                "    local j = 1\n" +
                "    for i = 1, #hex, 2 do\n" +
                "        local byte = tonumber(hex:sub(i, i + 1), 16)\n" +
                "        local kbyte = k:byte(((j - 1) % keyLen) + 1)\n" +
                "        out[#out + 1] = string.char(bit32.bxor(byte, kbyte))\n" +
                "        j = j + 1\n" +
                "    end\n" +
                "    return table.concat(out)\n" +
                "end\n\n";
        }

        var header =
            "-- Obfuscated with RedFox Luau Obfuscator\n" +
            "-- https://redfoxscripts.com\n\n" +
            junk +
            antiDebugCode +
            "local " + chkVar + " = " + chksum + "\n";

        if (useEncrypt) {
            header += "local " + keyVar + " = '" + key + "'\n" +
                      "local " + hexVar + " = '" + hex + "'\n";
        } else {
            header += "local " + srcVar + " = '" + escapeLuaString(source) + "'\n";
        }
        header += "\n";

        var body = "";
        body += decoderCode;
        body += antiTamperCode || "";

        var cfFlatten = !!opts.controlFlowFlatten;

        if (!cfFlatten) {
            body += "local function " + mainFn + "()\n";
            if (antiFn) body += "    " + antiFn + "()\n";
            if (useEncrypt) {
                body += "    local " + srcVar + " = " + decFn + "(" + hexVar + ", " + keyVar + ")\n";
            }
            body += "    local " + funVar + ", " + errVar + " = loadstring(" + srcVar + ")\n" +
                    "    if not " + funVar + " then error(" + errVar + ", 0) end\n" +
                    "    return " + funVar + "()\n" +
                    "end\n\n" +
                    "return " + mainFn + "()\n";
        } else {
            body += "local " + srcVar + " = nil\n" +
                    "local " + funVar + ", " + errVar + " = nil, nil\n" +
                    "local " + stateVar + " = 0\n" +
                    "while true do\n" +
                    "    if " + stateVar + " == 0 then\n";
            if (antiFn) body += "        " + antiFn + "()\n";
            if (useEncrypt) {
                body += "        " + srcVar + " = " + decFn + "(" + hexVar + ", " + keyVar + ")\n";
            }
            body += "        " + stateVar + " = 1\n" +
                    "    elseif " + stateVar + " == 1 then\n" +
                    "        " + funVar + ", " + errVar + " = loadstring(" + srcVar + ")\n" +
                    "        if not " + funVar + " then error(" + errVar + ", 0) end\n" +
                    "        " + stateVar + " = 2\n" +
                    "    elseif " + stateVar + " == 2 then\n" +
                    "        return " + funVar + "()\n" +
                    "    end\n" +
                    "end\n";
        }

        return {
            lua: header + body,
            key: key,
            hex: hex,
            hexLength: useEncrypt ? hex.length : 0
        };
    }

    // ======== public obfuscate() ========

    function obfuscate(source, userOptions) {
        var opts = userOptions || {};
        if (typeof opts.variableRename      === "undefined") opts.variableRename      = true;
        if (typeof opts.stringEncrypt       === "undefined") opts.stringEncrypt       = true;
        if (typeof opts.controlFlowFlatten  === "undefined") opts.controlFlowFlatten  = true;
        if (typeof opts.vmMode              === "undefined") opts.vmMode              = true;
        if (typeof opts.junkNodes           === "undefined") opts.junkNodes           = true;
        if (typeof opts.antiDebug           === "undefined") opts.antiDebug           = true;
        if (typeof opts.antiTamper          === "undefined") opts.antiTamper          = true;

        var layer1 = buildLoaderLua(String(source), opts);
        var layers = 1;

        var finalLua = layer1.lua;
        var totalHexLen = layer1.hexLength;

        if (opts.vmMode) {
            var secondOpts = {
                variableRename:      opts.variableRename,
                stringEncrypt:       opts.stringEncrypt,
                controlFlowFlatten:  true,
                vmMode:              false,
                junkNodes:           opts.junkNodes,
                antiDebug:           opts.antiDebug,
                antiTamper:          opts.antiTamper
            };
            var layer2 = buildLoaderLua(finalLua, secondOpts);
            finalLua = layer2.lua;
            totalHexLen += layer2.hexLength;
            layers = 2;
        }

        return {
            output: finalLua,
            hexLength: totalHexLen,
            layers: layers
        };
    }

    global.RedFoxObfuscator = {
        obfuscate: obfuscate
    };

})(window);
