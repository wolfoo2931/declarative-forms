var style = document.createElement('style'),
    xmlns = 'http://www.w3.org/2000/svg'

style.textContent = `
    dl-select {
        position: relative;
        font-weight: 300;
        font-family: 'Rubik', sans-serif;
    }

    dl-select .input-wrapper {
        display: inline-block;
        border: 1px solid #ddd;
        border-radius: 4px;
    }

    dl-select.focused .input-wrapper {
        border: 1px solid #bbb;
    }

    dl-select.focused .input-wrapper svg {
        border-left: 1px solid #bbb;
        fill: #bbb;
    }

    dl-select .options-wrapper {
        position: absolute;
        left: 0px;
        top: 20px;
        font-size: 0.9em;
        background-color: #fff;
        width: 100%;
        max-height: 230px;
        overflow: scroll;
    }

    dl-select .options-wrapper dl-option {
        border-left: 1px solid #bbb;
        border-right: 1px solid #bbb;
    }

    dl-select .options-wrapper .noMatchesHint {
        border-left: 1px solid #bbb;
        border-right: 1px solid #bbb;
        padding: 5px;
        font-style: italic;
    }

    dl-select .options-wrapper {
        border-top: 1px solid #bbb;
        border-bottom: 1px solid #bbb;
        border-radius: 4px;
    }

    dl-select .input-wrapper input {
        width: 200px;
        outline-width: 0;
        margin-top: 2px;
        padding: 6px;
        font-size: 0.9em;
        font-family: 'Rubik', sans-serif;
        font-weight: 300;
        border: 0px;
        border-radius: 4px;
        float: left;
    }

    dl-select .input-wrapper svg {
        width: 20px;
        height: 20px;
        margin-top: 5px;
        margin-right: 4px;
        padding-left: 4px;
        fill: #ddd;
        float: right;
        border-left: 1px solid #ddd;
    }

    dl-select .options-wrapper dl-option {
        display: block;
        padding: 5px;
    }

    dl-select .options-wrapper dl-option:hover {
        background-color: rgba(193, 234, 254, 0.3);
    }

    dl-select .options-wrapper dl-option.focused {
        background-color: rgba(193, 234, 254, 0.3);
    }
`

window.addEventListener('load', () => {
    document.body.appendChild(style)
})

class DlSelect extends HTMLElement {
    constructor() {
        super()
        this.optionsWrapper = document.createElement('div')
        this.inputWrapper = document.createElement('span')
        this.noMatchesHint = document.createElement('span')
        this.inputField = document.createElement('input')
        this.arrow = document.createElementNS(xmlns, 'svg')
    }

    connectedCallback() {
        var self = this

        this.inputWrapper.classList.add('input-wrapper')
        this.optionsWrapper.classList.add('options-wrapper')
        this.optionsWrapper.style.display = 'none'
        this.inputField.placeholder = 'Select ...'
        this.noMatchesHint.classList.add('noMatchesHint')
        this.noMatchesHint.innerHTML = 'No Matches'
        this.noMatchesHint.style.display = 'none'
        this.inputField.onfocus = () => { self.focus() }
        this.inputField.onblur = (e) => { self.unfocus() }
        this.inputField.oninput = () => { self.filterOptions(this.inputField.value) }
        this.arrow.onclick = () => { self.inputField.focus() }
        this.arrow.innerHTML = '<path d="M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502 0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0 0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z"></path>'

        this.optionsWrapper.appendChild(this.noMatchesHint)

        window.addEventListener('load', () => {
            while(self.firstElementChild) {
                self.firstElementChild.onmousedown = function() { self.setValue(this.innerText) }
                self.firstElementChild.onmouseover = function() { self.clearFocusedOption() }
                self.optionsWrapper.appendChild(self.firstElementChild)
            }

            self.inputWrapper.appendChild(self.inputField)
            self.inputWrapper.appendChild(self.arrow)
            self.appendChild(self.inputWrapper)
            self.appendChild(self.optionsWrapper)
            self.inputField.value = self.getValue()
        })

        this.addEventListener("keydown", (e) => {
            var option = self.focusedOption()
            if(e.key === 'ArrowDown') {
                self.focusOption(self.nextVisibleOptionAfter(option))
            } else if(e.key === 'ArrowUp') {
                self.focusOption(self.previousVisibleOptionAfter(option))
            } else if(e.key === 'Enter') {
                self.setValue(option.innerText)
                self.unfocus()
                e.preventDefault()
            }
        })
    }

    clearFocusedOption() {
        this._focusedOption = null
        Array.prototype.forEach.call(this.optionsWrapper.children, (opt) => {
            opt.classList.remove('focused')
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
            option.classList.add('focused')
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
            if(str === '' || opt.innerText.toLowerCase().includes(str)) {
                opt.style.display = 'block'
                hasMatched = true
            } else {
                opt.style.display = 'none'
            }
        })

        this.noMatchesHint.style.display = hasMatched ? 'none' : 'block'
    }

    setValue(value) {
      this.inputField.value = value
      this.setAttribute('value', value)
    }

    getValue() {
        return this.getAttribute('value')
    }

    focus() {
        this.classList.add('focused')
        this.inputField.placeholder = this.getValue() || 'Select ...'
        this.inputField.value = ''
        this.optionsWrapper.style.display = 'inline-block'
        this.filterOptions(this.inputField.value)
    }

    unfocus() {
        this.classList.remove('focused')
        this.optionsWrapper.style.display = 'none'
        this.inputField.value = this.getValue() || ''
        this.inputField.blur()
    }
}

customElements.define('dl-select', DlSelect)
