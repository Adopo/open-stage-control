var {clip} = require('../utils'),
    Slider = require('./slider')

module.exports = class Knob extends Slider {

    static defaults() {

        return super.defaults({

            _knob:'knob',

            pips: {type: 'boolean', value: false, help: 'Set to `true` to show the scale\'s breakpoints'},
            input: {type: 'boolean', value: true, help: 'Set to `false` to hide the built-in input'},
            compact: {type: 'boolean', value: false, help: 'Set to `true` to display a compact alternative for the widget. If `input` is `true`, the input can be focused with a right-click (mouse only). Disables `pips` when enabled.'},
            dashed: {type: 'boolean', value: false, help: 'Set to `true` to display a dashed gauge'},
            angle: {type: 'number', value: 270, help: 'Defines the angle\'s width of the knob, in degrees'},
            snap: {type: 'boolean', value: false, help: 'By default, dragging the widget will modify it\'s value starting from its last value. Setting this to `true` will make it snap directly to the mouse/touch position'},
            spring: {type: 'boolean', value: false, help: 'When set to `true`, the widget will go back to its `default` value when released'},
            doubleTap: {type: 'boolean', value: false, help: [
                'Set to `true` to make the knob reset to its `default` value when receiving a double tap.',
                'Can also be an osc address, in which case the widget will just send an osc message (`/<doubleTap> <preArgs>`)'
            ]},
            range: {type: 'object', value: {min:0,max:1}, help: [
                'Defines the breakpoints of the fader\'s scale:',
                '- keys can be percentages and/or `min` / `max`',
                '- values can be `number` or `object` if a custom label is needed',
                'Example: (`{min:{"-inf": 0}, "50%": 0.25, max: {"+inf": 1}}`)'
            ]},
            logScale: {type: 'boolean|number', value: false, help: 'Set to `true` to use logarithmic scale (base 10). Set to a `number` to define the logarithm\'s base.'},
            sensitivity: {type: 'number', value: 1, help: 'Defines the knob\'s sensitivity when `snap` is `false` '},
            steps: {type: 'string|number|array', value: '', help: [
                'Restricts the widget\'s value:',
                '- `auto`: use values defined in `range`',
                '- `number`: define a number of evenly spaced steps',
                '- `array`: use arbitrary values',
            ]},
            unit: {type: 'string', value: '', help: 'Unit will be appended to the displayed widget\'s value (it doesn\'t affect osc messages)'},
            origin: {type: 'number', value: 'auto', help: 'Defines the starting point\'s value of the knob\'s gauge'},

        }, [], {

            touchAddress: {type: 'string', value:'', help: 'OSC address for touched state messages: `/touchAddress [preArgs] 0/1`'},
            css: {type: 'string', value: '', help: [
                'Available CSS variables:',
                '- `--color-gauge: color;`',
                '- `--color-knob: color;`',
                '- `--color-pips: color;`'
            ]}

        })

    }

    constructor(options) {

        super(options)

        this.widget.classList.add('knob')

        this.lastOffsetX = 0
        this.lastOffsetY = 0
        this.minDimension = 0

        this.maxAngle = this.getProp('angle')

        // calculate lost height factor
        var a = (1 - Math.sin((Math.max(this.maxAngle,247.5) - 180) / 2 * Math.PI / 180)) / 3
        this.lostHeightFactor = a / 4


        if (this.getProp('pips')) {

            this.widget.classList.add('has-pips')
            this.pipTexts = {}
            for (var k in this.rangeKeys) {
                this.pipTexts[this.rangeKeys[k]]=this.rangeLabels[k]
            }

        }

    }

    draginitHandle(e) {

        this.percent = clip(this.percent,[0,100])

        this.lastOffsetX = e.offsetX
        this.lastOffsetY = e.offsetY

        // if (!(e.traversing || this.getProp('snap'))  || e.ctrlKey) return

        if (this.getProp('snap')) {

            this.percent = this.angleToPercent(this.coordsToAngle(e.offsetX, e.offsetY))

            this.setValue(this.percentToValue(this.percent), {send:true,sync:true,dragged:true})

        }


    }

    dragHandle(e) {

        if (!(e.traversing || this.getProp('snap')) || e.ctrlKey) {
            // vertical
            this.percent = -100 * (e.movementY / e.inertia * this.getProp('sensitivity')) / this.height + this.percent

        } else {
            //snap
            var offsetX = this.lastOffsetX + e.movementX / e.inertia,
                offsetY = this.lastOffsetY + e.movementY / e.inertia

            if (e.traversing && !this.getProp('snap')) {

                var diff = this.angleToPercent(this.coordsToAngle(offsetX, offsetY), true) - this.angleToPercent(this.coordsToAngle(this.lastOffsetX, this.lastOffsetY), true)
                if (Math.abs(diff) < 50 && diff !== 0) this.percent += diff

            } else {

                // snap
                this.percent = this.angleToPercent(this.coordsToAngle(offsetX, offsetY))

            }

            this.lastOffsetX = offsetX
            this.lastOffsetY = offsetY

        }


        this.percent = clip(this.percent,[0,100])

        this.setValue(this.percentToValue(this.percent), {send:true,sync:true,dragged:true})

    }

    coordsToAngle(x,y) {

        var xToCenter = x - this.width /2,
            yToCenter = y - this.height / 2,
            angle =  Math.atan2(-yToCenter, -xToCenter) * 180 / Math.PI + 90

        return angle<0?360+angle:angle

    }

    angleToPercent(angle, ignoreMaxAngle=false) {

        return ignoreMaxAngle ?
            clip(angle, [0, 360]) / 360 * 100 :
            clip(angle - (360 - this.maxAngle) / 2, [0, this.maxAngle]) / this.maxAngle * 100

    }

    percentToAngle(percent) {

        percent = clip(percent, [0, 100])

        return  2 * Math.PI * percent / 100 * (this.maxAngle / 360) // angle relative to maxAngle
                + Math.PI / 2                                       // quarter circle offset
                + Math.PI * (1 - this.maxAngle / 360)               // centering offset depending on maxAngle

    }

    resizeHandle() {

        super.resizeHandle(...arguments)

        this.minDimension = Math.min(this.width, this.height)

        this.wrapper.style.top = (this.minDimension) * this.lostHeightFactor - (this.getProp('label') === false ? 0 : this.gaugeWidth / 4) + 'px'

    }

    draw() {

        var percent = this.getProp('steps') ? this.valueToPercent(this.value) : this.percent,
            o = this.percentToAngle(this.valueToPercent(this.originValue)),
            d = this.percentToAngle(percent),
            min = this.percentToAngle(0),
            max = this.percentToAngle(100),
            dashed = this.getProp('dashed'),
            pips = this.getProp('pips'),
            gaugeWidth = Math.max(7 * PXSCALE, this.minDimension / 20),
            gaugeRadius = this.minDimension / 2 - gaugeWidth / 2 - 2 * PXSCALE,
            knobRadius = gaugeRadius - gaugeWidth,
            rad = PXSCALE /  gaugeRadius / 2


        if (this.getProp('compact')) {
            pips = false
            gaugeWidth = this.minDimension / 4
            gaugeRadius = this.minDimension / 2 - gaugeWidth / 2
        }


        if (pips) {
            gaugeRadius -= this.fontSize * PXSCALE * 1.5 + gaugeWidth / 2
            knobRadius = gaugeRadius - gaugeWidth
        }


        this.ctx.clearRect(0,0,this.width,this.height)

        this.ctx.globalAlpha = 1

        this.ctx.strokeStyle = this.colors.light
        this.ctx.lineWidth = gaugeWidth
        this.ctx.beginPath()
        this.ctx.arc(this.width / 2, this.height / 2, gaugeRadius, min - 4 * rad, max + 4 * rad)
        this.ctx.stroke()

        this.ctx.strokeStyle = this.colors.bg
        this.ctx.lineWidth = gaugeWidth - 2 * PXSCALE
        this.ctx.beginPath()
        this.ctx.arc(this.width / 2, this.height / 2, gaugeRadius, min - 2 * rad, max + 2 * rad)
        this.ctx.stroke()

        if (dashed) this.ctx.setLineDash([1.5 * PXSCALE, 1.5 * PXSCALE])

        this.ctx.strokeStyle = this.colors.track
        this.ctx.lineWidth = gaugeWidth - 4.5 * PXSCALE
        this.ctx.beginPath()
        this.ctx.arc(this.width / 2, this.height / 2, gaugeRadius, min, max)
        this.ctx.stroke()

        this.ctx.globalAlpha = 0.7
        this.ctx.strokeStyle = this.colors.gauge
        this.ctx.lineWidth = gaugeWidth - 4.5 * PXSCALE
        this.ctx.beginPath()

        this.ctx.arc(this.width / 2, this.height / 2, gaugeRadius, o, d, o > d)
        this.ctx.stroke()

        if (dashed) this.ctx.setLineDash([])

        if (this.getProp('compact')) {
            this.ctx.globalAlpha = 1
            let r1 = gaugeRadius - gaugeWidth / 2 + 2 * PXSCALE,
                r2 = gaugeRadius + gaugeWidth / 2 - 2 * PXSCALE,
                a  = 2 * Math.PI - d

            this.ctx.beginPath()
            this.ctx.moveTo(r1 * Math.cos(a) + this.width / 2, this.height / 2 - r1 * Math.sin(a))
            this.ctx.lineTo(r2 * Math.cos(a) + this.width / 2, this.height / 2 - r2 * Math.sin(a))

            this.ctx.lineWidth = PXSCALE
            this.ctx.strokeStyle = this.colors.knob
            this.ctx.stroke()
            return
        }

        if (pips) {

            this.ctx.globalAlpha = 1

            for (var pip of this.rangeKeys.concat(this.valueToPercent(this.originValue))) {

                let a = this.percentToAngle(pip)

                this.ctx.lineWidth = gaugeWidth + 2 * PXSCALE
                this.ctx.beginPath()
                this.ctx.arc(this.width / 2, this.height / 2, gaugeRadius, a - 4.5 * rad, a + 4.5 * rad)
                this.ctx.strokeStyle = this.colors.fg
                this.ctx.stroke()
                this.ctx.strokeStyle = this.colors.light
                this.ctx.stroke()

                this.ctx.lineWidth = gaugeWidth + 1.5 * PXSCALE
                this.ctx.strokeStyle = this.colors.pips
                this.ctx.beginPath()
                this.ctx.arc(this.width / 2, this.height / 2, gaugeRadius, a - 2 * rad, a + 2 * rad)
                this.ctx.stroke()

            }

            var radius = gaugeRadius + this.fontSize * PXSCALE + gaugeWidth / 2
            this.ctx.fillStyle = this.colors.textFade
            for (var p in this.pipTexts) {
                if (this.pipTexts[p] == undefined) continue
                var angle = this.percentToAngle(p),
                    size = this.ctx.measureText(this.pipTexts[p]),
                    x = this.width / 2 + radius * Math.cos(angle) - size.width / 2,
                    y = this.height / 2 + radius * Math.sin(angle)
                this.ctx.fillText(this.pipTexts[p], x, y)
            }

        }

        // knob

        this.ctx.lineWidth = PXSCALE

        this.ctx.fillStyle = this.colors.raised
        this.ctx.beginPath()
        this.ctx.globalAlpha = 1
        this.ctx.arc(this.width / 2, this.height / 2,  knobRadius, 0, Math.PI * 2)
        this.ctx.fill()
        this.ctx.strokeStyle = this.colors.bg
        this.ctx.stroke()

        this.ctx.beginPath()
        this.ctx.globalAlpha = 1
        this.ctx.arc(this.width / 2, this.height / 2,  knobRadius - PXSCALE * 1.5, 0, Math.PI * 2)
        this.ctx.strokeStyle = this.colors.light
        this.ctx.stroke()

        var g = this.ctx.createLinearGradient(this.width / 2, this.height / 2 - knobRadius / 2,this.width / 2,  this.height / 2 + knobRadius / 2)
        g.addColorStop(0.5, 'transparent')
        g.addColorStop(0, this.colors.light || 'transparent')

        this.ctx.strokeStyle = g
        this.ctx.stroke()

        // cursor
        this.ctx.globalAlpha = 1

        let r1 = knobRadius - PXSCALE,
            r2 = knobRadius / 4,
            a  = 2 * Math.PI - d

        this.ctx.beginPath()
        this.ctx.moveTo(r1 * Math.cos(a) + this.width / 2, this.height / 2 - r1 * Math.sin(a))
        this.ctx.lineTo(r2 * Math.cos(a) + this.width / 2, this.height / 2 - r2 * Math.sin(a))

        this.ctx.lineWidth = gaugeWidth - 4.5 * PXSCALE
        this.ctx.strokeStyle = this.colors.knob
        this.ctx.stroke()

    }

}
