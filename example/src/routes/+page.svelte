<script>
  import Markdown from 'svelte-exmarkdown';

  const { data } = $props()
</script>

<!-- <h1>vite-plugin-favicon </h1> -->
<!---->
<!-- <h2> Generated Favicon Meta Data </h2> -->
<!-- <h2> Also check the actual header using DevTools </h2> -->

<Markdown
  md={`
# [vite-plugin-favicon](https://github.com/ryoppippi/vite-plugin-favicons)

[![npm version](https://img.shields.io/npm/v/vite-plugin-favicons?color=yellow)](https://npmjs.com/package/vite-plugin-favicons)
[![npm downloads](https://img.shields.io/npm/dm/vite-plugin-favicons?color=yellow)](https://npmjs.com/package/vite-plugin-favicons)

## Generated Favicon Meta Data
## Also check the actual header using DevTools
`}
/>

<div>
  {@html data.faviconsHtml}
</div>

<style>
div {
  font-size: 1rem;
}

:global{
  a{
    text-decoration: none; 
  }
}
</style>

