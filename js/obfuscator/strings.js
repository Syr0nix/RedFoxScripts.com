// js/obfuscator/strings.js

export function encryptStrings(code) {
    return code.replace(/"(.-)"/g, function(_, str) {

        // XOR key (random per run)
        let key = Math.floor(Math.random() * 200) + 30;

        // convert to bytes
        let bytes = [];
        for (let i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i) ^ key);
        }

        // encode as lua
        return `(_RF_DEC("${bytes.join(",")}",${key}))`;
    });
}
