import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

export const PostSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  author: z.string(),
  draft: z.boolean(),
  publishedAt: z.coerce.date().optional(),
});

const blogPost = defineCollection({
  loader: glob({ base: "./src/content", pattern: "**/*.{md,mdx}" }),
  schema: PostSchema,
});

export const collections = { blogPost };
