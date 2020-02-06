var {mapToScale} = require('../utils'),
    Widget = require('../common/widget'),
    html = require('nanohtml'),
    StaticProperties = require('../mixins/static_properties')

module.exports = class Led extends StaticProperties(Widget, {bypass: true}) {

    static description() {

        return 'Intensity display.'

    }

    static defaults() {

        return super.defaults({

            _led:'led',

            range: {type: 'object', value: {min:0,max:1}, help: 'Value to led intensity mapping range'},
            logScale: {type: 'boolean|number', value: false, help: 'Set to `true` to use logarithmic scale (base 10). Set to a `number` to define the logarithm\'s base.'},

        }, ['precision', 'bypass'], {})

    }

    constructor(options) {

        // backward compat
        if (options.props.widgetId) {
            options.props.value = '@{' + options.props.widgetId + '}'
            delete options.props.widgetId
        }

        super({...options, html: html`<div class="led"></div>`})

        this.setValue(this.getProp('range').min)

    }

    setValue(v, options={}) {

        if (typeof v != 'number') return

        this.value = v
        this.widget.style.setProperty('--opacity', mapToScale(v,[this.getProp('range').min,this.getProp('range').max],[0,1],false,this.getProp('logScale'),true))

        if (options.sync) this.changed(options)

    }

}
