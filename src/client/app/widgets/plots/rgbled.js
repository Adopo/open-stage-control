var Widget = require('../common/widget'),
    {clip} = require('../utils'),
    html = require('nanohtml'),
    StaticProperties = require('../mixins/static_properties')

module.exports = class Rbgled extends StaticProperties(Widget, {bypass: true}) {

    static description() {

        return 'Rgb / rgba color display'

    }

    static defaults() {

        return super.defaults({}, ['color', 'precision', 'bypass'], {

            value: {type: 'array|string', value: '', help: [
                '- `Array`: `[r, g, b]` (`r`, `g` and `b` between `0` and `255`)',
                '- `Array`: `[r, g, b, alpha]` (`alpha` between `0` and `255`)',
                '- `String`: CSS color',
            ]}

        })

    }

    constructor(options) {

        // backward compat
        if (options.props.widgetId) {
            options.props.value = '@{' + options.props.widgetId + '}'
            delete options.props.widgetId
        }

        super({...options, html: html`
            <div class="led">
            </div>
        `})

        this.setValue([0,0,0,0])

    }


    setValue(v, options={}) {

        var c = ''

        if (Array.isArray(v) && v.length >= 3) {

            for (let i in [0,1,2]) {
                v[i] = parseInt(clip(v[i],[0,255]))
            }

            v[3] = clip(v[3] != undefined ? v[3] : 1,[0,1])

            c = `rgba(${v[0]}, ${v[1]}, ${v[2]}, ${v[3]})`

        } else if (typeof v == 'string') {

            c = v


        } else {

            return

        }

        this.value = v

        this.widget.style.setProperty('--color-led', c)

        if (options.sync) this.changed(options)

    }

}
