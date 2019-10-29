var Container = require('../common/container'),
    {enableTraversingGestures} = require('../../events/drag'),
    html = require('nanohtml')


module.exports = class _matrix_base extends Container() {

    constructor(options) {

        super({...options, html: html`<div class="matrix"></div>`})

        this.value = []

        if (this.getProp('traversing')) enableTraversingGestures(this.widget)

    }

    onPropChanged(propName, options, oldPropValue) {

        if (super.onPropChanged(...arguments)) return true

        switch (propName) {

            case 'color':
                for (var w of this.children) {
                    if (w) w.onPropChanged('color')
                }
                return

        }

    }

}
