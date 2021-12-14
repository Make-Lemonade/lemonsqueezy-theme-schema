const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { exec } = require("child_process");

exports.command = 'validate';
exports.desc = 'Validate a Lemon Squeezy theme.json';

exports.builder = (yargs) => {
    yargs.positional('themeDir', {
        type: 'string',
        alias: 't',
        default: './',
        describe: 'Path to a Lemon Squeezy theme directory'
    });
}

exports.handler = async (argv) => {
    const command = path.resolve(__dirname, '../../node_modules/.bin/ajv');
    const schema = path.resolve(__dirname, '../../schema.json');
    const themeDir = path.resolve(process.cwd(), argv.themeDir);
    const themePath = path.resolve(themeDir, 'theme.json');

    if (!fs.existsSync(themePath)) {
        console.log(chalk.red(`Could not find theme.json at ${themePath}`));
        return;
    }

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
}
