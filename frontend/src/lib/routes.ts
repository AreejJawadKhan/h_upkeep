export function parseHomeParam(value: string | null | undefined) {
  if (!value) return '';

  const match = value.trim().match(/^\d+/);
  return match ? match[0] : '';
}
