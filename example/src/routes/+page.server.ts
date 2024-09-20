import favicons from 'virtual:favicons'
import Shiki from '@shikijs/markdown-it'
import MarkdownIt from 'markdown-it'

import format from "html-format";

const md = MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})

md.use(await Shiki({
  themes: {
    light: 'vitesse-dark',
    dark: 'vitesse-dark',
  }
}))

export const load = async ()=>{
  const html = format(`<head>\n${favicons}\n</head>`);
  const mdRaw =`
# [vite-plugin-favicon](https://github.com/ryoppippi/vite-plugin-favicons)

[![npm version](https://img.shields.io/npm/v/vite-plugin-favicons?color=yellow)](https://npmjs.com/package/vite-plugin-favicons)
[![npm downloads](https://img.shields.io/npm/dm/vite-plugin-favicons?color=yellow)](https://npmjs.com/package/vite-plugin-favicons)

## Generated Favicon Meta Data
## Also check the actual header using DevTools

${"```html"}
${html}
${"```"}
`

  const markdown = md.render(mdRaw)

  return {  markdown }
}
