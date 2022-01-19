const path = require('path');
const fs = require('fs');
const glob = require('glob');
const chalk = require('chalk');
const compiler = require('vue-template-compiler');
const moduleFromString = require('module-from-string');
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
        const script = moduleFromString.importFromStringSync(parsedComponent.script.content);
        let props = script.default.props ? script.default.props : {};
        props = typeof props === 'object' ? props : {}; // Arrays not supported

        props = objectMap(props, (prop, key) => {
            prop = typeof prop === 'object' ? prop : {}; // Arrays not supported
            return transformProp(key, prop);
        });

        settings = JSON.parse(JSON.stringify(props));
    }

    return Object.values(settings);
}

function transformProp(key, prop) {
    prop.input = prop.input ? prop.input : {
        type: 'text'
    };

    return {
        id: key,
        ...prop.input,
    };
}

function objectMap(obj, fn) {
    return Object.fromEntries(
        Object.entries(obj).map(
            ([k, v], i) => [k, fn(v, k, i)]
        )
    );
}
