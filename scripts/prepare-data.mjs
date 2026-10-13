import { mkdir, readFile, writeFile } from 'node:fs/promises';
const read = async name => JSON.parse(await readFile(`src/data/${name}.json`, 'utf8'));
const champions = await read('pokemon_championsdex_full');
const moves = [];
const moveIds = new Map();
for (const mon of Object.values(champions)) {
  mon.moves = mon.moves.map(move => {
    const key = JSON.stringify(move);
    if (!moveIds.has(key)) { moveIds.set(key, moves.length); moves.push(move); }
    return moveIds.get(key);
  });
}
const meta = await read('metaroll_stats');
await mkdir('src/data/generated', { recursive: true });
await writeFile('src/data/generated/champions.json', JSON.stringify({ pokemon: Object.values(champions), moves }));
await writeFile('src/data/generated/move-usage.json', JSON.stringify(Object.fromEntries(meta.doubles.map(mon => [mon.pokemon, Object.fromEntries(mon.moves.map(move => [move.name, move.usage]))]))));
console.log(`Prepared ${Object.keys(champions).length} Pokémon with ${moves.length} deduplicated moves.`);

await mkdir('src/data/generated/meta', { recursive: true });
await writeFile('src/data/generated/meta-index.json', JSON.stringify({ meta: meta.meta, pokemon: meta.doubles.map(({rank, pokemon, types}) => ({rank, pokemon, types})) }));
await writeFile('src/data/generated/meta-initial.json', JSON.stringify(meta.doubles[0]));
for (const mon of meta.doubles) await writeFile(`src/data/generated/meta/${mon.pokemon}.json`, JSON.stringify(mon));
