"use strict";
exports.__esModule = true;
var compiler_1 = require("svelte/compiler");
// The variable name to inject into components to bind to an html element. Used to check that the reactive statement is running client-side.
var documentBinding = '__reactivecssbinding__';
function intersection(arrA, arrB) {
    var _intersection = [];
    for (var _i = 0, arrB_1 = arrB; _i < arrB_1.length; _i++) {
        var elem = arrB_1[_i];
        if (arrA.includes(elem)) {
            _intersection.push(elem);
        }
    }
    return _intersection;
}
function intersectionScriptToStyle(scripts, styles) {
    var selectedStyle = [];
    var selectedScript = [];
    return intersection(scripts, styles.map(function (style) { return style.replace(/\-.+$/, ""); })).map(function (variable) {
        var _a, _b;
        return ({
            name: variable,
            style: styles.find(function (style) {
                if (!style.startsWith(variable))
                    return false;
                if (selectedStyle.includes(style))
                    return false;
                selectedStyle.push(style);
                return true;
            }),
            script: (_b = (_a = styles.find(function (style) {
                if (!style.startsWith(variable))
                    return false;
                if (selectedScript.includes(style))
                    return false;
                selectedScript.push(style);
                return true;
            })) === null || _a === void 0 ? void 0 : _a.replace(/\-\_[^-]+\-{0,1}/g, function (match) { return "?.[".concat(parseInt(match.replace(/[-_]/g, "")), "]").concat(match[match.length - 1] === "-" ? "-" : ""); })) === null || _b === void 0 ? void 0 : _b.replace(/\-[^-]+\-{0,1}/g, function (match) { return "?.".concat(match.replace(/\-/g, "")).concat(match[match.length - 1] === "-" ? "-" : ""); })
        });
    });
}
// https://github.com/sveltejs/svelte/blob/master/src/compiler/compile/utils/hash.ts
function hash(str) {
    str = str.replace(/\r/g, '');
    var hash = 5381;
    var i = str.length;
    while (i--)
        hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
    return (hash >>> 0).toString(36);
}
function toCSSVariables(vars) {
    var out = '';
    for (var _i = 0, _a = vars.variables; _i < _a.length; _i++) {
        var style = _a[_i].style;
        out += "--".concat(style, "-").concat(vars.hash, ": inherit;\n");
    }
    return out;
}
function createVariableUpdaters(vars) {
    var out = "let ".concat(documentBinding, ";\n");
    for (var _i = 0, _a = vars.variables; _i < _a.length; _i++) {
        var _b = _a[_i], style = _b.style, script = _b.script;
        out += "$: if (".concat(documentBinding, ") {\n  const r = document.querySelector(':root');\n  r.style.setProperty('--").concat(style, "-").concat(vars.hash, "', ").concat(script, ");\n}\n");
    }
    return out;
}
function createDocumentBinding() {
    return "<span style=\"display: none;\" bind:this={".concat(documentBinding, "}></span>");
}
function cssUpdatePreprocessor() {
    var files = {};
    return {
        markup: function (_a) {
            var content = _a.content, filename = _a.filename;
            var ast = (0, compiler_1.parse)(content);
            var scriptVars = [];
            var styleVars = [];
            var nodeTypes = ['Script', 'Program', 'ExportNamedDeclaration', 'LabeledStatement', 'VariableDeclaration', 'VariableDeclarator'];
            (0, compiler_1.walk)(ast.instance, {
                enter: function (node) {
                    if (!nodeTypes.includes(node.type)) {
                        this.skip();
                    }
                    if (node.type === 'VariableDeclarator') {
                        scriptVars.push(node === null || node === void 0 ? void 0 : node.id.name);
                    }
                    // handle `$: myvar = 'something'` syntax
                    if (node.type === 'ExpressionStatement') {
                        (0, compiler_1.walk)(node.expression, {
                            enter: function (node) {
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
            (0, compiler_1.walk)(ast.css, {
                enter: function (node) {
                    if (node.type === 'Function' && node.name === 'var') {
                        // substr to remove leading '--'
                        styleVars.push(node.children[0].name.substr(2));
                    }
                }
            });
            // Find variables that are referenced in the css vars and set them in the files object.
            var variables = intersectionScriptToStyle(scriptVars, styleVars);
            if (variables.length) {
                // append the document binding tag to the markup
                var code = content + createDocumentBinding();
                files[filename] = {
                    variables: variables,
                    hash: hash(filename)
                };
                return {
                    code: code
                };
            }
        },
        script: function (_a) {
            var content = _a.content, filename = _a.filename;
            if (!files[filename]) {
                return;
            }
            // insert style updaters
            var code = content + createVariableUpdaters(files[filename]);
            return {
                code: code
            };
        },
        style: function (_a) {
            var content = _a.content, filename = _a.filename;
            if (!files[filename]) {
                return;
            }
            var file = files[filename];
            // add hash to variables
            var code = content;
            for (var _i = 0, _b = file.variables; _i < _b.length; _i++) {
                var style = _b[_i].style;
                var re = new RegExp("var\\(\\s*--".concat(style, "\\s*\\)"), 'g');
                code = code.replace(re, "var(--".concat(style, "-").concat(file.hash, ")"));
            }
            // insert style variables
            var varsDeclaration = ":root {\n".concat(toCSSVariables(files[filename]), "}\n");
            code = varsDeclaration + code;
            return {
                code: code
            };
        }
    };
}
exports["default"] = cssUpdatePreprocessor;
