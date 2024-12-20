import { make, evaluate, print } from './cru.js';
export const exec = async (io) => {
    const s = [], fatal = r => { throw new Error(r); }, unlit = p => evaluate(p)[1], unref = p => evaluate(p)[1];
    for (;;) {
        io = evaluate(io);
        if (io[0] !== "blt") {
            throw new Error(`An IO is required where \`${print(io)}\` was provided.`);
        }
        const [, , ...value] = io;
        const [kind, ...args] = value;
        if (!kind) {
            throw new Error(`No operands were provided.`);
        }
        const op = evaluate(kind);
        let x;
        switch (op[1]) {
            // sequencing
            case "bind": {
                const [n, f] = args;
                if (!n || !f) {
                    throw new Error(`Not enough operands among ${value.map(v => `\`${print(v)}\``).join(", ")}.`);
                }
                s.push(f);
                io = n;
                continue;
            }
            case "return": {
                const [r] = args;
                if (!r) {
                    throw new Error(`Not enough operands among ${value.map(v => `\`${print(v)}\``).join(", ")}.`);
                }
                x = r;
                break;
            }
            // console io
            case "put": {
                const [s] = args;
                if (!s) {
                    throw new Error(`Not enough operands among ${value.map(v => `\`${print(v)}\``).join(", ")}.`);
                }
                process.stdout.write(unlit(s));
                x = make("lit", undefined);
                break;
            }
            // references
            case "new": {
                const [v] = args;
                if (!v) {
                    throw new Error(`Not enough operands among ${value.map(v => `\`${print(v)}\``).join(", ")}.`);
                }
                x = make("ref", [[v]]);
                break;
            }
            case "get": {
                const [r] = args;
                if (!r) {
                    throw new Error(`Not enough operands among ${value.map(v => `\`${print(v)}\``).join(", ")}.`);
                }
                x = make("shr", unref(r)[0], "<reference>");
                break;
            }
            case "set": {
                const [r, v] = args;
                if (!r || !v) {
                    throw new Error(`Not enough operands among ${value.map(v => `\`${print(v)}\``).join(", ")}.`);
                }
                unref(r)[0] = [v];
                x = make("lit", undefined);
                break;
            }
            default: {
                fatal(`No IO kind \`${op[1]}\` is defined.`);
            }
        }
        const f = s.pop();
        if (!f) {
            return x;
        }
        io = make("app", f, x);
    }
};
//# sourceMappingURL=io.js.map