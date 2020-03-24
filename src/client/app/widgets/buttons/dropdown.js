var Widget = require('../common/widget'),
    {iconify} = require('../../ui/utils'),
    html = require('nanohtml'),
    raw = require('nanohtml/raw'),
    iOS = require('../../ui/ios')

class Dropdown extends Widget {

    static description() {

        return 'Native dropdown menu.'

    }


    static defaults() {

        return super.defaults({

            _dropdown:'dropdown',

            values: {type: 'array|object', value: {'Value 1':1,'Value 2':2}, help: [
                '`Array` of possible values to switch between : `[1,2,3]`',
                '`Object` of label:value pairs. Numeric labels must be prepended or appended with a white space (or any other non-numeric character) otherwise the order of the values won\'t be kept',
                'An empty option will always be prepended to values (sends an osc message without any value); it can be hidden by adding `option:first-child{display:none}` to the widget\'s `css`'
            ]}

        })

    }

    constructor(options) {

        super({...options, html: html`<div class="select"></div>`})

        this.select = this.widget.appendChild(html`<select class="no-keybinding"></select>`)

        this.values = []
        this.keys = []

        this.parseValues()

        this.select.addEventListener('change', ()=>{
            this.setValue(this.values[this.select.selectedIndex - 1], {sync:true, send:true, fromLocal:true})
        })

        this.value = undefined
        this.select.selectedIndex = -1
        this.container.classList.add('noselect')

    }

    parseValues() {

        var i = 0,
            values = this.getProp('values')

        if (!Array.isArray(values) && !(typeof values === 'object' && values !== null)) {
            values = values !== '' ? [values] : []
        }

        this.select.innerHTML = ''
        this.select.appendChild(html`<option value=""></option>`)

        this.values = []

        for (var k in values) {
            this.values.push(values[k])
            this.select.appendChild(html`
                <option value="${i}">
                    ${raw(iconify(parseFloat(k) != k ? k : values[k]))}
                </option>
            `)
            i++
        }

    }

    setValue(v,options={}) {

        var i = this.values.indexOf(v)

        this.value = this.values[i]

        if (!options.fromLocal) {
            this.select.selectedIndex = i + 1
            if (iOS && document.activeElement === this.select) this.select.blur()
        }

        if (options.send) this.sendValue()
        if (options.sync) this.changed(options)

    }

    onPropChanged(propName, options, oldPropValue) {

        var ret = super.onPropChanged(...arguments)

        switch (propName) {

            case 'values':
                this.parseValues()
                this.setValue(this.value)
                return

        }

        return ret

    }

}

Dropdown.dynamicProps = Dropdown.prototype.constructor.dynamicProps.concat(
    'values'
)


module.exports = Dropdown
