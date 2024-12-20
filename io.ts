import { print, make, evaluate, Graph, Value, List } from './cru.js'
import { ReadStream, WriteStream, createReadStream, createWriteStream } from 'fs'

export type Exec = (e: Graph) => Promise<Graph>

type Fatal = (reason: string) => never
type Stack = Graph[]

export const exec: Exec = async io => {
const
  s: Stack = [],
  fatal: Fatal = r => { throw new Error(r) },
  unlit: (e: Graph) => Value = e => (e = evaluate(e), e[0] !== "lit" ? fatal(`A literal is required where \`${print(e)}\` was provided.`) : e[1]),
  unref: (e: Graph) => any = e => (e = evaluate(e), e[0] !== "ref" ? fatal(`A reference is required where \`${print(e)}\` was provided.`) : e[1])
for (;;) {
  io = evaluate(io)
  if (io[0] !== "lit" || !Array.isArray(io[1])) {
    fatal(`A tuple is required where \`${print(io)}\` was provided.`) }
  const value = io[1]
  if (value[0] === undefined) {
    fatal(`A tuple of size at least one is required where \`${print(io)}\` was provided.`) }
  const [[kind], ...args] = value
  const op = evaluate(kind)
  if (op[0] !== "lit" || typeof op[1] !== "string") {
    fatal(`A string is required where \`${print(op)}\` was provided.`) }
  let x: Graph
  switch (op[1]) {

  // sequencing

  case "bind": {
    if (!args[0] || !args[1]) {
      fatal(`Two operands are required where \`${args.map(x => print(x[0])).join(',')}\` were provided.`) }
    const [[next], [f]] = args
    s.push(f)
    io = next
    continue }
  case "return": {
    if (!args[0]) {
      fatal(`One operand is required where \`${args.map(x => print(x[0])).join(',')}\` was provided.`) }
    const [[arg]] = args
    x = arg
    break }

  // console io

  case "put": {
    if (!args[0]) {
      fatal(`One operand is required where \`${args.map(x => print(x[0])).join(',')}\` was provided.`) }
    const [[text]] = args
    console.log(unlit(text))
    x = make("lit", true)
    break }

  // references

  case "new": {
    if (!args[0]) {
      fatal(`One operand is required where \`${args.map(x => print(x[0])).join(',')}\` was provided.`) }
    const [[v]] = args
    x = make("ref", [v])
    break }
  case "get": {
    if (!args[0]) {
      fatal(`One operand is required where \`${args.map(x => print(x[0])).join(',')}\` was provided.`) }
    const [[ref]] = args
    x = make("shr", unref(ref))
    break }
  case "set": {
    if (!args[0] || !args[1]) {
      fatal(`Two operands are required where \`${args.map(x => print(x[0])).join(',')}\` were provided.`) }
    const [[ref], [v]] = args
    unref(ref)[0] = v
    x = make("shr", unref(ref))
    break }

  // file io

  case "new_buffer": {
    if (value[1] === undefined) {
      fatal(`One operand is required where \`${print(io)}\` was provided.`) }
    x = make("ref", Buffer.alloc(unlit(value[1][0]) as number))
    break }
  case "buffer_to_string": {
    if (value[1] === undefined) {
      fatal(`One operand is required where \`${print(io)}\` was provided.`) }
    x = make("lit", unref(value[1][0]).toString())
    break }
  case "buffer_from_string": {
    if (value[1] === undefined) {
      fatal(`One operand is required where \`${print(io)}\` was provided.`) }
    x = make("ref", Buffer.from(unlit(value[1][0]) as string, 'utf8'))
    break }
  case "concat_buffers": {
    if (value[1] === undefined) {
      fatal(`One operand is required where \`${print(io)}\` was provided.`) }
    x = make("ref", Buffer.concat((unlit(value[1][0]) as List).map(x => evaluate(x[0])[1] as Buffer)))
    break }
  case "get_length": {
    if (value[1] === undefined) {
      fatal(`One operand is required where \`${print(io)}\` was provided.`) }
    x = make("lit", unref(value[1][0]).length)
    break }
  case "slice": {
    if (value[1] === undefined || value[2] === undefined || value[3] === undefined) {
      fatal(`Three operands are required where \`${print(io)}\` was provided.`) }
    x = make("ref", unref(value[1][0]).slice(unlit(value[2][0]), unlit(value[3][0])))
    break }
  case "peek": {
    if (value[1] === undefined || value[2] === undefined) {
      fatal(`Two operands are required where \`${print(io)}\` was provided.`) }
    x = make("lit", unref(value[1][0])[unlit(value[2][0]) as number])
    break }
  case "poke": {
    if (value[1] === undefined || value[2] === undefined || value[3] === undefined) {
      fatal(`Three operands are required where \`${print(io)}\` was provided.`) }
    x = make("lit", unref(value[1][0])[unlit(value[2][0]) as number] = unlit(value[3][0]))
    break }
  case "create_read_stream": {
    if (value[1] === undefined) {
      fatal(`One operand is required where \`${print(io)}\` was provided.`) }
    const v = createReadStream(unlit(value[1][0]) as string)
    await new Promise((cb, err) => (v.on('readable', cb), v.on('error', err)))
    x = make("ref", v)
    break }
  case "read_stream_size": {
    if (value[1] === undefined || value[2] === undefined) {
      fatal(`Two operands are required where \`${print(io)}\` was provided.`) }
    x = make("ref", (unref(value[1][0]) as ReadStream).read(unlit(value[2][0]) as number))
    break }
  case "read_stream": {
    if (value[1] === undefined) {
      fatal(`One operand is required where \`${print(io)}\` was provided.`) }
    const v = (unref(value[1][0]) as ReadStream).read()
    x = v === null ? make("lit", null): make("ref", v)
    break }
  case "create_write_stream": {
    if (value[1] === undefined) {
      fatal(`One operand is required where \`${print(io)}\` was provided.`) }
    x = make("ref", createWriteStream(unlit(value[1][0]) as string))
    break }
  case "write_stream": {
    if (value[1] === undefined || value[2] === undefined) {
      fatal(`Two operands are required where \`${print(io)}\` was provided.`) }
    x = make("lit", (unref(value[1][0]) as WriteStream).write(unref(value[2][0]) as Buffer))
    break }
  case "close_stream": {
    if (value[1] === undefined) {
      fatal(`One operand is required where \`${print(io)}\` was provided.`) }
    x = make("lit", (unref(value[1][0]) as WriteStream | ReadStream).close())
    break }

  default: {
    fatal(`No IO \`${op[1]}\` is defined.`) } }
  const f = s.pop()
  if (!f) {
    return x }
  io = make("app", f, x) } }
