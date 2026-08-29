import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

function removeDupsAndLowerCase(array: string[]) {
	return [...new Set(array.map((str) => str.toLowerCase()))];
}

const post = defineCollection({
	loader: glob({ base: "./content/posts", pattern: "**/*.{md,mdx}" }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string().optional().default(""),
			publishDate: z
				.string()
				.or(z.date())
				.transform((val) => new Date(val)),
			updatedDate: z
				.string()
				.or(z.date())
				.optional()
				.transform((str) => (str ? new Date(str) : undefined)),
			draft: z.boolean().default(false),
			tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
			pinned: z.boolean().default(false),
			ogImage: z.string().optional(),
			coverImage: z
				.object({
					alt: z.string(),
					src: image(),
				})
				.optional(),
		}),
});

const note = defineCollection({
	loader: glob({ base: "./content/notes", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string().default("Note"),
		description: z.string().optional(),
		publishDate: z
			.string()
			.or(z.date())
			.transform((val) => new Date(val)),
	}),
});

const tag = defineCollection({
	loader: glob({ base: "./content/tags", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string().optional(),
		description: z.string().optional(),
	}),
});

export const collections = { post, note, tag };
