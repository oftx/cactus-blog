import type { BlockContent, DefinitionContent, PhrasingContent } from "mdast";
import { directiveToMarkdown } from "mdast-util-directive";
import { toMarkdown } from "mdast-util-to-markdown";
import { toString as mdastToString } from "mdast-util-to-string";
import type { MdastPluginDefinition } from "satteri";
import type { AdmonitionType } from "@/types";
import { h } from "../utils/remark.ts";

// Supported admonition types
const Admonitions = new Set<AdmonitionType>(["tip", "note", "important", "caution", "warning"]);

/** Checks if a string is a supported admonition type. */
function isAdmonition(s: string): s is AdmonitionType {
	return Admonitions.has(s as AdmonitionType);
}

/**
 * From Astro Starlight:
 * Transforms directives not supported back to original form as it can break user content and result in 'broken' output.
 */
function serializeDirective(node: Parameters<typeof toMarkdown>[0]): string {
	const md = toMarkdown(node, { extensions: [directiveToMarkdown()] });
	return md.at(-1) === "\n" ? md.slice(0, -1) : md;
}

export function satteriAdmonitionsPlugin(): MdastPluginDefinition {
	return {
		name: "cactus-admonitions",
		textDirective(node) {
			if (node.data !== undefined) return;
			return { type: "text", value: serializeDirective(node) } as const;
		},
		leafDirective(node) {
			if (node.data !== undefined) return;
			return {
				type: "paragraph",
				children: [{ type: "text", value: serializeDirective(node) }],
			} as const;
		},
		containerDirective(node) {
			if (node.data !== undefined) return;
			const admonitionType = node.name;
			if (!isAdmonition(admonitionType)) {
				// Unrecognized ::: block — keep the content, drop the styling.
				return h("div", {}, [...node.children]);
			}

			let title: string = admonitionType;
			let titleNode: PhrasingContent[] = [{ type: "text", value: title }];

			// Check if there's a custom title
			const firstChild = node.children[0];
			if (
				firstChild?.type === "paragraph" &&
				firstChild.data &&
				"directiveLabel" in firstChild.data &&
				firstChild.children.length > 0
			) {
				titleNode = firstChild.children;
				title = mdastToString(firstChild.children);
				// The first paragraph contains a custom title, we can safely remove it.
				node.children.shift();
			}

			// Do not change prefix to AD, ADM, or similar, adblocks will block the content inside.
			return h(
				"aside",
				{ "aria-label": title, class: "admonition", "data-admonition-type": admonitionType },
				[
					h("p", { class: "admonition-title", "aria-hidden": "true" }, [...titleNode]),
					h("div", { class: "admonition-content" }, node.children),
				],
			);
		},
		blockquote(node) {
			// Check for GitHub / Obsidian Callout syntax: > [!NOTE], > [!WARNING], etc.
			const firstChild = node.children[0];
			if (firstChild?.type !== "paragraph" || !firstChild.children?.length) return;

			const firstInline = firstChild.children[0];
			if (firstInline?.type !== "text") return;

			const match = firstInline.value.match(
				/^\[!(NOTE|TIP|IMPORTANT|CAUTION|WARNING)\](?:[^\S\r\n]*([^\r\n]*))?(?:\r?\n([\s\S]*))?/i,
			);
			if (!match?.[1]) return;

			const admonitionType = match[1].toLowerCase() as AdmonitionType;
			const customTitle = match[2]?.trim();
			const remainingText = match[3] !== undefined ? match[3] : "";

			const titleText = customTitle || admonitionType.toUpperCase();
			const titleNode: PhrasingContent[] = [{ type: "text", value: titleText }];

			const newFirstParaChildren: PhrasingContent[] = [];
			if (remainingText.length > 0) {
				newFirstParaChildren.push({ type: "text", value: remainingText });
			}
			for (let i = 1; i < firstChild.children.length; i++) {
				const child = firstChild.children[i];
				if (child) newFirstParaChildren.push(child);
			}

			const contentChildren: (BlockContent | DefinitionContent)[] = [];
			if (newFirstParaChildren.length > 0) {
				contentChildren.push({ type: "paragraph", children: newFirstParaChildren });
			}
			for (let i = 1; i < node.children.length; i++) {
				const child = node.children[i];
				if (child) contentChildren.push(child);
			}

			return h(
				"aside",
				{
					"aria-label": titleText,
					class: "admonition",
					"data-admonition-type": admonitionType,
				},
				[
					h("p", { class: "admonition-title", "aria-hidden": "true" }, [...titleNode]),
					h("div", { class: "admonition-content" }, contentChildren),
				],
			);
		},
	};
}
