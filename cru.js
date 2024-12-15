import { readFile } from 'fs/promises';
import { jmp, homproc, async_homproc } from './run.js';
import * as path from 'path';
export const assign = (e, x) => {
    let i = 0;
    for (; i < x.length; i++) {
        e[i] = x[i];
    }
    for (; i < e.length; i++) {
        delete e[i];
    }
    return e;
};
export const make = (...x) => x;
export const visit = o => e => (f => f(e))(o[e[0]]);
export const visit_branch = o => e => (f => () => f(e))(o[e[0]]);
export function tokenizer(s) {
    let t;
    function fatal(msg) {
        throw new Error(`(${s.pos()[0]}:${s.pos()[1]}:${s.pos()[2]}): tokenizer: ${msg}`);
    }
    function k(t) {
        const matches = s.get().match(t);
        if (matches === null) {
            return null;
        }
        return matches[0];
    }
    function pos() {
        return s.pos();
    }
    function take(k) {
        if (t[0] === k) {
            const r = t;
            skip();
            return r;
        }
        return undefined;
    }
    function ws() {
        const ws = k(/^(\s|\/\/([^\n\\]|\\.)*?(\n|$)|\/\*([^\*\\]|\\.|\*[^\/])*?(\*\/|$))*/);
        if (ws) {
            s.skip(ws.length);
        }
    }
    function skip() {
        if (t[0] === "eof") {
            return;
        }
        s.skip(t[1].length);
        ws();
        classify();
    }
    function classify() {
        if (s.get().length === 0) {
            t = ["eof"];
            return;
        }
        if (k(/^\(/)) {
            t = ["lparen", "("];
            return;
        }
        if (k(/^\)/)) {
            t = ["rparen", ")"];
            return;
        }
        if (k(/^{/)) {
            t = ["lbrace", "{"];
            return;
        }
        if (k(/^}/)) {
            t = ["rbrace", "}"];
            return;
        }
        if (k(/^\[/)) {
            t = ["lbracket", "["];
            return;
        }
        if (k(/^\]/)) {
            t = ["rbracket", "]"];
            return;
        }
        if (k(/^:/)) {
            t = ["colon", ":"];
            return;
        }
        if (k(/^\.\[/)) {
            t = ["dotbracket", ".["];
            return;
        }
        if (k(/^\.\.\./)) {
            t = ["dots", "..."];
            return;
        }
        if (k(/^\./)) {
            t = ["dot", "."];
            return;
        }
        if (k(/^\\/)) {
            t = ["rsolidus", "\\"];
            return;
        }
        if (k(/^=/)) {
            t = ["equal", "="];
            return;
        }
        if (k(/^,/)) {
            t = ["comma", ","];
            return;
        }
        if (k(/^->/)) {
            t = ["arrow", "->"];
            return;
        }
        if (k(/^#/)) {
            t = ["hash", "#"];
            return;
        }
        if (k(/^\$/)) {
            t = ["dollar", "$"];
            return;
        }
        let r = k(/^("([^"\\]|\\.)*($|")|[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?|false|true|null|undefined)/);
        if (r) {
            t = ["literal", r];
            return;
        }
        r = k(/^[A-Za-z_][A-Za-z0-9_]*/);
        if (r === "where") {
            t = ["where", "where"];
            return;
        }
        if (r === "let") {
            t = ["let", "let"];
            return;
        }
        if (r === "in") {
            t = ["in", "in"];
            return;
        }
        if (r) {
            t = ["identifier", r];
            return;
        }
        fatal(`Unrecognized character sequence.`);
    }
    function unget(text) {
        s.unget(text);
        ws();
        classify();
    }
    function unpos(p) {
        s.unpos(p);
    }
    ws();
    classify();
    return { unget, pos, take, unpos };
}
const di = (x, f) => f(x);
const includes = {};
export const read = tk => async_homproc((call, ret) => {
    const fatal = m => { throw new Error(`(${tk.pos()[0]}:${tk.pos()[1]}:${tk.pos()[2]}): parser: ${m}`); }, include = async () => {
        let ru = tk.take("literal");
        if (ru === undefined || typeof ru[1] !== "string") {
            fatal("Expected a string.");
        }
        const wp = tk.pos();
        const r = path.normalize(path.dirname(wp[0]) + "/" + JSON.parse(ru[1]));
        const m = includes[r];
        if (m) {
            return ret(make("shr", m));
        }
        try {
            tk.unget(`${await readFile(r)})`);
        }
        catch (e) {
            fatal(`Error while reading input file \`${r}\`: ${e.message}`);
        }
        tk.unpos([r, 1, 1]);
        return call(expression, async (e) => {
            tk.take("rparen");
            tk.unpos(wp);
            const m = [e];
            includes[r] = m;
            return ret(make("shr", m));
        });
    }, lst_elems = l => async () => await di(tk.take("dots"), async (is_splat) => call(expression, async (e) => tk.take("rbracket") ? ret(make("lst", [...l, [is_splat ? true : false, e]])) :
        tk.take("comma") ? jmp(lst_elems([...l, [is_splat ? true : false, e]])) :
            fatal(`Expected \`,\` or \`]\`.`))), rec_defs = o => async () => tk.take("dots") ?
        call(expression, async (e) => await di(() => [...o, [true, e]], async (r) => tk.take("rbrace") ? ret(make("rec", r())) :
            tk.take("comma") ? jmp(rec_defs(r())) :
                fatal(`Expected \`,\` or \`}\`.`))) :
        tk.take("lbracket") ?
            call(expression, async (i) => !tk.take("rbracket") ? fatal(`Expected \`]\`.`) :
                call(parameters("colon"), async (y) => await di(() => [...o, [false, i, y]], async (r) => tk.take("rbrace") ? ret(make("rec", r())) :
                    tk.take("comma") ? jmp(rec_defs(r())) :
                        fatal(`Expected \`,\` or \`}\`.`)))) :
            await di(tk.take("identifier"), async (i) => !i ? fatal(`Expected \`...\`, \`[\`, or an identifier.`) :
                await di(() => [...o, [false, make("lit", i[1]), make("var", i[1])]], async (r) => tk.take("rbrace") ? ret(make("rec", r())) :
                    tk.take("comma") ? jmp(rec_defs(r())) :
                        call(parameters("colon"), async (y) => await di(() => [...o, [false, make("lit", i[1]), y]], async (r) => tk.take("rbrace") ? ret(make("rec", r())) :
                            tk.take("comma") ? jmp(rec_defs(r())) :
                                fatal(`Expected \`,\` or \`}\`.`))))), let_defs = m => async () => await di(tk.take("identifier"), async (i) => !i ? fatal(`Expected an identifier.`) :
        call(parameters("equal"), async (y) => tk.take("in") ? call(dollar, async (x) => ret(make("mod", [...m, [i[1], y]], x))) :
            tk.take("comma") ? jmp(let_defs([...m, [i[1], y]])) :
                fatal(`Expected \`,\` or \`in\`.`))), parameters = k => async () => tk.take(k) ? jmp(expression) :
        await di(tk.take("identifier"), async (i) => i ? call(parameters(k), async (dx) => ret(make("abs", i[1], dx))) :
            fatal(`Expected token kind \`${k}\`.`)), try_primary = async () => tk.take("hash") ? include :
        tk.take("lbracket") ?
            async () => tk.take("rbracket") ? ret(make("lst", [])) :
                jmp(lst_elems([])) :
            tk.take("lbrace") ?
                async () => tk.take("rbrace") ? ret(make("rec", [])) :
                    jmp(rec_defs([])) :
                tk.take("rsolidus") ?
                    parameters("arrow") :
                    tk.take("lparen") ?
                        async () => call(expression, async (x) => tk.take("rparen") ? ret(x) :
                            fatal(`Expected \`)\`.`)) :
                        tk.take("let") ?
                            async () => tk.take("in") ? jmp(dollar) :
                                jmp(let_defs([])) :
                            await di(tk.take("literal"), async (c) => c ? async () => ret(make("lit", c[1] === "undefined" ? undefined :
                                JSON.parse(c[1]))) :
                                await di(tk.take("identifier"), async (r) => r ? async () => ret(make("var", r[1])) : null)), access_rhs = async (x) => tk.take("dot") ?
        await di(tk.take("identifier"), async (i) => !i ? fatal("Expected an identifier.") :
            access_rhs(make("acs", x, make("lit", i[1])))) :
        tk.take("dotbracket") ?
            call(expression, async (i) => !tk.take("rbracket") ? fatal(`Expected \`]\`.`) :
                access_rhs(make("acs", x, i))) :
            ret(x), try_access = async () => await di(await try_primary(), async (up) => up === null ? null :
        async () => call(up, access_rhs)), access = async () => await di(await try_access(), async (up) => up === null ? fatal("Expected a term.") :
        jmp(up)), juxt_rhs = async (x) => await di(await try_access(), async (up) => up === null ? ret(x) :
        call(up, async (y) => juxt_rhs(make("app", x, y)))), juxt = async () => call(access, juxt_rhs), dollar = async () => call(juxt, async (x) => tk.take("dollar") ?
        call(dollar, async (y) => ret(make("app", x, y))) :
        ret(x)), where_defs = ([, m, x]) => async () => di(tk.take("identifier"), i => !i ? fatal(`Expected an identifier.`) :
        call(parameters("equal"), async (y) => tk.take("rparen") ? ret(make("mod", [...m, [i[1], y]], x)) :
            tk.take("comma") ? jmp(where_defs(make("mod", [...m, [i[1], y]], x))) :
                fatal(`Expected \`)\` or \`,\`.`))), where_clause = x => async () => di(make("mod", [], x), r => tk.take("rparen") ? ret(r) :
        jmp(where_defs(r))), where_seq = async (x) => tk.take("where") ?
        !tk.take("lparen") ? fatal(`Expected \`(\`.`) :
            call(where_clause(x), where_seq) :
        ret(x), where = async () => call(dollar, where_seq), expression = where, all = async () => call(expression, async (e) => !tk.take("eof") ? fatal(`Expected end of file.`) :
        ret(e));
    return all;
});
export const print = visit({
    mod: () => `<module>`,
    app: () => `<application>`,
    abs: () => `<function>`,
    var: () => `<variable>`,
    acs: () => `<access>`,
    lit: ([, c]) => 
    // rec: ([, o]) => `{ ${Object.keys(o).map(k => `${k}: ${print((o[k] as Ptr)[0])}`).join(', ')} }` })
    Array.isArray(c) ? `[${c.map(e => print(e[0])).join(', ')}]` :
        typeof c === "object" && c !== null ? `{ ${Object.keys(c).map(k => `${k}: ${print(c[k][0])}`).join(', ')} }` :
            typeof c === "undefined" ? "undefined" :
                JSON.stringify(c),
    sav: () => `<save>`,
    ref: () => `<reference>`,
    shr: () => `<shared>`,
    blt: () => `<built-in>`,
    lst: () => `<list>`,
    rec: () => `<record>`
});
export const builtins = await (async () => {
    const nullary = op => make("lit", op);
    const unary = op => make("blt", (call, ret, s, r) => call(s(r), dx => ret(make("lit", op(dx[1])))));
    const binary = op => make("blt", (call, ret, s, r) => call(s(r), dx => ret(unary(y => op(dx[1], y)))));
    const ternary = op => make("blt", (call, ret, s, r) => call(s(r), dx => ret(binary((x, y) => op(dx[1], x, y)))));
    return {
        __builtin_rec: make("blt", (_call, _ret, s, r) => (e => (e[2] = e, jmp(s(e))))(make("app", r, undefined))),
        __builtin_if: make("blt", (call, ret, s, r) => call(s(r), dx => ret(make("abs", "y", make("abs", "z", make("var", dx[1] ? "y" : "z")))))),
        __builtin_and: make("blt", (call, ret, s, r) => call(s(r), dx => ret(make("abs", "x", dx[1] ? make("var", "x") : dx)))),
        __builtin_or: make("blt", (call, ret, s, r) => call(s(r), dx => ret(make("abs", "x", dx[1] ? dx : make("var", "x"))))),
        __builtin_typeof: make("blt", (call, ret, s, r) => call(s(r), dx => ret(make("lit", dx[0] === "abs" || dx[0] === "blt" ? "function" : dx[0] === "ref" ? "reference" : Array.isArray(dx[1]) ? "tuple" : dx[1] === null ? "null" : typeof dx[1] === "object" ? "record" : typeof dx[1])))),
        __builtin_keys: unary(x => Object.keys(x).map(x => [make("lit", x)])),
        __builtin_length: unary(x => x.length),
        __builtin_slice: ternary((x, y, z) => x.slice(y, z)),
        __builtin_neg: unary(x => -x),
        __builtin_not: unary(x => !x),
        __builtin_cpl: unary(x => ~x),
        __builtin_mul: binary((a, b) => a * b),
        __builtin_div: binary((a, b) => a / b),
        __builtin_mod: binary((a, b) => a % b),
        __builtin_add: binary((a, b) => a + b),
        __builtin_sub: binary((a, b) => a - b),
        __builtin_shl: binary((a, b) => a << b),
        __builtin_shr: binary((a, b) => a >> b),
        __builtin_eq: binary((a, b) => a === b),
        __builtin_neq: binary((a, b) => a !== b),
        __builtin_gt: binary((a, b) => a > b),
        __builtin_ge: binary((a, b) => a >= b),
        __builtin_lt: binary((a, b) => a < b),
        __builtin_le: binary((a, b) => a <= b),
        __builtin_bcj: binary((a, b) => a & b),
        __builtin_bxj: binary((a, b) => a ^ b),
        __builtin_bdj: binary((a, b) => a | b),
        __builtin_floor: unary(Math.floor),
        __builtin_ceil: unary(Math.ceil),
        __builtin_pi: nullary(Math.PI),
        __builtin_sqrt: unary(Math.sqrt),
        __builtin_log: unary(Math.log),
        __builtin_pow: binary(Math.pow),
        __builtin_exp: unary(Math.exp),
        __builtin_cos: unary(Math.cos),
        __builtin_sin: unary(Math.sin),
        __builtin_tan: unary(Math.tan),
        __builtin_acos: unary(Math.acos),
        __builtin_asin: unary(Math.asin),
        __builtin_atan: unary(Math.atan),
        __builtin_atan2: binary(Math.atan2),
        __builtin_cosh: unary(Math.cosh),
        __builtin_sinh: unary(Math.sinh),
        __builtin_tanh: unary(Math.tanh),
        __builtin_acosh: unary(Math.acosh),
        __builtin_asinh: unary(Math.asinh),
        __builtin_atanh: unary(Math.atanh),
        __builtin_stringify: unary(JSON.stringify),
    };
})();
export const bubble = e => homproc((call, ret) => {
    const s = e => () => call(visit_branch({
        sav: y => call(s(y), () => jmp(s(e))),
        mod: y => {
            const o = { ...e[1] };
            for (const def of y[1]) {
                delete o[def[0]];
            }
            return ret(make("mod", y[1].map(d => [d[0], make("sav", o, d[1])]), make("sav", o, y[2])));
        },
        app: y => ret(make("app", make("sav", e[1], y[1]), make("sav", e[1], y[2]))),
        abs: y => {
            const o = { ...e[1] };
            delete o[y[1]];
            return ret(make("abs", y[1], make("sav", o, y[2])));
        },
        acs: y => ret(make("acs", make("sav", e[1], y[1]), make("sav", e[1], y[2]))),
        var: y => {
            const u = e[1][y[1]];
            return ret(u === undefined ? y : make("shr", u));
        },
        rec: y => ret(make("rec", y[1].map(a => a[0] ?
            [true, make("sav", e[1], a[1])] :
            [false, make("sav", e[1], a[1]), make("sav", e[1], a[2])]))),
        lst: y => ret(make("lst", y[1].map(a => [a[0], make("sav", e[1], a[1])]))),
        shr: ret,
        lit: ret,
        ref: ret,
        blt: ret
    })(e[2]), de => ret(assign(e, de)));
    return s(e);
});
export const evaluate = e => homproc((call, ret) => {
    const r = (a, o) => () => di(a[0], e => e === undefined ? ret(make("lit", o)) :
        e[0] ?
            call(s(e[1]), de => de[0] !== "lit" || typeof de[1] !== "object" || de[1] === null || Array.isArray(de[1]) ? (() => { throw new Error("Expected a string or number."); })() :
                jmp(r(a.slice(1), { ...o, ...de[1] }))) :
            call(s(e[1]), di => di[0] !== "lit" || typeof di[1] !== "string" && typeof di[1] !== "number" ? (() => { throw new Error("Expected a string or number."); })() :
                jmp(r(a.slice(1), { ...o, [di[1]]: [e[2]] }))));
    const l = (a, o) => () => di(a[0], e => e === undefined ? ret(make("lit", o)) :
        e[0] ?
            call(s(e[1]), de => de[0] !== "lit" || !Array.isArray(de[1]) ? (() => { throw new Error("Expected a string or number."); })() :
                jmp(l(a.slice(1), [...o, ...de[1]]))) :
            jmp(l(a.slice(1), [...o, [e[1]]])));
    const s = visit_branch({
        sav: e => jmp(s(bubble(e))),
        mod: e => {
            const op = {};
            for (const def of e[1]) {
                op[def[0]] = [make("sav", op, def[1])];
            }
            return jmp(s(make("sav", op, e[2])));
        },
        app: e => call(s(e[1]), dx => jmp(visit_branch({
            abs: x => jmp(s(make("sav", { [x[1]]: [e[2]] }, x[2]))),
            blt: x => x[1](call, ret, s, e[2]),
            lit: x => { throw new Error(`Expected a function instead of \`${print(x)}\`.`); },
            ref: x => { throw new Error(`Expected a function instead of \`${print(x)}\`.`); }
        })(dx))),
        shr: e => call(s(e[1][0]), dx => (e[1][0] = dx, ret(dx))),
        var: ([, i]) => di(builtins[i], r => r ? ret(r) : (() => { throw new Error(`Undefined reference to \`${i}\`.`); })()),
        acs: ([, x, y]) => call(s(x), dx => call(s(y), dy => dy[0] !== "lit" || typeof dy[1] !== "string" && typeof dy[1] !== "number" ? (() => { throw new Error(`Expected a string or number instead of \`${print(dy)}\` on rhs of subscript with \`${print(dx)}\`.`); })() :
            dx[0] !== "lit" || typeof dx[1] !== "string" && typeof dx[1] !== "object" || dx[1] === null ? (() => { throw new Error(`Expected a record, list, or string instead of \`${print(dx)}\` on lhs of subscript with \`${print(dy)}\`.`); })() :
                di(dx[1][dy[1]], j => j === undefined ? (() => { throw new Error(`\`${dy[1]}\` is not a property of \`${print(dx)}\`.`); })() :
                    typeof dx[1] === "string" ? ret(make("lit", j[0])) :
                        call(s(j[0]), dj => (j[0] = dj, ret(dj)))))),
        rec: ([, x]) => jmp(r(x, {})),
        lst: ([, x]) => jmp(l(x, [])),
        abs: ret,
        blt: ret,
        lit: ret,
        ref: ret
    });
    return s(e);
});
//# sourceMappingURL=cru.js.map