/** Hash de shard para JSON estático (browser + Node). */
export function shardForSlug(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return (h % 256).toString(16).padStart(2, '0');
}
