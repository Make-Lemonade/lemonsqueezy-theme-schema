const path = require('path');
const fs = require('fs');
const glob = require('glob');
const chalk = require('chalk');
const compiler = require('vue-template-compiler');
const jsTokens = require('js-tokens');
const astWalker = require('@vuedx/template-ast-types');

exports.command = 'generate';
exports.desc = 'Generate a Lemon Squeezy theme.json';

exports.builder = (yargs) => {
    yargs.positional('themeDir', {
        type: 'string',
        alias: 't',
        default: './',
        describe: 'Path to a Lemon Squeezy theme directory'
    });
    yargs.positional('outputDir', {
        type: 'string',
        alias: 'o',
        default: './',
        describe: 'Path to an output directory for the generated theme.json'
    });
}

let elements = [];

exports.handler = async (argv) => {
    const themeDir = path.resolve(process.cwd(), argv.themeDir);
    const outputDir = path.resolve(process.cwd(), argv.outputDir);

    const pkg = require(path.resolve(themeDir, 'package.json'));

    let theme = {
        id: pkg.name,
        meta: {
            name: pkg.name,
            description: pkg.description || '',
        },
        settings: [],
        wedges: [],
        elements: [],
        templates: [],
    };

    elements       = loadElements(path.resolve(themeDir, 'node_modules/@lemonsqueezy/theme-elements/src/components'));
    theme.elements = componentToElementConfig(elements, themeDir);

    const wedges = loadWedges(path.resolve(themeDir, 'wedges'));
    theme.wedges = componentToWedgeConfig(wedges, themeDir);

    const output = JSON.stringify(theme, null, 4);

    const themePath = path.resolve(outputDir, 'theme.json');
    fs.writeFileSync(themePath, output);
    console.log(chalk.green(`Wrote theme.json to ${themePath}`));
}

function loadElements(elementsPath) {
    const files = glob.sync(`${elementsPath}/**/*.vue`);
    return files.map(file => {
        console.log(`Processing ${file}...`);
        const content = fs.readFileSync(file).toString();
        const parsed = compiler.parseComponent(content);

        let settings = componentPropsToSettings(parsed);
        settings = settings.filter(setting => setting.id !== 'id');

        return {
            file: file,
            name: path.parse(file).name,
            settings: settings,
        }
    });
}

function componentToElementConfig(components, themeDir) {
    return components.map(component => {
        return {
            name: component.name,
            component: component.file.replace(themeDir, '').replace(/^\//, ''),
            settings: component.settings
        }
    });
}

function loadWedges(wedgesPath) {
    const files = glob.sync(`${wedgesPath}/**/*.vue`);
    return files.map(file => {
        console.log(`Processing ${file}...`);
        const content = fs.readFileSync(file).toString();
        const parsed = compiler.parseComponent(content);

        const settings = componentPropsToSettings(parsed);

        let wedgeElements = [];
        const elementTags = elements.map(e => e.name);
        const component = compiler.compile(content);
        astWalker.traverseFast(component.ast, node => {
            if (elementTags.includes(node.tag) && node.attrsMap.id) {
                const thisElement = elements.find(e => e.name === node.tag);
                if (thisElement) {
                    wedgeElements.push({
                        id: node.attrsMap.id,
                        type: node.tag,
                    });
                }
            }
        });

        return {
            file: file,
            name: path.parse(file).name,
            settings: settings,
            elements: wedgeElements
        }
    });
}

function componentToWedgeConfig(components, themeDir) {
    return components.map(component => {
        return {
            name: component.name,
            component: component.file.replace(themeDir, '').replace(/^\//, ''),
            settings: component.settings,
            elements: component.elements
        }
    });
}

function componentPropsToSettings(parsedComponent) {
    let settings = {};

    if (parsedComponent.script) {
        let props = propsFromScript(parsedComponent.script.content);

        props = objectMap(props, (prop, key) => {
            prop = typeof prop === 'object' ? prop : {}; // Arrays not supported
            return transformProp(key, prop);
        });
        props = removeEmpty(props);

        settings = JSON.parse(JSON.stringify(props));
    }

    return Object.values(settings);
}

function propsFromScript(script) {
    let depth = 0;
    let isProps = false;
    let isPropsObject = false;
    let props = [];

    Array.from(jsTokens(script)).forEach(item => {
        if (isPropsObject && depth < 2) {
            isProps = false;
            isPropsObject = false;
        }

        if (item.type === 'IdentifierName' && item.value === 'props') {
            isProps = true;
            depth++;
        }

        if (isProps) {
            if (item.type === 'Punctuator' && item.value === '{') {
                isPropsObject = true;
                depth++;
            }
            if (item.type === 'Punctuator' && item.value === '}') {
                depth--;
            }

            if (isPropsObject) {
                props.push(item.value);
            }
        }
    });

    const propsString = props.join('');
    if (!propsString) {
        return {};
    }

    return Function('"use strict";return (' + propsString + ')')();
}

function transformProp(key, prop) {
    if (!prop.input) {
        return null;
    }

    return {
        id: key,
        ...prop.input,
    };
}

function removeEmpty(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null));
}

function objectMap(obj, fn) {
    return Object.fromEntries(
        Object.entries(obj).map(
            ([k, v], i) => [k, fn(v, k, i)]
        )
    );
}
