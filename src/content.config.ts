import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    pubDate: z.date(),
  }),
});

export const collections = {
  'docs': docsCollection,
};
