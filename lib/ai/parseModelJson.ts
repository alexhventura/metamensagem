export function parseJsonArrayFromModel<T>(text: string): T[] {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start !== -1 && end !== -1) {
    return JSON.parse(raw.slice(start, end + 1)) as T[];
  }
  const objStart = raw.indexOf('{');
  const objEnd = raw.lastIndexOf('}');
  if (objStart !== -1 && objEnd !== -1) {
    const obj = JSON.parse(raw.slice(objStart, objEnd + 1)) as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
  }
  throw new Error('JSON array esperado na resposta do modelo');
}
