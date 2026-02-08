import { shibui } from "@vseplet/shibui";

export const core = shibui({ logger: false });

let _kv: Deno.Kv | null = null;

export async function getKv(): Promise<Deno.Kv> {
  if (!_kv) {
    _kv = await Deno.openKv();
  }
  return _kv;
}
