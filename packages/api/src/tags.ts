// Splitting with a capture group keeps code at odd indexes, so hashtags are read and edited only in prose.
const MARKDOWN_CODE = /(?<code>```[\s\S]*?```|`[^`\n]*`)/u;

// `#` not glued to a word, URL, or entity; `# Heading` (space), `page/#anchor`, and a bare number like `#1` are not tags.
const HASHTAG =
  /(?<![\p{L}\p{N}_/#&])#(?<tag>(?=[\p{N}_-]*\p{L})[\p{L}\p{N}_-]+)/gu;

// A `#` the caret is still typing after, e.g. `see #arch|`; the name may be empty right after `#`.
const PARTIAL_HASHTAG = /(?<![\p{L}\p{N}_/#&])#(?<partial>[\p{L}\p{N}_-]*)$/u;

function isProse(_segment: string, index: number) {
  return index % 2 === 0;
}

// Raw `#tag` names written in a note; the notes router normalizes them.
export function extractTags(text: string) {
  return text
    .split(MARKDOWN_CODE)
    .filter(isProse)
    .flatMap((prose) =>
      [...prose.matchAll(HASHTAG)].map((match) => match.groups?.tag ?? "")
    );
}

// Unlinks an inline tag by dropping its `#`, so `#Backend` reads as `Backend`.
export function removeInlineTag(text: string, tag: string) {
  return text
    .split(MARKDOWN_CODE)
    .map((segment, index) =>
      isProse(segment, index)
        ? segment.replaceAll(HASHTAG, (match, name: string) =>
            name.toLowerCase() === tag ? name : match
          )
        : segment
    )
    .join("");
}

export function partialTagAt(text: string, caret: number) {
  return PARTIAL_HASHTAG.exec(text.slice(0, caret))?.groups?.partial ?? null;
}

// Inline tags as they are stored: lowercased and without repeats.
export function inlineTags(text: string) {
  return [...new Set(extractTags(text).map((tag) => tag.toLowerCase()))];
}

// Tags attached with "+ tag" rather than written in the text.
export function attachedTags(text: string, tags: string[]) {
  const inline = new Set(inlineTags(text));

  return tags.filter((tag) => !inline.has(tag));
}
