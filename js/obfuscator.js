// js/obfuscator.js
;(function (global) {
    "use strict";

    // ====== helpers ======

    function randomId(len) {
        var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
        var out = "";
        for (var i = 0; i < len; i++) {
            out += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return out;
    }

    function randomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // simple checksum to detect tampering with hex payload
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

    // optional string scrambling (basic)
    function scrambleWhitespace(src) {
        // replace some spaces/tabs/newlines with weird combos
        return src
            .replace(/[ ]{2,}/g, function (m) {
                return " " + " ".repeat(Math.min(3, m.length - 1));
            })
            .replace(/\n\s*\n+/g, "\n\n");
    }

    // ====== obfuscator core ======

    function buildLoaderLua(hex, key, opts) {
        opts = opts || {};
        var loaderName = randomId(10);
        var decodeName = randomId(10);
        var chunkName  = randomId(10);
        var hexVar     = randomId(9);
        var keyVar     = randomId(9);
        var chkVar     = randomId(9);
        var antiName   = randomId(10);

        var chk = checksum(hex);

        // Junk locals for "max" mode
        var junkLocals = "";
        var junkFuncs  = "";
        if (opts.level === "max") {
            for (var i = 0; i < 5; i++) {
                var jn = randomId(8);
                junkLocals += "local " + jn + " = " + randomNumber(0, 999999) + "\n";
                junkFuncs += "local function " + randomId(9) + "(" + randomId(3) + ")\n" +
                             "    if " + randomNumber(0, 1) + " == " + randomNumber(0, 1) + " then\n" +
                             "        return " + randomNumber(1000, 9999) + "\n" +
                             "    end\n" +
                             "    return " + randomNumber(0, 999) + "\n" +
                             "end\n\n";
            }
        }

        // Anti-tamper + decode + loader
        var lua =
            "-- Obfuscated with RedFox Luau Obfuscator\n" +
            "-- https://redfoxscripts.com\n\n" +
            "local " + keyVar + " = '" + key + "'\n" +
            "local " + hexVar + " = '" + hex + "'\n" +
            "local " + chkVar + " = " + chk + "\n\n" +
            junkLocals +
            junkFuncs +
            "local function " + antiName + "()\n" +
            "    local h = 0\n" +
            "    local s = " + hexVar + "\n" +
            "    for i = 1, #s do\n" +
            "        h = (h + s:byte(i) * (i + 17)) % 2147483647\n" +
            "    end\n" +
            "    if h ~= " + chkVar + " then\n" +
            "        error('RedFox: tamper detected', 0)\n" +
            "    end\n" +
            "end\n\n" +
            "local function " + decodeName + "(hex, k)\n" +
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
            "end\n\n" +
            "local function " + loaderName + "()\n" +
            "    " + antiName + "()\n" +
            "    local src = " + decodeName + "(" + hexVar + ", " + keyVar + ")\n" +
            "    local " + chunkName + ", err = loadstring(src)\n" +
            "    if not " + chunkName + " then\n" +
            "        error('RedFox loader error: ' .. tostring(err), 0)\n" +
            "    end\n" +
            "    return " + chunkName + "()\n" +
            "end\n\n" +
            "return " + loaderName + "()\n";

        return lua;
    }

    function obfuscateLuau(source, options) {
        options = options || {};
        var level = options.level || "max"; // "low" | "medium" | "max"

        var src = String(source);

        if (level === "max") {
            // Slightly randomize whitespace just to avoid exact matches
            src = scrambleWhitespace(src);
        }

        var key = generateKey(16);
        var hex = toHexXor(src, key);
        var wrapped = buildLoaderLua(hex, key, { level: level });

        // In "max" mode, we can wrap the loader itself inside another layer once
        if (level === "max") {
            var outerKey = generateKey(18);
            var outerHex = toHexXor(wrapped, outerKey);
            wrapped = buildLoaderLua(outerHex, outerKey, { level: "medium" });
        }

        return {
            output: wrapped,
            key: key,
            hexLength: hex.length,
            mode: level
        };
    }

    global.RedFoxObfuscator = {
        obfuscateLuau: obfuscateLuau
    };
})(window);
