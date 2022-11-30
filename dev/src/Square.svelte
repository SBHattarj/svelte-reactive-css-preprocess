<script>
  export let size = 200;
  export let color = 'red';
  $: prop = {color, [0]: {[0] : {size: `${size}px`}}}
  $: console.log(prop)
  $: sizepx = `${size}px`;
</script>

<div class="square"></div>

<style>
  .square {
    width: var(--prop-_0-_0-size);
    height: var(--sizepx);
    background-color: var(--prop-color);
  }
</style>

