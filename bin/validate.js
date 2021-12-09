#!/usr/bin/env node

const path = require('path');
const yargs = require('yargs');
const chalk = require('chalk');
const { exec } = require("child_process");

yargs
    .scriptName('ls-theme-validate')
    .command('$0', 'Generate a Lemon Squeezy theme.json', (yargs) => {
        yargs.positional('themeDir', {
            type: 'string',
            alias: 't',
            default: './',
            describe: 'Path to a Lemon Squeezy theme directory'
        });
    }, (argv) => {
        const command = path.resolve(__dirname, '../node_modules/.bin/ajv');
        const schema = path.resolve(__dirname, '../schema.json');
        const themeDir = path.resolve(process.cwd(), argv.themeDir);
        const themePath = path.resolve(themeDir, 'theme.json');

        exec(`${command} -s ${schema} -d ${themePath}`, (error, stdout, stderr) => {
            if (error) {
                console.log(chalk.red(error.message));
                return;
            }
            if (stderr) {
                console.log(chalk.red(stderr));
                return;
            }
            console.log(chalk.green(stdout));
        });
    })
    .help()
    .argv
