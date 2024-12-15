import { print, make, evaluate } from './cru.js';
export const exec = async (io) => {
    const s = [], fatal = r => { throw new Error(r); }, unbox = e => (e = evaluate(e), e[0] !== "lit" ? fatal(`A literal is required where \`${print(e)}\` was provided.`) : e[1]);
    for (;;) {
        io = evaluate(io);
        if (io[0] !== "lit" || !Array.isArray(io[1])) {
            fatal(`A tuple is required where \`${print(io)}\` was provided.`);
        }
        if (io[1][0] === undefined) {
            fatal(`A tuple of size at least one is required where \`${print(io)}\` was provided.`);
        }
        const op = evaluate(io[1][0][0]);
        if (op[0] !== "lit" || typeof op[1] !== "string") {
            fatal(`A string is required where \`${print(op)}\` was provided.`);
        }
        let x;
        switch (op[1]) {
            // sequencing
            case "bind": {
                if (io[1][1] === undefined || io[1][2] === undefined) {
                    fatal(`Two operands are required where \`${print(io)}\` was provided.`);
                }
                s.push(io[1][2][0]);
                io = io[1][1][0];
                continue;
            }
            case "return": {
                if (io[1][1] === undefined) {
                    fatal(`One operand is required where \`${print(io)}\` was provided.`);
                }
                x = io[1][1][0];
                break;
            }
            // basic io
            case "put": {
                if (io[1][1] === undefined) {
                    fatal(`One operand is required where \`${print(io)}\` was provided.`);
                }
                console.log(unbox(io[1][1][0]));
                x = make("lit", true);
                break;
            }
            default: {
                fatal(`No IO \`${op[1]}\` is defined.`);
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