export async function fetchModels(
  baseURL: string,
  headers: Record<string, string>,
): Promise<string[]> {
  const url = `${baseURL.replace(/\/+$/, "")}/models`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...headers },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch models: ${res.status}`);
  }

  const json = await res.json();
  const data = json.data as { id: string }[] | undefined;

  if (!Array.isArray(data)) {
    throw new Error("Unexpected response format from /models");
  }

  return data.map((m) => m.id).sort();
}
