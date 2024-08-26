<script>
import favicons from 'virtual:favicons'

const { data } = $props()
</script>

<svelte:head>
  {@html favicons}
</svelte:head>

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

