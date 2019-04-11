var Widget = require('../common/widget'),
    widgetManager = require('../../managers/widgets'),
    {icon} = require('../../ui/utils'),
    html = require('nanohtml'),
    raw = require('nanohtml/raw')


class Script extends Widget {

    static description() {

        return 'Evaluates a script each time it receives a value.'

    }

    static defaults() {

        return super.defaults({

            _script:'script',

            condition: {type: 'string', value: 1, help: [
                'When the widget receives a value, if this property return a falsy value, the script property won\'t be evaluated. If it\'s non-falsy, it will be evaluated normally. Formulas are given one extra variable in this context:',
                '- `value`: the value received by the widget'
            ]},
            script: {type: 'string', value: '', help: [
                'This property is evaluated each time the widget receives a value* if condition is non-falsy. Formulas are given extras variables in this context:',
                '- `value`: the value received by the widget',
                '- `send(target, address, arg1, arg2, ...)`: function for sending osc messages (ignores the script\'s targets and the server\'s defaults unless `target` is `false`; ignores the script\'s `preArgs`)',
                '- `set(id, value)`: function for setting a widget\'s value',
                '',
                '* Note: `value` or `linkId` properties can be used to receive other widgets\' values. The `value` property must actually change to trigger the execution, where linked widgets via `linkId` can submit the same value over and over and trigger the execution',
            ]}

        })

    }

    constructor(options) {

        super({...options, html: html`
            <div class="script">
                ${raw(icon('code'))}
            </div>
        `})

    }


    static scriptSet(id, value, options) {

        var widgets = widgetManager.getWidgetById(id)

        for (var i = widgets.length - 1; i >= 0; i--) {

            return widgets[i].setValue(value, options)

        }

    }

    scriptSend(target, address, ...args) {

        var overrides = {
            address,
            v: args,
            preArgs: []
        }

        if (target) overrides.target = Array.isArray(target) ? target : [target]

        this.sendValue(overrides)

    }


    setValue(v, options={} ) {

        var context = {
            value: v,
            send: options.send ? this.scriptSend.bind(this) : ()=>{},
            set: (id, value)=>{Script.scriptSet(id, value, options)},
            log: console.log
        }

        var condition = this.resolveProp('condition', undefined, false, false, false, {value: v})

        if (condition) this.resolveProp('script', undefined, false, false, false, context)

        // if (options.send) this.sendValue()
        if (options.sync) this.changed(options)

    }


}

Script.parsersContexts.condition = {
    value: ''
}

Script.parsersContexts.script = {
    value: '',
    send: ()=>{},
    set: ()=>{}
}

Script.dynamicProps = Script.prototype.constructor.dynamicProps.concat(
    'condition',
    'script'
)

module.exports = Script
