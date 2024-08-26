<script>
  import favicons from 'virtual:favicons'

  const { data, children } = $props()
</script>

<svelte:head>
  {@html favicons}
</svelte:head>

{@render children()}
