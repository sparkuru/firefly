/**
 * The small, site-owned class vocabulary available to authored Markdown HTML.
 * Authors should use these classes instead of adding presentation or chrome
 * selectors to document content.
 */
export const MARKDOWN_HTML_CLASS_NAMES = Object.freeze([
  'firefly-content-callout',
  'firefly-content-center'
]);

const contentClassPattern = /^firefly-content-(?:callout|center)$/u;
const generatedCodeClassPattern = /^language-[a-z0-9][a-z0-9+._-]*$/iu;
// Astro's built-in highlighter adds this inert language marker to <pre>.
const generatedLanguagePattern = /^[a-z0-9][a-z0-9+._-]*$/iu;
const generatedListClassNames = ['contains-task-list', 'task-list-item'];
const generatedIdPattern = /^(?:footnote-label|user-content-(?:fn|fnref)-[a-z0-9][a-z0-9-]*)$/iu;

// rehype-sanitize's protocol check intentionally accepts protocol-relative
// URLs as local-looking values. The schema also uses this anchored expression
// so only relative URLs, or explicit HTTP(S) URLs, reach the browser.
const safeUrlPattern = /^(?![\s\S]*[\u0000-\u001f\u007f\\])(?:https?:\/\/[^\s]+|(?:\/(?!\/)[^\s]*|\.{1,2}\/[^\s]*|[?#][^\s]*|(?!\/)(?![a-z][a-z\d+.-]*:)[^:\s][^\s]*))$/iu;

const commonAttributes = [
  ['className', contentClassPattern],
  ['id', generatedIdPattern],
  'title',
  'lang',
  'dir',
  'role',
  'ariaHidden',
  'ariaLabel',
  'ariaLabelledBy',
  'ariaDescribedBy'
];

const commonAttributesWithoutClass = commonAttributes.slice(1);
const codeClassAttribute = [
  'className',
  contentClassPattern,
  generatedCodeClassPattern
];
const listClassAttribute = [
  'className',
  contentClassPattern,
  ...generatedListClassNames
];
const footnoteBackrefClassAttribute = [
  'className',
  contentClassPattern,
  'data-footnote-backref'
];
const footnoteSectionClassAttribute = [
  'className',
  contentClassPattern,
  'footnotes'
];
const footnoteHeadingClassAttribute = [
  'className',
  contentClassPattern,
  'sr-only'
];

/**
 * Explicit policy for HTML authored in Markdown.
 *
 * The sanitizer keeps generated GFM classes and IDs that are needed for
 * existing Markdown output, while author classes remain limited to the
 * firefly-content-* vocabulary above. Dangerous elements are stripped with
 * their contents so script or style text cannot be published accidentally.
 */
export const markdownHtmlSchema = {
  allowComments: false,
  allowDoctypes: false,
  attributes: {
    '*': commonAttributes,
    a: [
      ...commonAttributesWithoutClass,
      footnoteBackrefClassAttribute,
      ['href', safeUrlPattern],
      'dataFootnoteRef'
    ],
    blockquote: [...commonAttributes, ['cite', safeUrlPattern]],
    code: [codeClassAttribute, ...commonAttributesWithoutClass],
    del: [...commonAttributes, ['cite', safeUrlPattern]],
    h2: [...commonAttributesWithoutClass, footnoteHeadingClassAttribute],
    img: [
      ...commonAttributes,
      'alt',
      ['src', safeUrlPattern],
      'width',
      'height',
      ['loading', 'lazy', 'eager'],
      ['decoding', 'async', 'sync', 'auto']
    ],
    ins: [...commonAttributes, ['cite', safeUrlPattern]],
    input: [
      ...commonAttributes,
      ['type', 'checkbox'],
      'checked',
      ['disabled', true]
    ],
    li: [listClassAttribute, ...commonAttributesWithoutClass],
    ol: [listClassAttribute, ...commonAttributesWithoutClass, 'start', 'reversed'],
    pre: [...commonAttributes, ['dataLanguage', generatedLanguagePattern]],
    q: [...commonAttributes, ['cite', safeUrlPattern]],
    section: [
      footnoteSectionClassAttribute,
      ...commonAttributesWithoutClass,
      'dataFootnotes'
    ],
    summary: commonAttributes,
    table: commonAttributes,
    td: [...commonAttributes, 'colSpan', 'rowSpan', 'headers'],
    th: [...commonAttributes, 'colSpan', 'rowSpan', 'headers', 'scope'],
    ul: [listClassAttribute, ...commonAttributesWithoutClass]
  },
  clobber: [],
  protocols: {
    cite: ['http', 'https'],
    href: ['http', 'https'],
    src: ['http', 'https']
  },
  required: {
    input: { type: 'checkbox', disabled: true }
  },
  strip: [
    'audio',
    'base',
    'button',
    'canvas',
    'embed',
    'form',
    'iframe',
    'link',
    'math',
    'meta',
    'object',
    'option',
    'script',
    'select',
    'style',
    'svg',
    'template',
    'textarea',
    'video'
  ],
  tagNames: [
    'a',
    'abbr',
    'address',
    'article',
    'aside',
    'b',
    'blockquote',
    'br',
    'caption',
    'center',
    'cite',
    'code',
    'col',
    'colgroup',
    'dd',
    'del',
    'details',
    'div',
    'dl',
    'dt',
    'em',
    'figcaption',
    'figure',
    'footer',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'header',
    'hr',
    'i',
    'img',
    'input',
    'ins',
    'kbd',
    'li',
    'main',
    'mark',
    'nav',
    'ol',
    'p',
    'pre',
    'q',
    'ruby',
    's',
    'samp',
    'section',
    'small',
    'span',
    'strong',
    'sub',
    'sup',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'tr',
    'u',
    'ul',
    'var'
  ]
};

export const MARKDOWN_HTML_SCHEMA = markdownHtmlSchema;
