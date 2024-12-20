import { createReadStream, createWriteStream } from 'fs'
import { make, evaluate } from './cru.js'

export const exec = async (io) => {
  const
    s = [],
    unbox = e => evaluate(e)[1]
  for (;;) {
    io = evaluate(io)
    const [, , ...value] = io
    const [kind, ...args] = value
    const op = evaluate(kind)
    let x;
    switch (op[1]) {

    // sequencing

    case "bind": {
      const [n, f] = args
      s.push(f)
      io = n
      continue }
    case "return": {
      const [r] = args
      x = r
      break }

    // console io

    case "put": {
      const [s] = args
      process.stdout.write(unbox(s))
      x = make("lit", undefined)
      break }

    // references

    case "new": {
      const [v] = args
      x = make("ref", [[v]])
      break }
    case "get": {
      const [r] = args
      x = make("shr", unbox(r)[0], "<reference>")
      break }
    case "set": {
      const [r, v] = args
      unbox(r)[0] = [v]
      x = make("lit", undefined)
      break }

    // buffers

    case "new_buffer": {
      const [v] = args
      x = make("ref", Buffer.alloc(unbox(v)))
      break }
    case "decode": {
      const [b, e] = args
      x = make("lit", unbox(b).toString(unbox(e)))
      break }
    case "encode": {
      const [s, e] = args
      x = make("ref", Buffer.from(unbox(s), unbox(e)))
      break }
    case "concat_buffers": {
      const [b] = args
      x = make("ref", Buffer.concat(unbox(b).map(x => evaluate(make("shr", x, "<object access>"))[1])))
      break }
    case "get_length": {
      const [b] = args
      x = make("lit", unbox(b).length)
      break }
    case "slice": {
      const [b, i, j] = args
      x = make("ref", unbox(b).slice(unbox(i), unbox(j)))
      break }
    case "peek": {
      const [b, i] = args;
      x = make("lit", unbox(b)[unbox(i)]);
      break }
    case "poke": {
      const [b, i, v] = args;
      x = make("lit", unbox(b)[unbox(i)] = unbox(v));
      break }

    // file streams

    case "create_read_stream": {
      const [p] = args
      const v = createReadStream(unbox(p))
      await new Promise((cb, err) => (v.on('readable', cb), v.on('error', err)))
      x = make("ref", v)
      break }
    case "read_stream_size": {
      const [s, n] = args
      x = make("ref", unbox(s).read(unbox(n)))
      break }
    case "read_stream": {
      const [s] = args
      const v = unbox(s).read()
      x = v === null ? make("lit", null) : make("ref", v)
      break }
    case "create_write_stream": {
      const [p] = args
      x = make("ref", createWriteStream(unbox(p)))
      break }
    case "write_stream": {
      const [s, b] = args
      x = make("lit", unbox(s).write(unbox(b)))
      break }
    case "close_stream": {
      const [s] = args
      x = make("lit", unbox(s).close())
      break }
    default: {
      fatal(`No IO kind \`${op[1]}\` is defined.`) } }
    const f = s.pop()
    if (!f) {
      return x }
    io = make("app", f, x) } }