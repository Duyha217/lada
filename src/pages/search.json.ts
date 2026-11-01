// Индекс для поиска по сайту: один файл /search.json вместо списка статей в каждой странице.
// Формат: [[заголовок, slug, категория], ...] — компактно, чтобы файл оставался лёгким.
import { getCollection } from 'astro:content';

export async function GET() {
  const docs = await getCollection('docs');
  const rows = docs.map((d) => [d.data.title, d.slug, d.data.category]);
  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
