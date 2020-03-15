// This prevents argv parsing to be breaked when the app is packaged (executed without 'electron' prefix)
if (process.argv[1] && process.argv[1].indexOf('-') == 0) process.argv.unshift('')

// on windows, electron stops parsing after the first argument containing a colon
// https://github.com/electron/electron/pull/13039
// windows cli users need to add a double dash (--) before their options to avoid that
// it must be stripped to let yargs work normally
if (process.argv[2] == '--') process.argv.splice(2, 1)


var infos = require('../package.json')

var options = require('./options'),
    argv = require('yargs')
    .parserConfiguration({'boolean-negation': false})
    .help('help').usage('\nUsage:\n  $0 [options]').alias('h', 'help')
    .options(options)
    .check((argv)=>{
        var err = []
        for (key in options) {
            if (options[key].check && argv[key] != undefined) {
                var c = options[key].check(argv[key],argv)
                if (c!==true) {
                    err.push(`-${key}: ${c}`)
                }
            }
        }
        return err.length ? err.join('\n') : true
    })
    .strict()
    .version(infos.version).alias('v','version')

// litle hack to align long-only-options correctly
var h = argv.getUsageInstance().help
argv.getUsageInstance().help = ()=>{
    return h().replace(/^\s{2}--([^\s]*)\s{4}(\s*)/gm, '      --$1$2')
}

argv = argv.argv
delete argv._
delete argv.$0

// are we in a terminal ?
var cli = false,
    ignored = ['_', '$0', 'no-sandbox', 'noSandbox']

for (i in argv) {
    if (!ignored.includes(i) && (argv[i]!=undefined && argv[i]!==false)) cli = true
}

var fs = require('fs'),
    ifaces = require('os').networkInterfaces()


var baseDir = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'],
    configPath = baseDir ? require('path').join(baseDir, '.open-stage-control') : '',
    configFile = configPath ? function(){try {return JSON.parse(fs.readFileSync(configPath,'utf-8'))} catch(err) {return {}}}() : {},
    config = JSON.parse(JSON.stringify(configFile)),
    defaultConfig

if (!configPath) {
    console.warn('(WARNING) Home directory not found, settings and session history will not be saved.')
}


var makeDefaultConfig = function(argv){
    defaultConfig = {
        argv:argv,
        recentSessions: [],
        appName: infos.productName,
        instanceName: argv['instance-name'] || false,
        targets: argv['send'] || false,
        oscInPort: argv['osc-port'] || 0,
        httpPort: argv['port'] || 8080,
        tcpInPort: argv['tcp-port'] || false,
        tcpTargets: argv['tcp-targets'] || [],
        debug: argv['debug'] || false,
        sessionFile: argv['load'] || false,
        newSession: argv['blank'] || false,
        customModule: argv['custom-module'] || false,
        fullScreen: argv['fullscreen'] || false,
        noGui: argv['no-gui'] || false,
        guiOnly: typeof argv['gui-only'] == 'string' ? argv['gui-only'].length ? argv['gui-only'] : true : false,
        clientOptions: argv['client-options'] ? (function(){
            var opts = {}
            for (var o of argv['client-options']) {
                if (!o.includes('=')) continue
                var [k, v] = o.split('=')
                opts[k] = v
            }
            return opts
        })() : false,
        noVsync: argv['disable-vsync'] || false,
        noGpu: argv['disable-gpu'] || false,
        forceGpu: argv['force-gpu'] || false,
        readOnly: argv['read-only'] || false,
        remoteSaving: argv['remote-saving'] ? RegExp(argv['remote-saving']) : false,
        remoteRoot: argv['remote-root'] || false,
        midi: argv['midi'],
        stateFile: (function(){
            if (!argv['state']) return false
            try {
                return JSON.parse(fs.readFileSync(argv['state'], 'utf8'))
            } catch(err) {
                console.error(err)
                return false
            }
        })(),
        appAddresses: Object.values(ifaces)
                            .reduce((a,b)=>a.concat(b), [])
                            .filter(i=>i.family === 'IPv4')
                            .map(i=>'http://' + i.address + ':' + (argv['port'] || 8080)),
        examples: argv['examples'],
        theme: argv['theme'] || [],
        checkForUpdates: true
    }
}

makeDefaultConfig(argv)

module.exports = {
    argv:argv,
    options:options,
    makeDefaultConfig:makeDefaultConfig,
    read:function(key){
        var x = config[key] !== undefined ? config[key] : defaultConfig[key]
        return x
    },
    write:function(key,value,tmp) {
        config[key] = value
        if (tmp || !configPath) return
        configFile[key] = value
        fs.writeFile(configPath,JSON.stringify(configFile,null,4), function(err, data) {
            if (err) throw err
        })
    },
    cli: cli
}
