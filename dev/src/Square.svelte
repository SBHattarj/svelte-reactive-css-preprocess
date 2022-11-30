<script>
  export let size = 200;
  export let color = 'red';
  $: prop = {color, size: {[25]: `${size}px`}}
  $: console.log(prop)
  $: sizepx = `${size}px`;
</script>

<div class="square"></div>

<style>
  .square {
    width: var(--prop-size-_25);
    height: var(--sizepx);
    background-color: var(--prop-color);
  }
</style>

