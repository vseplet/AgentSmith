import { shibui } from "@vseplet/shibui";

export const core = shibui({ logger: false });

let _kv: Deno.Kv | null = null;

function getSmithDir(): string {
  const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? ".";
  return `${home}/.smith`;
}

export async function getKv(): Promise<Deno.Kv> {
  if (!_kv) {
    const dir = getSmithDir();
    await Deno.mkdir(dir, { recursive: true });
    _kv = await Deno.openKv(`${dir}/kv.db`);
  }
  return _kv;
}
