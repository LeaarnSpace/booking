// Markdown to HTML for previews in the back office. Raw HTML in the text is shown as text, and links only work
// for web and email addresses, so a preview can't run anything. (The website renders the same Markdown when it builds.)
import { Marked } from "marked";

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const md = new Marked({
  gfm: true,
  renderer: {
    html: ({ text }) => escape(text),
    link({ href, tokens }) {
      const label = this.parser.parseInline(tokens);
      return /^(https?:|mailto:)/i.test(href)
        ? `<a href="${escape(href)}" target="_blank" rel="noopener">${label}</a>`
        : label;
    },
  },
});

export const markdownToHtml = (text: string) => md.parse(text, { async: false });

/** HTML tags in Markdown would reach the website as they are, so they're refused when saving */
export const hasHtml = (text: string) => /<\/?[a-z][a-z0-9-]*(\s|>|\/)|<!--/i.test(text);
