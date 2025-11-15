window.RFUTILS = (() => {

    function randomIdent(length=12) {
        const chars = "lI1O0";
        let out = "_";
        for (let i = 0; i < length; i++) {
            out += chars[Math.floor(Math.random() * chars.length)];
        }
        return out;
    }

    function randomString(len=32) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let s = "";
        for (let i = 0; i < len; i++) {
            s += chars[Math.floor(Math.random()*chars.length)];
        }
        return s;
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random()* (i+1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function encodeString(str) {
        let out = "";
        for (let i=0; i<str.length;
