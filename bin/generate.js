#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const yargs = require('yargs');
const glob = require('glob');
const chalk = require('chalk');
const compiler = require('vue-template-compiler');
const moduleFromString = require('module-from-string');

(async () => {
    await yargs
        .scriptName('ls-theme-generate')
        .command('$0', 'Generate a Lemon Squeezy theme.json', (yargs) => {
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
        }, async (argv) => {
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
                templates: []
            };

            const components = loadComponents(path.resolve(themeDir, 'wedges'));
            theme.wedges = componentToWedgeConfig(components, themeDir);

            const output = JSON.stringify(theme, null, 4);

            const themePath = path.resolve(outputDir, 'theme.json');
            fs.writeFileSync(themePath, output);
            console.log(chalk.green(`Wrote theme.json to ${themePath}`));
        })
        .help()
        .argv
})();

function componentToWedgeConfig(components, themeDir) {
    return components.map(component => {
        return {
            name: component.name,
            component: component.file.replace(themeDir, '').replace(/^\//, ''),
            settings: component.props
        }
    });
}

function loadComponents(wedgesPath) {
    const files = glob.sync(`${wedgesPath}/**/*.vue`);
    return files.map(file => {
        console.log(`Processing ${file}...`);
        const content = fs.readFileSync(file).toString();
        const parsed = compiler.parseComponent(content);

        let props = {};
        if (parsed.script) {
            const script = moduleFromString.importFromStringSync(parsed.script.content);
            props = script.default.props ? script.default.props : {};
            props = typeof props === 'object' ? props : {}; // Arrays not supported

            props = objectMap(props, (prop, key) => {
                prop = typeof prop === 'object' ? prop : {}; // Arrays not supported
                return transformProp(key, prop);
            });
            props = JSON.parse(JSON.stringify(props));
        }

        return {
            file: file,
            name: path.parse(file).name,
            props: Object.values(props),
        }
    });
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
