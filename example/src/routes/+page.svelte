<script>
  const { data } = $props()
</script>

<div>
  {@html data.markdown}
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

