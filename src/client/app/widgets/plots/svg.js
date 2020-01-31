var Widget = require('../common/widget'),
    morph = require('nanomorph'),
    html = require('nanohtml')


class Svg extends Widget {

    static description() {

        return 'Svg parser.'

    }

    static defaults() {

        return super.defaults({

            _svg:'svg',

            svg: {type: 'string', value: '', help: [
                'Svg xml definition:',
                '- will be wrapped in a `< svg />` element',
                '- `<path>` commands support a special percent notation (`%x` and `%y`)'
            ]},
            border: {type: 'boolean', value: true, help: 'Set to `false` to disable the borders and background-color'},


        }, ['color', 'precision', 'bypass'], {})

    }

    constructor(options) {

        super({...options, html: html`
            <div class="svg">
                <svg></svg>
            </div>
        `})

        this.height = undefined
        this.width = undefined

        this.on('resize', this.resizeHandleProxy.bind(this), {element: this.widget})

        if (!this.getProp('border')) this.container.classList.add('noborder')

    }

    updateSvg(){

        if (!this.width || !this.height) return

        var svg = this.getProp('svg')

        svg = svg.replace(/<\/svg>/gi, 'x')
        svg = svg.replace(/([0-9.]+%x)/gi, m=>(parseFloat(m) * this.width / 100).toFixed(2))
        svg = svg.replace(/([0-9.]+%y)/gi, m=>(parseFloat(m) * this.height / 100).toFixed(2))


        var newSvg = html`<svg></svg>`,
            node = html`<div class="svg">${newSvg}</div>`

        newSvg.innerHTML = svg

        morph(this.widget, node)

    }

    resizeHandleProxy() {

        this.resizeHandle(...arguments)

    }

    resizeHandle(event){

        var {width, height} = event

        this.height = height
        this.width = width

        this.updateSvg()

    }


    onPropChanged(propName, options, oldPropValue) {

        if (super.onPropChanged(...arguments)) return true

        switch (propName) {

            case 'svg':
                this.updateSvg()
                return

        }

    }


}

Svg.dynamicProps = Svg.prototype.constructor.dynamicProps.concat(
    'svg'
)

module.exports = Svg
