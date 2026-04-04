export function extractJsonObject<T>(input: string): T {
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("No JSON object found in model response");
  }

  return JSON.parse(input.slice(start, end + 1)) as T;
}
