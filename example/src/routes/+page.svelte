<script>
import FaviconHead from 'vite-plugin-favicons/svelte'

const { data } = $props()
</script>

<FaviconHead/>

<h1> Generated Favicon Meta Data </h1>
<h2> Also check the actual header using DevTools </h2>

<div>
  {@html data.faviconsHtml}
</div>

<style>
div {
  font-size: 1rem;
}
</style>

