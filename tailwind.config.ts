import type { Config } from "tailwindcss";

export default {
	plugins: [require("@tailwindcss/typography")],
	theme: {
		extend: {
			typography: () => ({
				DEFAULT: {
					css: {
						a: {
							textUnderlineOffset: "2px",
							"&:hover": {
								"@media (hover: hover)": {
									textDecorationColor: "var(--color-link)",
									textDecorationThickness: "2px",
								},
							},
						},
						blockquote: {
							borderLeftWidth: "0.25rem",
							borderLeftColor: "var(--color-quote-border)",
							borderLeftStyle: "solid",
							paddingLeft: "1rem",
							fontStyle: "normal",
							color: "var(--color-muted)",
						},
						"blockquote p:first-of-type::before": {
							content: "none",
						},
						"blockquote p:last-of-type::after": {
							content: "none",
						},
						"blockquote a": {
							color: "inherit",
						},
						ol: {
							listStyleType: "none",
							counterReset: "cactus-ol-counter",
							paddingLeft: "0",
							paddingInlineStart: "0",
						},
						"ol > li": {
							counterIncrement: "cactus-ol-counter",
							position: "relative",
							paddingLeft: "1.75rem",
							paddingInlineStart: "1.75rem",
						},
						"ol > li::before": {
							content: 'counter(cactus-ol-counter) "."',
							position: "absolute",
							left: "0",
							top: "0",
							width: "1.75rem",
							textAlign: "left",
							color: "var(--color-muted)",
							fontWeight: "400",
						},
						"ol > li::marker": {
							content: "none",
						},
						code: {
							padding: "0.2em 0.4em",
							margin: "0",
							fontSize: "85%",
							whiteSpace: "break-spaces",
							backgroundColor: "var(--color-inline-code-bg)",
							borderRadius: "6px",
							fontWeight: "normal",
							border: "none",
						},
						"code::before": {
							content: "none",
						},
						"code::after": {
							content: "none",
						},
						kbd: {
							"&:where([data-theme='dark'], [data-theme='dark'] *)": {
								background: "var(--color-global-text)",
							},
						},
						hr: {
							height: "0.25em",
							padding: "0",
							margin: "1.5rem 0",
							backgroundColor: "var(--color-quote-border)",
							border: "0",
						},
						strong: {
							fontWeight: "700",
						},
						sup: {
							marginInlineStart: "calc(var(--spacing) * 0.5)",
							a: {
								"&:after": {
									content: "']'",
								},
								"&:before": {
									content: "'['",
								},
								"&:hover": {
									"@media (hover: hover)": {
										color: "var(--color-link)",
									},
								},
							},
						},
						/* Table */
						"tbody tr": {
							borderBottomWidth: "none",
						},
						tfoot: {
							borderTop: "1px dashed #666",
						},
						thead: {
							borderBottomWidth: "none",
						},
						"thead th": {
							borderBottom: "1px dashed #666",
							fontWeight: "700",
						},
						'th[align="center"], td[align="center"]': {
							"text-align": "center",
						},
						'th[align="right"], td[align="right"]': {
							"text-align": "right",
						},
						'th[align="left"], td[align="left"]': {
							"text-align": "left",
						},
						".expressive-code, .admonition, .github-card": {
							marginTop: "calc(var(--spacing)*4)",
							marginBottom: "calc(var(--spacing)*4)",
						},
					},
				},
				sm: {
					css: {
						"blockquote a": {
							color: "inherit",
						},
						code: {
							fontSize: "85%",
							fontWeight: "400",
						},
						ol: {
							listStyleType: "none",
							counterReset: "cactus-ol-counter",
							paddingLeft: "0",
							paddingInlineStart: "0",
						},
						"ol > li": {
							counterIncrement: "cactus-ol-counter",
							position: "relative",
							paddingLeft: "1.75rem",
							paddingInlineStart: "1.75rem",
						},
						"ol > li::before": {
							content: 'counter(cactus-ol-counter) "."',
							position: "absolute",
							left: "0",
							top: "0",
							width: "1.75rem",
							textAlign: "left",
							color: "var(--color-muted)",
							fontWeight: "400",
						},
						"ol > li::marker": {
							content: "none",
						},
					},
				},
			}),
		},
	},
} satisfies Config;
