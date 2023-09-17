var style = document.createElement('style'),
    xmlns = 'http://www.w3.org/2000/svg'

style.textContent = `
    @keyframes placeHolderShimmer{
        0%{
            background-position: -468px 0
        }
        100%{
            background-position: 468px 0
        }
    }

    dl-select {
        position: relative;
        font-weight: 300;
        font-family: var(--dl-font-family, 'Rubik');
    }

    dl-select .input-wrapper {
        display: inline-block;
        border-width: 2px;
        border-style: solid;
        border-color: var(--dl-line-color, #ddd);
        border-radius: 4px;
    }

    dl-select.dl-focused .input-wrapper {
        border-width: 2px;
        border-style: solid;
        border-color: var(--dl-focused-line-color, #bbb);
    }

    dl-select.dl-focused .input-wrapper svg {
        border-left: 1px solid var(--dl-focused-line-color, #bbb);
        fill: var(--dl-focused-line-color, #bbb);
    }

    dl-select .options-wrapper {
        position: fixed;
        left: 0px;
        top: 20px;
        font-size: var(--dl-font-size, 0.9em);
        background-color: #fff;
        width: 100%;
        max-height: 230px;
        overflow: scroll;
        box-shadow: 0px 0px 10px -2px rgba(0,0,0,0.4);
        z-index: 100;
    }

    dl-select .options-wrapper dl-option {
        border-left: 1px solid var(--dl-focused-line-color, #bbb);
        border-right: 1px solid var(--dl-focused-line-color, #bbb);
        cursor: pointer;
    }

    dl-select .options-wrapper .noMatchesHint {
        border-left: 1px solid var(--dl-focused-line-color, #bbb);
        border-right: 1px solid var(--dl-focused-line-color, #bbb);
        padding: 5px;
        font-style: italic;
    }

    dl-select .options-wrapper {
        border-top: 1px solid var(--dl-focused-line-color, #bbb);
        border-bottom: 1px solid var(--dl-focused-line-color, #bbb);
        border-radius: 4px;
    }

    dl-select .input-wrapper input {
        width: var(--dl-select-input-width);
        outline-width: 0;
        margin-top: 2px;
        padding: 6px;
        font-size: var(--dl-font-size, 0.9em);
        font-family: var(--dl-font-family, 'Rubik');
        font-weight: 300;
        border: 0px;
        border-radius: 4px;
        float: left;
        cursor: pointer;
        box-sizing: content-box;
    }

    dl-select .input-wrapper svg {
        width: 20px;
        height: 20px;
        margin-top: var(--dl-drop-down-icon-margin-top, 5px);
        margin-right: 4px;
        padding-left: 4px;
        fill: var(--dl-line-color, #ddd);
        float: right;
        border-left-width: 1px;
        border-left-style: solid;
        border-left-color: var(--dl-line-color, #ddd);
        cursor: pointer;
    }

    dl-select .options-wrapper dl-option {
        display: block;
        padding: 5px;
        color: var(--dl-options-background, #545454);
    }

    dl-select .options-wrapper dl-option:hover {
        background-color: rgba(224, 240, 227, 0.4);
    }

    dl-select .options-wrapper dl-option.dl-focused {
        background-color: rgba(224, 240, 227, 0.4);
    }

    dl-select .dl-option-tag {
        float: right;
        border: 1px solid #888;
        font-size: 0.8em;
        padding: 2px;
        font-family: 'Source Code Pro', monospace;
        border-radius: 2px;
        margin-top: -1px;
    }

    dl-select .dl-option-tag:last-child {
       margin-right: 10px;
    }

    .dl-select-loading {

    }

    .dl-select-no-options-available svg path {
        display: none;
    }

    .dl-select-no-options-available svg {
        border-left: none !important;
    }

    .dl-select-loading svg, .dl-select-no-options-available svg {
        pointer-events: none;
    }

    .dl-select-loading input, .dl-select-no-options-available input {
        pointer-events: none;
    }

    dl-select {
        --dl-select-loading-col1: #eee;
        --dl-select-loading-col2: #ddd;
        --dl-select-input-width: 371px;
    }

    body.dark-theme dl-select {
        --dl-select-loading-col1: #282727;
        --dl-select-loading-col2: #505656;
    }

    .dl-select-loading .input-wrapper {
        animation-duration: 1.25s;
        animation-fill-mode: forwards;
        animation-iteration-count: infinite;
        animation-name: placeHolderShimmer;
        animation-timing-function: linear;
        background: linear-gradient(to right, var(--dl-select-loading-col1) 10%, var(--dl-select-loading-col2) 18%, var(--dl-select-loading-col1) 33%);
        background-size: 800px 104px;
        position: relative;
        width: 412px;
    }
    .dl-select-loading input {
        opacity: 0;
    }

    .dl-field-one-third input {
        --dl-select-input-width: 128px;
    }

    .dl-field-two-third input {
        --dl-select-input-width: 128px;
    }
`

function attachScrollListenerToParents(element, callback) {
    let currentElement = element;

    while (currentElement) {
        const hasScrollbar = currentElement.scrollHeight > currentElement.clientHeight;

        if (hasScrollbar) {
            currentElement.addEventListener('scroll', callback);
        }

        currentElement = currentElement.parentElement;
    }

    document.addEventListener('scroll', callback);
}

function removeScrollListenerFromParents(element, callback) {
    let currentElement = element;

    while (currentElement) {
        const hasScrollbar = currentElement.scrollHeight > currentElement.clientHeight;

        if (hasScrollbar) {
            currentElement.removeEventListener('scroll', callback);
        }

        currentElement = currentElement.parentElement;
    }

    document.removeEventListener('scroll', callback);
}

window.addEventListener('load', () => {
    document.body.appendChild(style)
})

class DlSelect extends HTMLElement {
    constructor() {
        super()
        this.loadingScreenTimeouts = []
        this.loadingStartedAt = undefined
        this.optionsWrapper = document.createElement('div')
        this.inputWrapper = document.createElement('span')
        this.noMatchesHint = document.createElement('span')
        this.inputField = document.createElement('input')
        this.arrow = document.createElementNS(xmlns, 'svg')
    }

    connectedCallback() {
        var self = this

        if(this.isInitialized) { return }

        this.inputWrapper.classList.add('input-wrapper')
        this.optionsWrapper.classList.add('options-wrapper')
        this.optionsWrapper.style.display = 'none'
        this.inputField.placeholder = this.getAttribute('placeholder') || 'Select ...'
        this.noMatchesHint.classList.add('noMatchesHint')
        this.noMatchesHint.innerHTML = 'No Matches'
        this.noMatchesHint.style.display = 'none'
        this.inputField.onfocus = () => { self.focus() }
        this.inputField.onblur = (e) => { self.unfocus() }
        this.inputField.oninput = () => { self.filterOptions(this.inputField.value) }
        this.arrow.onclick = () => { self.inputField.focus() }
        this.arrow.innerHTML = '<path d="M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502 0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0 0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z"></path>'

        this.optionsWrapper.appendChild(this.noMatchesHint)

        this.classList.add('dl-select-no-options-available')

        if (document.readyState !== 'loading') {
            this.loadOptions()
        } else {
            window.addEventListener('load', () => {self.loadOptions()})
        }

        this.addEventListener("keydown", (e) => {
            var option = self.focusedOption()
            if(e.key === 'ArrowDown') {
                self.focusOption(self.nextVisibleOptionAfter(option))
                e.preventDefault()
                e.stopPropagation()
            } else if(e.key === 'ArrowUp') {
                self.focusOption(self.previousVisibleOptionAfter(option))
                e.preventDefault()
                e.stopPropagation()
            } else if(e.key === 'Enter') {
                self.setOption(option)
                self.unfocus()
                e.preventDefault()
                e.stopPropagation()
            }
        })

        this.isInitialized = true;
    }

    setLoadingStatus() {
        this.loadingScreenTimeouts.push(setTimeout(() => {
            this.classList.add('dl-select-loading')
            this.optionsWrapper.remove()
            this.loadingStartedAt = Date.now()
        }, 100))
    }

    unsetLoadingStatus() {
        this.loadingScreenTimeouts.forEach(clearTimeout)
        this.loadingScreenTimeouts = []

        const minLoadTimeInSeconds = 1.5
        const delay = this.loadingStartedAt ?
            (minLoadTimeInSeconds * 1000) - (Date.now() - this.loadingStartedAt)
            : 0

        setTimeout(() => {
            this.appendChild(this.optionsWrapper)
            this.classList.remove('dl-select-loading')
        }, delay)
    }

    loadOptions() {
        var self = this
        while(self.firstElementChild) {
            self.firstElementChild.onmousedown = function() { self.setOption(this) }
            self.firstElementChild.onmouseover = function() { self.clearFocusedOption() }
            self.optionsWrapper.appendChild(self.firstElementChild)
        }

        self.inputWrapper.appendChild(self.inputField)
        self.inputWrapper.appendChild(self.arrow)
        self.appendChild(self.inputWrapper)
        self.appendChild(self.optionsWrapper)
        self.setValue(self.getValue())
        this.updatePlaceholderText()
    }

    removeAllOptions() {
        this.classList.add('dl-select-no-options-available')
        this.optionsWrapper.querySelectorAll('dl-option').forEach(opt => opt.remove())
        this.updatePlaceholderText()
    }

    addOption(optionEl) {
        var self = this

        optionEl.onmousedown = function() { self.setOption(this) }
        optionEl.onmouseover = function() { self.clearFocusedOption() }
        self.optionsWrapper.appendChild(optionEl)

        this.classList.remove('dl-select-no-options-available')
        this.updatePlaceholderText()
    }

    clearFocusedOption() {
        this._focusedOption = null
        Array.prototype.forEach.call(this.optionsWrapper.children, (opt) => {
            opt.classList.remove('dl-focused')
        })
    }

    focusedOption() {
        return this._focusedOption
    }

    focusOption(option) {
        option = option || this.nextVisibleOptionAfter(option)

        this.clearFocusedOption()

        this._focusedOption = option
        if(option) {
            option.classList.add('dl-focused')
        }
    }

    nextVisibleOptionAfter(option) {
        option = option || this.optionsWrapper.children[0]
        while(option) {
            if(option.nextSibling && option.nextSibling.style.display !== 'none') {
                return option.nextSibling
            }

            option = option.nextSibling
        }
    }

    previousVisibleOptionAfter(option) {
        option = option || this.optionsWrapper.children[0]
        while(option) {
            if(option.previousSibling && option.previousSibling.style.display !== 'none') {
                return option.previousSibling
            }

            option = option.previousSibling
        }
    }

    filterOptions(str) {
        var hasMatched = false;
        str = str.toLowerCase()

        Array.prototype.forEach.call(this.optionsWrapper.children, (opt) => {
            if(str === '' || str.split(' ').every(term => opt.innerText.toLowerCase().includes(term))) {
                opt.style.display = 'block'
                hasMatched = true
            } else {
                opt.style.display = 'none'
            }
        })

        this.noMatchesHint.style.display = hasMatched ? 'none' : 'block'
    }

    setValue(val) {
        if(!val) {
            return
        }

        var option = this.querySelector('dl-option[value="'+val+'"]') ||
                     Array.prototype.find.call(this.querySelectorAll('dl-option'), function(el) {return el.innerText == val})

        this.setAttribute('tmp-value', val)
        this.setOption(option)
    }

    setOption(optionEl) {
        if(!optionEl) { return false }

        this.selectedOptionEl = optionEl
        this.inputField.value = this.getDisplayedText()
        this.setAttribute('value', optionEl.getAttribute('value') || optionEl.innerText)

        var evt = document.createEvent("HTMLEvents")
        evt.initEvent("change", false, true)
        this.dispatchEvent(evt)
    }

    getDisplayedText() {
        if(this.selectedOptionEl) {
            return this.selectedOptionEl.getAttribute('displayWhenSelected') || this.selectedOptionEl.innerText
        } else {
            return ''
        }
    }

    getPlaceholderText() {
        if (this.optionsWrapper.querySelectorAll('dl-option').length === 0) {
            return 'No Options Available'
        } else if(this.selectedOptionEl) {
            return this.selectedOptionEl.innerText
        } else {
            return this.getAttribute('placeholder') || 'Select ...';
        }
    }

    updatePlaceholderText() {
        this.inputField.placeholder = this.getPlaceholderText()
    }

    getValue() {
        if(this.getAttribute('value')) {
            return this.getAttribute('value')
        }

        var tmpValue = this.getAttribute('tmp-value')
        var option = this.querySelector('dl-option[value="'+this.getAttribute('tmp-value')+'"]')

        if(option && tmpValue) {
            return tmpValue
        }
    }

    focus() {
        const self = this;
        this.classList.add('dl-focused')
        this.updatePlaceholderText()
        this.inputField.value = ''
        this.optionsWrapper.style.display = 'inline-block'
        this.filterOptions(this.inputField.value)

        this.positionOptions = () => {
            const inputRect = self.inputWrapper.getBoundingClientRect();
            self.optionsWrapper.style.top = (inputRect.y + inputRect.height + 2) + 'px';
            self.optionsWrapper.style.left = inputRect.left + 'px';
            self.optionsWrapper.style.width = inputRect.width + 'px';
        }

        this.positionOptions();

        attachScrollListenerToParents(this.optionsWrapper, this.positionOptions);
    }

    unfocus() {
        this.classList.remove('dl-focused')
        this.optionsWrapper.style.display = 'none'
        this.inputField.value = this.getDisplayedText()
        this.inputField.blur()

        removeScrollListenerFromParents(this.optionsWrapper, this.positionOptions);
    }
}

try {
    customElements.define('dl-select', DlSelect)
} catch(ex) {}

