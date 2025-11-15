// js/obfuscator.js
;(function (global) {
    "use strict";

    // Generate a random key for XOR (used in Lua + JS)
    function generateKey(len) {
        var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var out = "";
        for (var i = 0; i < len; i++) {
            out += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return out;
    }

    // Turn string into hex with XOR using same key logic as Lua side
    function toHexXor(str, key) {
        var keyLen = key.length;
        var hex = "";

        for (var i = 0; i < str.length; i++) {
            var byte = str.charCodeAt(i);
            var kbyte = key.charCodeAt(i % keyLen);
            var x = byte ^ kbyte; // XOR
            var h = x.toString(16).toUpperCase();
            if (h.length < 2) h = "0" + h;
            hex += h;
        }

        return hex;
    }

    /**
     * Main obfuscation function
     * @param {string} source - Lua source code
     * @param {object} [options]
     * @returns {{output: string, key: string, hexLength: number}}
     */
    function obfuscateLua(source, options) {
        options = options || {};
        var key = options.key || generateKey(12);

        var hex = toHexXor(source, key);

        // This is the Lua loader that will run the obfuscated script.
        // It reconstructs the original code and executes it.
        var wrapped =
            "-- Obfuscated with RedFoxScripts.com\n" +
            "local k = '" + key + "'\n" +
            "local function _rf_decode(hex)\n" +
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
            "end\n" +
            "local _rf_hex = '" + hex + "'\n" +
            "local _rf_src = _rf_decode(_rf_hex)\n" +
            "local _rf_chunk, _rf_err = loadstring(_rf_src)\n" +
            "if not _rf_chunk then error(_rf_err, 0) end\n" +
            "return _rf_chunk()\n";

        return {
            output: wrapped,
            key: key,
            hexLength: hex.length
        };
    }

    // Expose a clean API for the UI to call
    global.RedFoxObfuscator = {
        obfuscate: obfuscateLua
    };
})(window);
