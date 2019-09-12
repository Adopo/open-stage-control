var {clip, mapToScale} = require('../utils'),
    Canvas = require('../common/canvas'),
    touchstate = require('../mixins/touch_state'),
    doubletab = require('../mixins/double_tap'),
    Input = require('../inputs/input'),
    html = require('nanohtml')

class Slider extends Canvas {

    constructor(options) {

        super({...options, html: html`
            <div class="slider">
                <div class="wrapper">
                    <canvas></canvas>
                </div>
            </div>
        `})

        this.wrapper = DOM.get(this.widget, '.wrapper')[0]

        this.value = undefined
        this.percent = 0

        this.unit = this.getProp('unit') ? ' ' + this.getProp('unit') : ''


        this.rangeKeys = []
        this.rangeVals = []
        this.rangeLabels = []

        for (var k in this.getProp('range')) {
            var key = k=='min'?0:k=='max'?100:parseInt(k),
                val = typeof this.getProp('range')[k] == 'object'?
                    this.getProp('range')[k][Object.keys(this.getProp('range')[k])[0]]:
                    this.getProp('range')[k],
                label = typeof this.getProp('range')[k] == 'object'?
                    Object.keys(this.getProp('range')[k])[0]:
                    val

            this.rangeKeys.push(key)
            this.rangeVals.push(val)
            this.rangeLabels.push(label)
        }
        this.rangeValsMax = Math.max(...this.rangeVals),
        this.rangeValsMin = Math.min(...this.rangeVals)

        this.originValue = this.getProp('origin')=='auto'?
            this.rangeValsMin:
            clip(this.getProp('origin'), [this.rangeValsMin,this.rangeValsMax])

        if (this.getProp('doubleTap')) {

            if (typeof this.getProp('doubleTap') === 'string' && this.getProp('doubleTap')[0] === '/') {

                doubletab(this.widget, ()=>{
                    this.sendValue({v:null, address: this.getProp('doubleTap')})
                })

            } else {

                doubletab(this.widget, ()=>{
                    this.setValue(this.getSpringValue(),{sync:true, send:true, fromLocal:true})
                })

            }

        }


        this.wrapper.addEventListener('mousewheel',this.mousewheelHandleProxy.bind(this))

        this.on('draginit', this.draginitHandleProxy.bind(this), {element:this.wrapper})
        this.on('drag', this.dragHandleProxy.bind(this), {element:this.wrapper})
        this.on('dragend', this.dragendHandleProxy.bind(this), {element:this.wrapper})

        touchstate(this, {element: this.wrapper})


        if (this.getProp('input')) {

            this.input = new Input({
                props:{
                    ...Input.defaults()._props(),
                    precision:this.getProp('precision'),
                    unit:this.getProp('unit'),
                    vertical: this.getProp('type') == 'fader' && this.getProp('compact') && !this.getProp('horizontal')
                },
                parent:this, parentNode:this.widget
            })

            this.input.sendValue = ()=>{}
            this.widget.appendChild(this.input.widget)
            this.input.on('change', (e)=>{
                e.stopPropagation = true
                this.setValue(this.input.getValue(), {sync:true, send:true})
                this.showValue()
            })

        }

        if (this.getProp('compact')) {
            this.widget.classList.add('compact')
            if (this.getProp('input')) {
                this.widget.addEventListener('fast-right-click', (e)=>{
                    if (e.detail.button == 2 && !EDITING) {
                        // Mouse only
                        this.input.focus()
                    }
                })
            }
        }

        this.setSteps()

        this.setValue(this.getSpringValue())

    }

    mousewheelHandleProxy() {

        this.mousewheelHandle(...arguments)

    }

    draginitHandleProxy() {

        this.draginitHandle(...arguments)

    }

    dragHandleProxy() {

        this.dragHandle(...arguments)

    }

    dragendHandleProxy() {

        this.dragendHandle(...arguments)

    }

    mousewheelHandle(e) {

        if (e.wheelDeltaX) return

        e.preventDefault()
        e.stopPropagation()

        var direction = e.wheelDelta / Math.abs(e.wheelDelta),
            increment = e.ctrlKey?0.25:1

        if (this.getProp('steps')) {
            var i = this.steps.indexOf(this.value)
            if (i > -1 && i < this.steps.length) {
                this.setValue(this.steps[i + direction], {sync: true, send: true, fromLocal: true})
            }
        } else {
            this.percent = clip(this.percent +  Math.max(increment,10/Math.pow(10,this.precision + 1)) * direction, [0,100])
            this.setValue(this.percentToValue(this.percent), {sync: true, send: true, dragged: true})
        }

    }

    draginitHandle(e, data, traversing) {

    }

    dragHandle(e, data, traversing) {

    }

    dragendHandle(e, data, traversing) {

        if (this.getProp('spring')) {
            this.setValue(this.getSpringValue(),{sync:true,send:true,fromLocal:true})
        }

    }

    cacheCanvasStyle(style) {

        style = style || window.getComputedStyle(this.canvas)

        super.cacheCanvasStyle(style)

        this.colors.gauge = style.getPropertyValue('--color-gauge') || this.colors.custom
        this.colors.knob = style.getPropertyValue('--color-knob') || this.colors.custom
        this.colors.pips = style.getPropertyValue('--color-pips') || this.colors.custom
        this.colors.gaugeOpacity = style.getPropertyValue('--gauge-opacity')


    }

    getSpringValue() {

        return this.getProp('default') !== '' ? this.getProp('default') :  this.originValue

    }


    percentToValue(percent) {

        var h = clip(percent,[0,100])
        for (var i=0;i<this.rangeKeys.length-1;i++) {
            if (h <= this.rangeKeys[i+1] && h >= this.rangeKeys[i]) {
                return mapToScale(h,[this.rangeKeys[i],this.rangeKeys[i+1]],[this.rangeVals[i],this.rangeVals[i+1]],false,this.getProp('logScale'))
            }
        }

    }

    valueToPercent(value) {

        for (var i=0;i<this.rangeVals.length-1;i++) {
            if (
                (this.rangeVals[i+1] > this.rangeVals[i] && value <= this.rangeVals[i+1] && value >= this.rangeVals[i]) ||
                (this.rangeVals[i+1] < this.rangeVals[i] && value >= this.rangeVals[i+1] && value <= this.rangeVals[i])
            ) {
                return mapToScale(value,[this.rangeVals[i],this.rangeVals[i+1]],[this.rangeKeys[i],this.rangeKeys[i+1]],false,this.getProp('logScale'),true)
            }
        }

    }

    setValue(v,options={}) {

        if (typeof v != 'number') return
        if (this.touched && !options.dragged) return this.setValueTouchedQueue = [v, options]

        var value = clip(v,[this.rangeValsMin,this.rangeValsMax])

        if ((options.dragged || options.fromLocal) && this.value.toFixed(this.precision) == value.toFixed(this.precision)) options.send = false

        this.value = value

        if (this.getProp('steps')) {

            var diff = this.steps.map(x => Math.abs(x - this.value)),
                index = diff.indexOf(Math.min(...diff)),
                val = this.steps[index]

            if (!isNaN(val)) this.value = clip(val, [this.rangeValsMin,this.rangeValsMax])

        }

        if (!options.dragged) this.percent = this.valueToPercent(this.value)

        this.batchDraw()

        this.showValue()

        if (options.send) this.sendValue()
        if (options.sync) this.changed(options)

    }

    showValue() {

        if (this.getProp('input')) this.input.setValue(this.value)

    }

    setSteps() {

        if (this.getProp('steps')) {
            var steps = this.getProp('steps')
            this.steps = Array.isArray(steps) ?
                steps : typeof steps === 'number' ?
                    Array(steps).fill(0).map((x, i) => i / (steps - 1) * (this.rangeValsMax - this.rangeValsMin) + this.rangeValsMin)
                    : this.rangeVals
        }

    }

    onPropChanged(propName, options, oldPropValue) {

        if (super.onPropChanged(...arguments)) return true

        switch (propName) {

            case 'color':
                if (this.input) this.input.onPropChanged('color')
                return
            case 'steps':
                this.setSteps()
                return

        }

    }

    onRemove() {
        if (this.input) this.input.onRemove()
        super.onRemove()
    }

}

Slider.dynamicProps = Slider.prototype.constructor.dynamicProps
    .filter(n => n !== 'precision')
    .concat([
        'steps',
        'spring',
        'sensitivity',
        'default',
    ])

module.exports = Slider
