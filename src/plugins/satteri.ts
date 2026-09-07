import type { Image, Nodes, Parents } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import getReadingTime from "reading-time";
import type { HastPluginDefinition, MdastPluginDefinition } from "satteri";

export function satteriAutolinkHeadingsPlugin(): HastPluginDefinition {
	return {
		name: "cactus-autolink-headings",
		element: {
			filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
			visit(node) {
				const id = node.properties?.id;
				if (typeof id !== "string" || !id) return;
				return {
					...node,
					children: [
						{
							type: "element",
							tagName: "a",
							properties: { href: `#${id}`, className: ["not-prose"] },
							children: [...node.children],
						},
					],
				};
			},
		},
	};
}

export function satteriReadingTimePlugin(): () => MdastPluginDefinition {
	return () => {
		let done = false;
		return {
			name: "cactus-reading-time",
			text(node, ctx) {
				if (done) return;

				let root: Readonly<Nodes> = node;
				let parent: Readonly<Parents> | undefined = ctx.parent(root);
				while (parent) {
					root = parent;
					parent = ctx.parent(root);
				}

				done = true;
				const textOnPage = mdastToString(root);
				const readingTime = getReadingTime(textOnPage);

				if (ctx.data.astro) {
					ctx.data.astro.frontmatter.readingTime = `${Math.ceil(readingTime.minutes)} 分钟阅读`;
				}
			},
		};
	};
}

export function satteriUnwrapImagesPlugin(): MdastPluginDefinition {
	return {
		name: "cactus-unwrap-images",
		paragraph(node): Image | undefined {
			const child = node.children[0];
			if (node.children.length === 1 && child?.type === "image") {
				return child;
			}
			return;
		},
	};
}

export function satteriFootnoteLabelPlugin(): HastPluginDefinition {
	return {
		name: "cactus-footnote-label",
		element: {
			filter: ["h2"],
			visit(node, ctx) {
				if (node.properties?.id !== "footnote-label") return;
				ctx.setProperty(node, "className", [""]);
			},
		},
	};
}

export function satteriExternalLinksPlugin(): HastPluginDefinition {
	return {
		name: "cactus-external-links",
		element: {
			filter: ["a"],
			visit(node, ctx) {
				const href = node.properties?.href;
				if (typeof href !== "string" || !href) return;

				let url: URL;
				try {
					url = new URL(href);
				} catch {
					return; // relative path or fragment, not "external"
				}

				if (url.protocol !== "http:" && url.protocol !== "https:") return;

				ctx.setProperty(node, "rel", ["noreferrer", "noopener"]);
				ctx.setProperty(node, "target", "_blank");
			},
		},
	};
}

export function satteriObsidianImageSizePlugin(): HastPluginDefinition {
	return {
		name: "cactus-obsidian-image-size",
		element: {
			filter: ["img"],
			visit(node, ctx) {
				const alt = node.properties?.alt;
				if (typeof alt !== "string") return;

				// Supports Obsidian image resize syntax:
				// ![alt|300](url), ![|300](url), ![alt|300x200](url), ![alt|50%](url)
				const match = alt.match(/^(.*?)\s*\|\s*(\d+%?)(?:x(\d+%?))?\s*$/);
				if (!match) return;

				const cleanAlt = match[1] ?? "";
				const rawWidth = match[2];
				const rawHeight = match[3];
				if (!rawWidth) return;

				const widthCss = rawWidth.endsWith("%") ? rawWidth : `${rawWidth}px`;
				const heightCss = rawHeight
					? rawHeight.endsWith("%")
						? rawHeight
						: `${rawHeight}px`
					: "auto";

				ctx.setProperty(node, "alt", cleanAlt);
				// Do not set node.width / node.height as HTML attributes to avoid Astro/Sharp
				// downscaling the source raster image. Keeping the original resolution ensures
				// Retina-crisp display quality while scaling purely via CSS.
				const existingStyle = node.properties?.style ? `${node.properties.style}; ` : "";
				ctx.setProperty(
					node,
					"style",
					`${existingStyle}width: ${widthCss}; max-width: 100%; height: ${heightCss};`,
				);
			},
		},
	};
}
