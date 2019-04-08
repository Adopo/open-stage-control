var {clip} = require('../utils'),
    Knob = require('./knob'),
    Widget = require('../common/widget'),
    doubletab = require('../mixins/double_tap'),
    html = require('nanohtml')



var EncoderKnob = class extends Knob {
    draginitHandle(e) {

        this.percent = clip(this.percent,[0,100])

        this.lastOffsetX = e.offsetX
        this.lastOffsetY = e.offsetY

        if (!(e.traversing || this.getProp('snap'))) return

        this.percent = this.angleToPercent(this.coordsToAngle(e.offsetX, e.offsetY))

        this.setValue(this.percentToValue(this.percent), {send:true,sync:true,dragged:true, draginit:!e.traversing})

    }
    mousewheelHandle(){}
}
var DisplayKnob = class extends Knob {

}

module.exports = class Encoder extends Widget {

    static defaults() {

        return super.defaults({

            _encoder: 'encoder',

            ticks: {type: 'number', value: 360, help: 'defines the granularity / verbosity of the encoder (number of step for a 360° arc)'},
            back: {type: '*', value: -1, help: 'Defines which value is sent when rotating the encoder anticlockwise'},
            forth: {type: '*', value: 1, help: 'Defines which value is sent when rotating the encoder clockwise'},
            release: {type: 'number', value: 'auto', help: [
                'Defines which value is sent when releasing the encoder:',
                '- Set to `null` to send send no argument in the osc message',
                '- Can be an `object` if the type needs to be specified'
            ]},
            snap: {type: 'boolean', value: false, help: 'By default, dragging the widget will modify it\'s value starting from its last value. Setting this to `true` will make it snap directly to the mouse/touch position'},
            doubleTap: {type: 'boolean', value: false, help: [
                'Set to `true` to make the fader reset to its `default` value when receiving a double tap.',
                'Can also be an osc address, in which case the widget will just send an osc message (`/<doubleTap> <preArgs>`)'
            ]},

        }, [], {

            touchAddress: {type: 'string', value:'', help: 'OSC address for touched state messages: `/touchAddress [preArgs] 0/1`'},

        })

    }

    constructor(options) {

        super({...options, html: html`
            <div class="encoder">
                <div class="wrapper">
                </div>
            </div>
        `})

        this.wrapper = DOM.get(this.widget, '.wrapper')[0]
        this.ticks = Math.abs(parseInt(this.getProp('ticks')) || 360)

        this.knob = new EncoderKnob({props:{
            label:false,
            angle:360,
            snap:true,
            range:{min:0,max:this.ticks},
            pips:false,
        }, parent: this})

        this.knob.batchDraw = ()=>{}

        this.display = new DisplayKnob({props:{
            label:false,
            angle:360,
            range:{min:0,max:this.ticks},
            origin:this.ticks/2,
            pips:false,
        }, parent: this})

        this.knob.widget.classList.add('drag-knob')
        this.display.widget.classList.add('display-knob')

        this.wrapper.appendChild(this.knob.widget)
        this.wrapper.appendChild(this.display.widget)

        this.knob.setValue(this.ticks/2)
        this.display.setValue(this.ticks/2)

        this.previousValue = this.ticks/2

        this.on('change',(e)=>{

            if (e.widget == this) return

            e.stopPropagation = true

            var value = this.knob.getValue()

            var direction

            if (value < this.previousValue)
                direction = this.getProp('back')
            if (value > this.previousValue)
                direction = this.getProp('forth')

            if ((this.ticks * .75 < value && value < this.ticks) && (0 < this.previousValue && this.previousValue < this.ticks / 4))
                direction = this.getProp('back')
            if ((0 < value && value < this.ticks / 4) && (this.ticks * .75 < this.previousValue && this.previousValue < this.ticks))
                direction = this.getProp('forth')


            if (direction && (Math.round(value) != Math.round(this.previousValue))) this.setValue(direction, {sync:true, send:true, dragged: e.options.dragged, draginit: e.options.draginit})
            this.previousValue = value

        })

        this.knob.on('draginit', (e)=>{
            if (this.getProp('touchAddress') && this.getProp('touchAddress').length
                && e.target == this.wrapper)
                this.sendValue({
                    address:this.getProp('touchAddress'),
                    v:1
                })
        })

        this.knob.on('dragend', (e)=>{
            if (this.getProp('release') !== '' && this.value !== this.getProp('release')) {
                this.knob.setValue(this.ticks/2)
                this.display.setValue(this.ticks/2)
                this.setValue(this.getProp('release'), {sync:true, send:true, dragged:false})
            }
            if (
                this.getProp('touchAddress') && this.getProp('touchAddress').length
                && e.target == this.wrapper
            ) {
                this.sendValue({
                    address:this.getProp('touchAddress'),
                    v:0
                })
            }
        })

        if (this.getProp('doubleTap')) {

            doubletab(this.wrapper, ()=>{
                this.knob.setValue(this.ticks/2)
                this.display.setValue(this.ticks/2)
                if (this.getProp('release') !== '' && this.value !== this.getProp('release')) {
                    this.setValue(this.getProp('release'), {sync:true, send:true, dragged:false})
                }
            })

        }

        this.wrapper.addEventListener('mousewheel', (e)=>{

            if (e.wheelDeltaX || e.wheelDelta == 0) return

            var direction = e.wheelDelta / Math.abs(e.wheelDelta)

            this.display.setValue(this.display.value + direction)
            this.setValue(direction < 0 ? this.getProp('back') : this.getProp('forth'), {sync:true, send:true})

            if (this.getProp('release') !== '' && this.value !== this.getProp('release')) {
                this.knob.setValue(this.ticks/2)
                this.display.setValue(this.ticks/2)
                this.setValue(this.getProp('release'), {sync:true, send:true, dragged:false})
            }
        })


    }

    setValue(v,options={}) {

        if (this.getProp('snap') || (!this.getProp('snap') && !options.draginit)) {

            var match = true

            if (v === this.getProp('back')) {
                this.value = this.getProp('back')
            } else if (v === this.getProp('forth')) {
                this.value = this.getProp('forth')
            } else if (v === this.getProp('release') && this.getProp('release') !== '') {
                this.value = this.getProp('release')
            } else {
                match = false
            }

        }

        if (options.sync && match) this.changed(options)
        if (options.send && match && !(!this.getProp('snap') && options.draginit)) this.sendValue()

        if (options.dragged || options.draginit) this.updateDisplay(options.draginit)

    }

    updateDisplay(init){

        if (this.getProp('snap')) {
            this.display.setValue(this.knob.value)
            return
        }

        if (init) {

            this.offset = this.knob.value - this.display.value

        } else {

            var v = this.knob.value - this.offset,
                updateOffset

            if (v > this.ticks) {

                v = this.ticks - v
                updateOffset = true


            } else if (v < 0) {

                v = v + this.ticks
                updateOffset = true

            }

            this.display.setValue(v)

            if (updateOffset) {
                this.offset = this.knob.value - this.display.value
            }
        }

        if (this.offset > this.ticks) this.offset = this.ticks - this.offset
        if (this.offset < 0) this.offset = this.offset + this.ticks

    }


    onPropChanged(propName, options, oldPropValue) {

        if (super.onPropChanged(...arguments)) return true

        switch (propName) {

            case 'color':
                for (var w of [this.knob, this.display]) {
                    w.onPropChanged('color')
                }
                return

        }

    }

    onRemove() {
        this.knob.onRemove()
        this.display.onRemove()
        super.onRemove()
    }

}
