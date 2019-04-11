var _switchers_base = require('./_switchers_base'),
    Switch = require('../buttons/switch'),
    html = require('nanohtml')

var switchDefaults = Switch.defaults()._props()

module.exports = class Switcher extends _switchers_base {

    static description() {

        return 'Store other widgets\' values and recall them.'

    }

    static defaults() {

        return super.defaults({

            _switcher: 'switcher',

            linkedWidgets: {type: 'string|array', value: '', help: [
                '- `String`: a widget\'s `id` whose state changes will be stored',
                '- `Array`: a list of widget `id` string'
            ]},
            horizontal: {type: 'boolean', value: false, help: 'Set to `true` to display values horizontally'},
            values: {type: 'array|object', value: {'Value 1':1,'Value 2':2}, help: [
                'Each item represents a bank that stores the values from the widgets listed in `linkedWidgets`',
                '- `Array` of possible values to switch between : `[1,2,3]`',
                '- `Object` of `"label":value` pairs. Numeric labels must be prepended or appended with a white space (or any other non-numeric character) otherwise the order of the values won\'t be kept',
            ]}
        })

    }

    constructor(options) {

        super({...options, html: html`<div class="switcher"></div>`})

        if (this.getProp('horizontal')) this.widget.classList.add('horizontal')

        this.switch = new Switch({props:{
            ...switchDefaults,
            label:false,
            values:this.getProp('values'),
            value: this.getProp('value'),
            horizontal:this.getProp('horizontal')
        }, parent: this})

        this.switch.sendValue = ()=>{}

        this.widget.appendChild(this.switch.widget)

        this.switch.on('change', (e)=>{

            e.stopPropagation = true
            e.options.fromSelf = true

            this.setValue(this.switch.getValue(), e.options)

        })


    }

    setValue(v, options={}) {

        super.setValue(v, options)

        if (!options.fromSelf) this.switch.setValue(this.value._selected)

    }

    onPropChanged(propName, options, oldPropValue) {

        if (super.onPropChanged(...arguments)) return true

        switch (propName) {

            case 'color':
                for (var w of [this.switch]) {
                    w.onPropChanged('color')
                }
                return

        }

    }

    onRemove() {
        this.switch.onRemove()
        super.onRemove()
    }

}
