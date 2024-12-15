export function scanner(src, file) {
    const w = [file, 1, 1];
    function pos() {
        return [...w];
    }
    function unpos(p) {
        w[0] = p[0];
        w[1] = p[1];
        w[2] = p[2];
    }
    function fatal(msg) {
        throw new Error(`(${w}): scanner: ${msg}`);
    }
    function skip(many) {
        if (src.length < many) {
            fatal("unexpected end of file");
        }
        for (let i = 0; i < many; i++) {
            if (src[0] === '\n') {
                w[1] += 1;
                w[2] = 1;
            }
            else {
                w[2] += 1;
            }
            src = src.substring(1);
        }
    }
    function get() {
        return src;
    }
    function unget(s) {
        src = s + src;
    }
    return { skip, unget, get, pos, unpos };
}
//# sourceMappingURL=scanner.js.map