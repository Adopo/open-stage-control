var Widget = require('../common/widget'),
    {icon} = require('../../ui/utils'),
    keyboardJS = require('keyboardjs'),
    html = require('nanohtml'),
    raw = require('nanohtml/raw')

class Keys extends Widget {

    static description() {

        return 'Keyboard binding.'

    }

    static defaults() {

        return super.defaults({

            _keys:'keys',

            binding: {type: 'string|array', value: '', help: 'Key combo `string` or `array` of strings (see <a href="https://github.com/RobertWHurst/KeyboardJS">KeyboardJS</a> documentation)'},
            keydown: {type: 'string', value: '', help: [
                'This property is evaluated each time the key combo is pressed and defines the widget\'s own value. Formulas are given extras variables in this context:',
                '- `key`: pressed key name (usefull for handling multiple keys with a single keys widget, lowercased when referencing a character key)',
                '- `code`: pressed key code name (<a href="https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code#Code_values">full list</a>)',
                '- `ctrl`: control key state',
                '- `alt`: alt key state',
                '- `shift`: shift key state',
                '- `meta`: command/windows key state'
            ]},
            keyup: {type: 'string', value: '', help: 'Same as `keydown`, but evaluated when releasing the key combo'},
            repeat: {type: 'boolean', value: true, help: 'Set to `false` to prevent keydown repeats when holding the key combo pressed'},

        })


    }

    constructor(options) {

        super({...options, html: null})

        if (this.getProp('binding')) {

            this.keyDownHandler = this.keyDown.bind(this)
            this.keyUpHandler = this.keyUp.bind(this)

            keyboardJS.withContext('global', ()=>{

                keyboardJS.bind(this.getProp('binding'), this.keyDownHandler, this.keyUpHandler)

            })

        }

    }

    onRemove() {

        super.onRemove()

        if (this.getProp('binding')) {

            keyboardJS.withContext('global', ()=>{

                keyboardJS.unbind(this.getProp('binding'), this.keyDownHandler, this.keyUpHandler)

            })

        }

    }

    keyDown(e) {

        if (e.target && (e.target.tagName === 'INPUT' || e.target.tabName === 'TEXTAREA' || e.target.tabName === 'SELECT')) return

        if (!this.getProp('repeat') && e) e.preventRepeat()

        e.preventDefault()

        if (this.getProp('keydown') !== '') {

            var context = {
                key: e.key,
                code: e.code,
                ctrl: e.ctrlKey,
                shift: e.shiftKey,
                alt: e.altKey,
                meta: e.metaKey
            }

            if (context.key.length === 1) {
                context.key = context.key.toLowerCase()
            }

            this.setValue(this.resolveProp('keydown', undefined, false, false, false, context), {sync: true, send: true})

        }

    }


    keyUp(e) {

        if (e.target && (e.target.tagName === 'INPUT' || e.target.tabName === 'TEXTAREA' || e.target.tabName === 'SELECT')) return

        e.preventDefault()

        if (this.getProp('keyup') !== '') {

            var context = {
                key: e.key,
                code: e.code,
                ctrl: e.ctrlKey,
                shift: e.shiftKey,
                alt: e.altKey,
                meta: e.metaKey
            }

            if (context.key.length === 1) {
                context.key = context.key.toLowerCase()
            }

            this.setValue(this.resolveProp('keyup', undefined, false, false, false, context), {sync: true, send: true})

        }

    }

    setValue(v, options = {}) {

        this.value = v

        // if (options.send) this.sendValue()
        if (options.sync) this.changed(options)

    }

}

Keys.parsersContexts.keydown = Keys.parsersContexts.keyup = {
    key: 'x',
    code: 'x',
    ctrl: false,
    alt: false,
    shift: false,
    meta: false
}

Keys.dynamicProps = Keys.prototype.constructor.dynamicProps.concat(
    'keydown',
    'keyup',
    'repeat'
)

module.exports = Keys
