/*

run.ts
Theodoric Stier
All rights reserved 2024

This module assists in writing
non-recursive algorithms on recursive
data structures.

`run` accepts a `Process`, runs it,
then returns.

A `Process` takes no arguments and returns
a `Stack` whose contents are pushed onto
the existing stack.

`ret` is an empty `Stack`, which indicates
successful completion of a subroutine.

*/
export const ret = [];
export const jmp = x => [x];
export const call = (x, y) => [x, y];
export const run = s => {
    const y = [s];
    let ops = 0;
    for (;;) {
        if (ops++ > 1e7) {
            throw new Error("Too many steps.");
        }
        const f = y.shift();
        if (!f) {
            return;
        }
        y.unshift(...f());
    }
};
export const async_run = async (s) => {
    const y = [s];
    let ops = 0;
    for (;;) {
        if (ops++ > 1e7) {
            throw new Error("Too many steps.");
        }
        const f = y.shift();
        if (!f) {
            return;
        }
        y.unshift(...await f());
    }
};
export const homproc = e => {
    let d;
    run(e((x, v) => call(x, () => v(d)), v => (d = v, ret)));
    return d;
};
export const async_homproc = async (e) => {
    let d;
    await async_run(e((x, v) => call(x, () => v(d)), v => (d = v, ret)));
    return d;
};
//# sourceMappingURL=run.js.map