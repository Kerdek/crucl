import { make, evaluate, Graph, Value, Ptr, Reference, print } from './cru.js'

export type Exec = (e: Graph) => Promise<Graph>

type Fatal = (reason: string) => never
type Stack = Graph[]

export const exec: Exec = async io => {
const
  s: Stack = [],
  fatal: Fatal = r => { throw new Error(r) },
  unlit: (e: Graph) => Value = p => evaluate(p)[1] as Value,
  unref: (e: Graph) => Reference = p => evaluate(p)[1] as Reference
for (;;) {
  io = evaluate(io)
  if (io[0] !== "blt") { throw new Error(`An IO is required where \`${print(io)}\` was provided.`)}
  const [,, ...value] = io
  const [kind, ...args] = value
  if (!kind) { throw new Error(`No operands were provided.`) }
  const op = evaluate(kind)
  let x: Graph
  switch (op[1]) {

  // sequencing

  case "bind": {
    const [n, f] = args
    if (!n || !f) { throw new Error(`Not enough operands among ${value.map(v => `\`${print(v)}\``).join(", ")}.`) }
    s.push(f)
    io = n
    continue }
  case "return": {
    const [r] = args
    if (!r) { throw new Error(`Not enough operands among ${value.map(v => `\`${print(v)}\``).join(", ")}.`) }
    x = r
    break }

  // console io

  case "put": {
    const [s] = args
    if (!s) { throw new Error(`Not enough operands among ${value.map(v => `\`${print(v)}\``).join(", ")}.`) }
    process.stdout.write(unlit(s) as string)
    x = make("lit", undefined)
    break }

  // references

  case "new": {
    const [v] = args
    if (!v) { throw new Error(`Not enough operands among ${value.map(v => `\`${print(v)}\``).join(", ")}.`) }
    x = make("ref", [[v]])
    break }
  case "get": {
    const [r] = args
    if (!r) { throw new Error(`Not enough operands among ${value.map(v => `\`${print(v)}\``).join(", ")}.`) }
    x = make("shr", (unref(r) as [Ptr])[0], "<reference>")
    break }
  case "set": {
    const [r, v] = args
    if (!r || !v) { throw new Error(`Not enough operands among ${value.map(v => `\`${print(v)}\``).join(", ")}.`) }
    (unref(r) as [Ptr])[0] = [v]
    x = make("lit", undefined)
    break }

  default: {
    fatal(`No IO kind \`${op[1]}\` is defined.`) } }
  const f = s.pop()
  if (!f) {
    return x }
  io = make("app", f, x) } }
