#!/usr/bin/env node

const path = require('path');
const yargs = require('yargs');

(async () => {
    await yargs
        .scriptName('ls-theme')
        .commandDir(path.resolve(__dirname, '../src/commands'))
        .demandCommand()
        .help()
        .argv
})();
