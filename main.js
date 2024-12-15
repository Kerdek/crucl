import { read, tokenizer } from './cru.js';
import { exec } from './io.js';
import { scanner } from './scanner.js';
import { readFile } from 'fs/promises';
if (process.argv[2] === undefined) {
    throw new Error('No input file specified.');
}
exec(await read(tokenizer(scanner(await readFile(process.argv[2], { encoding: 'utf8' }), process.argv[2]))));
//# sourceMappingURL=main.js.map