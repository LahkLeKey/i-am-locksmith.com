/**
 * Shared theme configuration for syntax highlighting and styling
 * Centralized to enable consistent styling across the application
 */

export default {
  'code[class*="language-"]': {
    color: '#c5c8c6',
    fontFamily: 'var(--font-geist-mono)',
    direction: 'ltr',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    lineHeight: '1.5',
    MozTabSize: '4',
    OTabSize: '4',
    tabSize: '4',
    WebkitHyphens: 'none',
    MozHyphens: 'none',
    msHyphens: 'none',
    hyphens: 'none',
    fontSize: 12,
  },
  'pre[class*="language-"]': {
    color: '#c5c8c6',
    fontFamily: 'var(--font-geist-mono)',
    direction: 'ltr',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    lineHeight: '1.5',
    MozTabSize: '4',
    OTabSize: '4',
    tabSize: '4',
    WebkitHyphens: 'none',
    MozHyphens: 'none',
    msHyphens: 'none',
    hyphens: 'none',
    padding: '16px 0px 32px',
    margin: '.5em 0',
    overflow: 'auto',
    borderRadius: '0.3em',
    background: 'white',
    fontSize: 12,
    height: '100%',
  },
  ':not(pre) > code[class*="language-"]': {
    background: 'white',
    padding: '.1em',
    borderRadius: '.3em',
  },
  comment: {
    color: '#7C7C7C',
  },
  prolog: {
    color: '#7C7C7C',
  },
  doctype: {
    color: '#7C7C7C',
  },
  cdata: {
    color: '#7C7C7C',
  },
  punctuation: {
    color: '#c5c8c6',
  },
  property: {
    color: '#a1efe4',
  },
  keyword: {
    color: '#66d9ef',
  },
  tag: {
    color: '#66d9ef',
  },
  constant: {
    color: '#ae81ff',
  },
  symbol: {
    color: '#ae81ff',
  },
  deleted: {
    color: '#f92672',
  },
  boolean: {
    color: '#ae81ff',
  },
  number: {
    color: '#ae81ff',
  },
  attr_name: {
    color: '#a1efe4',
  },
  string: {
    color: '#e6db74',
  },
  char: {
    color: '#e6db74',
  },
  builtin: {
    color: '#e6db74',
  },
  inserted: {
    color: '#e6db74',
  },
  operator: {
    color: '#f8f8f2',
  },
  entity: {
    color: '#f92672',
    cursor: 'help',
  },
  url: {
    color: '#e6db74',
  },
  '.language-css .token.string': {
    color: '#f8f8f2',
  },
  '.style .token.string': {
    color: '#f8f8f2',
  },
  'pre[class*="language-"].line-numbers': {
    paddingLeft: '3.8em',
  },
  'pre[class*="language-"].line-numbers code': {
    position: 'relative',
    whiteSpace: 'inherit',
  },
};
