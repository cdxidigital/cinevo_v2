import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const source = join(root, ".vercel/output/static");
const target = join(root, "mobile-web");
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
const assets = await readdir(join(target, "assets"));
const js = assets.find((name) => /^index-.*\.js$/.test(name));
const css = assets.find((name) => /^styles-.*\.css$/.test(name));
if (!js || !css) throw new Error("Capacitor web assets were not emitted by the web build");
await writeFile(join(target, "index.html"), `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#08090d"><title>CINEVO</title><link rel="stylesheet" href="/assets/${css}"></head><body><div id="app"></div><script type="module" src="/assets/${js}"></script></body></html>\n`);
