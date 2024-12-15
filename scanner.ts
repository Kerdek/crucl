export type Pos = [string, number, number]

export type Scanner = {
  pos: () => Pos
  skip(many: number): void
  get(): string,
  unget(s: string): void,
  unpos(p: Pos): void }

export function scanner(src: string, file: string) {
  const w: Pos = [file, 1, 1]

  function pos(): Pos {
    return [...w] }

  function unpos(p: Pos) {
    w[0] = p[0]
    w[1] = p[1]
    w[2] = p[2] }

  function fatal(msg: string): never {
    throw new Error(`(${w}): scanner: ${msg}`) }

  function skip(many: number): void {
    if (src.length < many) {
      fatal("unexpected end of file") }
    for (let i = 0; i < many; i++) {
      if (src[0] === '\n') {
        w[1] += 1
        w[2] = 1 }
      else {
        w[2] += 1 }
      src = src.substring(1) } }

  function get(): string {
    return src }

  function unget(s: string): void {
    src = s + src; }

  return { skip, unget, get, pos, unpos } }
