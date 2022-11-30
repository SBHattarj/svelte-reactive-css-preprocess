import {parse, walk} from "svelte/compiler"

// The variable name to inject into components to bind to an html element. Used to check that the reactive statement is running client-side.
const documentBinding = '__reactivecssbinding__';

function intersection<T>(arrA: T[], arrB: T[]) {
  let _intersection = [] as T[];
  for (let elem of arrB) {
      if (arrA.includes(elem)) {
          _intersection.push(elem);
      }
  }
  return _intersection;
}

type Variable = {
  style: string,
  script: string,
  name: string
}

type Variables = {
  variables: Variable[],
  hash: string
}

function intersectionScriptToStyle(scripts: string[], styles: string[]): Variable[] {
  let selectedStyle = [] as string[]
  let selectedScript = [] as string[]
  return intersection(scripts, styles.map(style => style.replace(/\-.+$/, ""))).map(variable => ({
    name: variable,
    style: styles.find(style => {
      if(!style.startsWith(variable)) return false
      if(selectedStyle.includes(style)) return false
      selectedStyle.push(style)
      return true
    } ) as string,
    script: styles.find(style => {
      if(!style.startsWith(variable)) return false
      if(selectedScript.includes(style)) return false
      selectedScript.push(style)
      return true
    } )?.replace(/\-\_[^-]+(?=\-{0,1})/g, (match) => `?.[${parseInt(match.replace(/[-_]/g, ""))}]`)?.replace(/-/g, "?.") as string
  }))
}

// https://github.com/sveltejs/svelte/blob/master/src/compiler/compile/utils/hash.ts
function hash(str: string) {
	str = str.replace(/\r/g, '');
	let hash = 5381;
	let i = str.length;

	while (i--) hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
	return (hash >>> 0).toString(36);
}

function toCSSVariables(vars: Variables) {
  let out = '';
  for (let {style} of vars.variables) {
    out += `--${style}-${vars.hash}: inherit;\n`;
  }
  return out;
}

function createVariableUpdaters(vars: Variables) {
  let out = `let ${documentBinding};\n`;
  for (let {style, script} of vars.variables) {
    out += `$: if (${documentBinding}) {
  const r = document.querySelector(':root');
  r.style.setProperty('--${style}-${vars.hash}', ${script});
}\n`;
  }
  return out;
}

function createDocumentBinding() {
  return `<span style="display: none;" bind:this={${documentBinding}}></span>`;
}

export default function cssUpdatePreprocessor() {
  const files: {
    [key: string]: Variables
  } = {};

  return {
    markup: ({ content, filename }: {content: string, filename: string}) => {
      const ast = parse(content);

      const scriptVars = [] as any[];
      const styleVars = [] as any[];

      const nodeTypes = ['Script', 'Program', 'ExportNamedDeclaration', 'LabeledStatement', 'VariableDeclaration', 'VariableDeclarator'];

      walk(ast.instance, {
        enter(node: any) {
          if (!nodeTypes.includes(node.type)) {
            this.skip();
          }

          if (node.type === 'VariableDeclarator') {
            scriptVars.push(node?.id.name);
          }

          // handle `$: myvar = 'something'` syntax
          if (node.type === 'ExpressionStatement') {
            walk(node.expression, {
              enter(node: any) {
                if (['AssignmentExpression'].includes(node.type)) {
                  if (node.left.type === 'Identifier') {
                    scriptVars.push(node.left.name);
                  }

                  this.skip();
                }
              }
            });
          }
        }
      });

      walk(ast.css, {
        enter(node: any) {
          if (node.type === 'Function' && node.name === 'var') {
            // substr to remove leading '--'
            styleVars.push(node.children[0].name.substr(2));
          }
        }
      });

      // Find variables that are referenced in the css vars and set them in the files object.
      const variables = intersectionScriptToStyle(scriptVars, styleVars);
      if (variables.length) {
        // append the document binding tag to the markup
        const code = content + createDocumentBinding();
        
        files[filename] = {
          variables,
          hash: hash(filename)
        };

        return {
          code
        };
      }
    },
    script: ({ content, filename }) => {
      if (!files[filename]) {
        return;
      }

      // insert style updaters
      const code = content + createVariableUpdaters(files[filename]);
      return {
        code
      };
    },
    style: ({ content, filename }) => {
      if (!files[filename]) {
        return;
      }

      const file = files[filename];

      // add hash to variables
      let code = content;
    
      for (let {style} of file.variables) {
        const re = new RegExp(`var\\(\\s*--${style}\\s*\\)`, 'g');
        code = code.replace(re, `var(--${style}-${file.hash})`);
      }

      // insert style variables
      let varsDeclaration = `:root {\n${toCSSVariables(files[filename])}}\n`;

      code = varsDeclaration + code;
      return {
        code
      };
    }
  }
}