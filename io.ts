import { FileHandle, open } from 'fs/promises'
import { print, make, evaluate, Graph, Value } from './cru.js'

export type Exec = (e: Graph) => Promise<Graph>

type Fatal = (reason: string) => never
type Stack = Graph[]

export const exec: Exec = async io => {
const
  s: Stack = [],
  fatal: Fatal = r => { throw new Error(r) },
  unbox: (e: Graph) => Value = e => (e = evaluate(e), e[0] !== "lit" ? fatal(`A literal is required where \`${print(e)}\` was provided.`) : e[1]),
  unref: (e: Graph) => any = e => (e = evaluate(e), e[0] !== "ref" ? fatal(`A reference is required where \`${print(e)}\` was provided.`) : e[1])
for (;;) {
  io = evaluate(io)
  if (io[0] !== "lit" || !Array.isArray(io[1])) {
    fatal(`A tuple is required where \`${print(io)}\` was provided.`) }
  if (io[1][0] === undefined) {
    fatal(`A tuple of size at least one is required where \`${print(io)}\` was provided.`) }
  const op = evaluate(io[1][0][0])
  if (op[0] !== "lit" || typeof op[1] !== "string") {
    fatal(`A string is required where \`${print(op)}\` was provided.`) }
  let x: Graph
  switch (op[1]) {

  // sequencing

  case "bind": {
    if (io[1][1] === undefined || io[1][2] === undefined) {
      fatal(`Two operands are required where \`${print(io)}\` was provided.`) }
    s.push(io[1][2][0])
    io = io[1][1][0]
    continue }
  case "return": {
    if (io[1][1] === undefined) {
      fatal(`One operand is required where \`${print(io)}\` was provided.`) }
    x = io[1][1][0]
    break }

  // console io

  case "put": {
    if (io[1][1] === undefined) {
      fatal(`One operand is required where \`${print(io)}\` was provided.`) }
    console.log(unbox(io[1][1][0]))
    x = make("lit", true)
    break }

  // file io

  case "new_buffer": {
    if (io[1][1] === undefined) {
      fatal(`One operand is required where \`${print(io)}\` was provided.`) }
    x = make("ref", Buffer.alloc(unbox(io[1][1][0]) as number))
    break }
  case "buffer_to_string": {
    if (io[1][1] === undefined) {
      fatal(`One operand is required where \`${print(io)}\` was provided.`) }
    x = make("lit", unref(io[1][1][0]).toString())
    break }
  case "buffer_from_string": {
    if (io[1][1] === undefined) {
      fatal(`One operand is required where \`${print(io)}\` was provided.`) }
    x = make("ref", Buffer.from(unbox(io[1][1][0]) as string, 'utf8'))
    break }
  case "slice_buffer": {
    if (io[1][1] === undefined || io[1][2] === undefined || io[1][3] === undefined) {
      fatal(`Three operands are required where \`${print(io)}\` was provided.`) }
    x = make("ref", unref(io[1][1][0]).slice(unbox(io[1][2][0]), unbox(io[1][3][0])))
    break }
  case "fopen": {
    if (io[1][1] === undefined || io[1][2] === undefined) {
      fatal(`Two operands are required where \`${print(io)}\` was provided.`) }
    x = make("ref", await open(unbox(io[1][1][0]) as string, unbox(io[1][2][0]) as string))
    break }
  case "fread": {
    if (io[1][1] === undefined || io[1][2] === undefined) {
      fatal(`Two operands are required where \`${print(io)}\` was provided.`) }
    const buffer = unref(io[1][2][0])
    const r = await (unref(io[1][1][0]) as FileHandle).read(buffer, 0, buffer.length, 0)
    x = make("lit", { buffer: [make("ref", r.buffer)], bytesRead: [make("lit", r.bytesRead)] })
    break }
  case "fwrite": {
    if (io[1][1] === undefined || io[1][2] === undefined) {
      fatal(`Two operands are required where \`${print(io)}\` was provided.`) }
    const buffer = unref(io[1][2][0])
    const r = await (unref(io[1][1][0]) as FileHandle).write(buffer, 0, buffer.length, 0)
    x = make("lit", { buffer: [make("ref", r.buffer)], bytesWritten: [make("lit", r.bytesWritten)] })
    break }
  case "fclose": {
    if (io[1][1] === undefined) {
      fatal(`One operand is required where \`${print(io)}\` was provided.`) }
    x = make("lit", await (unref(io[1][1][0]) as FileHandle).close())
    break }

  default: {
    fatal(`No IO \`${op[1]}\` is defined.`) } }
  const f = s.pop()
  if (!f) {
    return x }
  io = make("app", f, x) } }
