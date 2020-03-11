var urlparser   = require('url'),
    path        = require('path'),
    fs          = require('fs'),
    send        = require('send'),
    http        = require('http'),
    server      = http.createServer(httpRoute),
    Ipc         = require('./ipc/server'),
    ipc         = new Ipc(server),
    settings     = require('./settings'),
    theme       = require('./theme').init(),
    zeroconf = require('./zeroconf'),
    appAddresses = settings.read('appAddresses'),
    osc = {},
    clients = {},
    httpCheckTimeout

function httpRoute(req, res) {

    res.sendFile = (path)=>{
        var fpath = path.split('?')[0]
        if (!fs.existsSync(fpath)) throw `File "${fpath}" not found.`
        send(req, fpath).pipe(res)
    }

    var url = req.url

    if (url === '/' || url.indexOf('/?') === 0) {

        res.sendFile(path.resolve(__dirname + '/../client/index.html'))

    } else {

        if (url.indexOf('theme.css') != -1) {

            res.setHeader('Content-Type', 'text/css')
            if (settings.read('theme')) {
                var str = theme.get(),
                    buf = Buffer.from && Buffer.from !== Uint8Array.from ? Buffer.from(str) : new Buffer(str)
                res.write(buf)
            } else {
                res.write('')
            }
            res.end()

        } else if (/^\/(assets|client)\//.test(url)){

            res.sendFile(path.resolve(__dirname + '/..' + url))

        } else {

            // windows absolute path fix
            url = url.replace('_:_', ':') // escaped drive colon
            url = url.replace(/^\/([^/]*:)/, '$1') // strip leading slash

            if (url.match(/.(jpg|jpeg|png|apng|gif|webp|tiff|xbm|bmp|ico|ttf|otf|woff|woff2|html|css|js)(\?[0-9]*)?$/i)) {
                try {
                    // relative resolution (session path)
                    var id = urlparser.parse('?' + req.headers.cookie, true).query.client_id,
                        sessionPath = path.dirname(ipc.clients[id].sessionPath)

                    res.sendFile(path.resolve(sessionPath + url))
                } catch(e) {
                    // absolute resolution (session path)
                    res.sendFile(path.resolve(url))
                }
            } else if (url.includes('/osc-ping')) {
                httpCheck(true)
            } else {
                res.writeHead(403)
                res.end()
            }

        }

    }
}

server.on('error', (e)=>{
    if (e.code === 'EADDRINUSE') {
        console.error(`(ERROR, HTTP) Could not open port ${oscInPort} (already in use) `)
    } else {
        console.error(`(ERROR, HTTP) ${e.message}`)
    }
})

server.listen(settings.read('httpPort'))

http.get(settings.read('appAddresses')[0] + '/osc-ping', ()=>{}).on('error', ()=>{httpCheck(false)})
httpCheckTimeout = setTimeout(()=>{httpCheck(false)}, 5000)
function httpCheck(ok){
    if (!httpCheckTimeout) return
    clearTimeout(httpCheckTimeout)
    httpCheckTimeout = null
    if (ok) {
        console.log('(INFO) Server started, app available at \n    ' + appAddresses.join('\n    '))
    } else {
        console.error('(ERROR, HTTP) Could not setup http server, maybe try a different port ?')
    }
}

zeroconf.publish({
    name: settings.read('appName') + (settings.read('instanceName') ? ' (' + settings.read('instanceName') + ')' : ''),
    type: 'http',
    port: settings.read('httpPort')
}).on('error', (e)=>{
    console.error(`(ERROR, ZEROCONF) ${e.message}`)
})

var bindCallbacks = function(callbacks) {

    ipc.on('connection', function(client) {

        var clientInfos = {address: client.address, id: client.id}

        for (let name in callbacks) {
            client.on(name, (data)=>{
                if (osc.customModule) {
                    osc.customModuleEventEmitter.emit(name, data, clientInfos)
                }
                callbacks[name](data, client.id)
            })
        }

        client.on('close', function() {

            callbacks.removeClientWidgets(client.id)

        })

    })

}

module.exports =  {
    ipc:ipc,
    bindCallbacks:bindCallbacks,
    clients:clients
}

osc = require('./osc').server
