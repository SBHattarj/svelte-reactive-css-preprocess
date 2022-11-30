svelte-reactive-css-preprocess
==============================

*Note:* This is a fork of [this repo](https://github.com/srmullen/svelte-reactive-css-preprocess)

[![npm package](https://img.shields.io/npm/v/svelte-reactive-css-preprocess-with-object-array-support)](https://www.npmjs.com/package/svelte-reactive-css-preprocess-with-object-array-support)

Have you ever wished you could use your svelte variables in your component's styles. Now you can!

### Installation

`npm install --save-dev svelte-reactive-css-preprocess-with-object-array-support`

### Usage

In your svelte config

```javascript
import reactiveCSSPreprocessor from 'svelte-reactive-css-preprocess-with-object-array-support';

svelte({
  preprocess: [
    reactiveCSSPreprocessor()
  ]
})
```

If you're using [svelte-preprocess](https://github.com/sveltejs/svelte-preprocess) you need to run `svelte-reactive-css-preprocess` after all tasks for `svelte-preproccess complete. To do that use ['svelte-sequential-preprocessor'](https://github.com/pchynoweth/svelte-sequential-preprocessor).

`npm install --save-dev svelte-sequential-preprocessor.`

```javascript
import reactiveCSSPreprocessor from 'svelte-reactive-css-preprocess-with-object-array-support';
import sveltePreprocess from 'svelte-preprocess';
import seqPreprocess from 'svelte-sequential-preprocessor';

svelte({
  preprocess: seqPreprocess([
    sveltePreprocess({
      defaults: {
        style: "postcss",
      },
      postcss: true
    }),
    reactiveCSSPreprocess()
  ])
})
```

Now in your component's style you can reference the reactive variables using css variable syntax.

```html
<script>
  // Create some variables that hold information about the component's style.
  export let size = 200;
  export let color = '#f00';
  export let fontSize = 200;
  export let fontColor = "#bbb";
  $: styles = {
    fontSize,
    [0]: fontColor
  }
  $: sizepx = `${size}px`;
</script>

<div class="square">sample text</div>

<style>
  .square {
    /* Reference the Svelte variables using the var(--varname) syntax */
    width: var(--sizepx);
    height: var(--sizepx);
    background-color: var(--color);
    /* use - instead of "." to use property of an object*/
    font-size: var(--styles-fontSize)
    /* use -_number instaed of "[number]" to access number indexed property or array values*/
    color: var(--styles-_0)
  }
</style>
```

Now your styles update when your variables do!

### How it works

The preprocessor reads through the variables in each component's script and style tags. If a variable name appears in both the script and styles then a css variables that is scoped to the component is created and added to the `:root` pseudo-selector. In the component the css variables are replaced with the scoped variables. Variable scoping works similarly to how Svelte handles css scoping. The style tag for the above example would end up looking something like this...

```html
<style>
  :root {
    --sizepx-1l2ucck: inherit;
    --color-1l2ucck: inherit;
  }

  .square {
      width: var(--sizepx-1l2ucck);
      height: var(--sizepx-1l2ucck);
      background-color: var(--color-1l2ucck);
  }
</style>
```

In the script tag code is injected that handles updating the scoped css variables using Svelte's reactivity.