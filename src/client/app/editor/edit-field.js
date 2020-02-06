var widgetCategories = require('../widgets/').categories,
    {updateWidget} = require('./data-workers'),
    widgetManager = require('../managers/widgets'),
    {deepCopy} = require('../utils'),
    {icon, Popup} = require('../ui/utils'),
    locales = require('../locales'),
    html = require('nanohtml'),
    raw = require('nanohtml/raw')

module.exports = function editField(editor, widget, propName, defaultValue){

    let dynamic = widget.isDynamicProp(propName),
        disabled = widget.disabledProps.indexOf(propName) > -1,
        error = widget.errors[propName]

    let field = html`
        <div class="input-wrapper ${widget.errors[propName] ? 'error' : ''} ${disabled ? 'disabled' : ''}" title="${locales('editor_click_for_help')}">
            <label class="btn ${error ? 'error' : ''}">${propName}</label>
        </div>
    `

    let input

    if (propName !== 'widgets' && propName !== 'tabs') {

        if (propName == 'type') {

            if (widget.props.type == 'tab' || widget.props.type == 'root') {
                field.classList.add('disabled')
                field.appendChild(html`<textarea class="input no-keybinding" name="${propName}" rows="1" disabled>${widget.props[propName]}</textarea>`)
                return field
            }

            input = html`<select class="input no-keybinding"/>`

            for (let category in widgetCategories) {
                var optGroup = html`<optgroup label="> ${category}"></optgroups>`
                for (let type of widgetCategories[category]) {
                    optGroup.appendChild(html`
                        <option ${type == widget.props.type ? 'selected' : ''} value="${type}">
                            ${type}
                        </option>
                    `)
                }
                input.appendChild(optGroup)
            }

            var wrapper = html`<div class="select-wrapper"></div>`
            wrapper.appendChild(input)
            field.appendChild(wrapper)


        } else {

            var value = typeof widget.props[propName] !== 'string' ?
                JSON.stringify(widget.props[propName], null, '  ').replace(/\n\s\s\s\s/g, ' ').replace(/\n\s\s(\}|\])/g, ' $1') : widget.props[propName]

            input = html`<textarea class="input no-keybinding" name="${propName}" rows="${value.split('\n').length}">${value}</textarea>`

            DOM.addEventListener(input, ['input', 'focus'], ()=>{
                input.setAttribute('rows',0)
                input.setAttribute('rows', input.value.split('\n').length)
            })

            input.addEventListener('keydown', (e)=>{
                if (e.keyCode == 13 && !e.shiftKey) {
                    e.preventDefault()
                    DOM.dispatchEvent(input, 'change')
                }
            })

            if (defaultValue.type.includes('boolean')) {

                let toggle = html`
                   <span class="checkbox ${widget.getProp(propName) ? 'on' : ''}">
                       ${raw(icon('check'))}
                   </span>
               `

                toggle.addEventListener('click', ()=>{
                    if (propName === 'label' && !widget.getProp(propName) === true) {
                        // special case
                        input.value = 'auto'
                    } else {
                        input.value = !widget.getProp(propName)
                    }
                    DOM.dispatchEvent(input, 'change')
                })

                field.appendChild(toggle)

            }

            field.appendChild(input)

        }
        var lock,
            selectedWidgets = [...editor.selectedWidgets]

        var onChange = ()=>{

            if (lock) return
            lock = true

            input.blur()

            var v
            var str = input.value.replace(/[‟”]/g, '"').replace(/[‘’]/g, '\'') // convert invalid quote characters

            try {
                v = JSON.parseFlex(str)
                if (typeof v === 'string') {
                    // escape backslashes in simple strings only
                    v = JSON.parseFlex(str.replace(/\\/g, '__BACKSLASH__'))
                    v = v.replace(/__BACKSLASH__/g, '\\')
                }
            } catch(err) {
                v = str
            }

            var newWidgets = []
            for (var w of selectedWidgets) {
                if (propName === 'address' && v === '') {
                    // special case
                    w.props[propName] = '/' + w.props.id
                } else {
                    w.props[propName] = v !== '' ? v : deepCopy(defaultValue.value)
                }
                newWidgets.push(updateWidget(w, {changedProps: [propName], preventSelect: selectedWidgets.length > 1}))
            }
            editor.pushHistory()
            if (newWidgets.length > 1) editor.select(newWidgets)

            lock = false

        }

        input.addEventListener('change', onChange)


    } else if (
        (propName === 'widgets' && (!widget.props.tabs ||! widget.props.tabs.length)) ||
        (propName === 'tabs' && (!widget.props.widgets ||! widget.props.widgets.length))
    ) {

        if (editor.selectedWidgets.length > 1) return

        var list = html`<ul></ul>`

        for (var i in widget.props[propName]) {

            list.appendChild(html`
                <li class="sortables" data-index="${i}">
                    <a class="btn small" data-action="select">${widget.props[propName][i].id}</a>
                    <span data-action="remove">${raw(icon('times'))}</span>
                </li>
            `)

        }

        list.appendChild(html`
            <li><a class="btn small" data-action="add">${raw(icon('plus'))}</a></li>
        `)


        list.addEventListener('click', (e)=>{

            switch (e.target.getAttribute('data-action')) {

                case 'select':
                    editor.select(widgetManager.getWidgetByElement(DOM.get(propName === 'widgets' ? widget.widget : widget.wrapper, '> .widget')[DOM.index(e.target.closest('li'))]))
                    break

                case 'remove':
                    var index = DOM.index(e.target.closest('li'))
                    widget.props[propName].splice(index,1)
                    updateWidget(widget, {removedIndexes: [index] })
                    editor.pushHistory({removedIndexes: [index] })
                    break

                case 'add':
                    widget.props[propName] = widget.props[propName] || []
                    widget.props[propName].push({})
                    updateWidget(widget, {addedIndexes: [widget.props[propName].length -1] })
                    editor.pushHistory({addedIndexes: [widget.props[propName].length -1] })
                    break

            }

        })

        var $list = $(list)
        $list.sortable({
            items: '.sortables',
            placeholder: 'sortable-placeholder btn small',
            start:function(){$(this).sortable( 'refreshPositions' )},
            update: function(e,ui){
                var oldindex = $(ui.item).attr('data-index')
                var index  = $(ui.item).index()

                widget.props[propName].splice(index, 0, widget.props[propName].splice(oldindex, 1)[0])

                var indexes = [index, oldindex]
                if (Math.abs(oldindex - index) > 1) {
                    for (var i = Math.min(index, oldindex) + 1; i < Math.max(index, oldindex); i++) {
                        indexes.push(i)
                    }
                }
                updateWidget(widget, {removedIndexes: indexes, addedIndexes: indexes})
                editor.pushHistory({removedIndexes: indexes, addedIndexes: indexes})
            }
        })

        input = html`<div class="input column"></div>`
        input.appendChild(list)
        field.appendChild(input)

    }

    var label = DOM.get(field, 'label')[0]
    label.addEventListener('fast-click', ()=>{

        var htmlHelp = Array.isArray(defaultValue.help) ? defaultValue.help.join('<br/><br/>').replace(/<br\/>-/g, '-') : defaultValue.help
        htmlHelp = htmlHelp ? html`<p class="help">${raw(htmlHelp.replace(/`([^`]*)`/g, '<code>$1</code>'))}</p>` : ''

        DOM.each(htmlHelp, 'a', (el)=>{
            el.target = '_blank'
        })

        var htmlError = error ? html`<p class="error">${error}</p>` : '',
            computedValue = propName !== 'tabs' && propName !== 'widgets' ? widget.getProp(propName) : ['...']

        if (typeof computedValue === 'string') {
            try {
                computedValue = JSON.stringify(JSON.parse(computedValue), null, ' ')
            } catch(e) {}
        } else {
            computedValue = JSON.stringify(computedValue, null, ' ')
        }

        new Popup({closable: true, title: html`<span class="editor-help-title">${propName}</span>`, content: html`
            <div class="editor-help">

                <p>Type: <code>${defaultValue.type}</code></p>
                <p>Default: <code>${JSON.stringify(defaultValue.value)}</code></p>
                <p>Dynamic: <code>${dynamic ? 'true' : 'false'}</code></p>
                <p>Computed: <code class="pre">${computedValue}</code></p>

                ${htmlError}

                ${htmlHelp}
            </div>
        `})
    })

    if (input) {
        return field
    }


}
