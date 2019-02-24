var style = document.createElement('style')

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
    }

    dl-select .options-wrapper dl-option {
        border-left: 1px solid #bbb;
        border-right: 1px solid #bbb;
    }

    dl-select .options-wrapper dl-option:first-child {
        border-top: 1px solid #bbb;
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;
    }

    dl-select .options-wrapper dl-option:last-child {
        border-bottom: 1px solid #bbb;
        border-bottom-left-radius: 4px;
        border-bottom-right-radius: 4px;
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
`

window.addEventListener('load', () => {
    document.body.appendChild(style)
})

class DlSelect extends HTMLElement {
    constructor() {
        super()
    }

    connectedCallback() {
        var xmlns = 'http://www.w3.org/2000/svg',
            self = this;

        this.optionsWrapper = document.createElement('div'),
        this.inputWrapper = document.createElement('span'),
        this.inputField = document.createElement('input'),
        this.arrow = document.createElementNS(xmlns, 'svg')

        this.inputWrapper.classList.add('input-wrapper')
        this.optionsWrapper.classList.add('options-wrapper')
        this.optionsWrapper.style.display = 'none'
        this.inputField.placeholder = 'Select ...'
        this.inputField.onfocus = () => { self.focus() }
        this.inputField.onblur = (e) => { self.unfocus(); }
        this.arrow.onclick = () => { self.inputField.focus() }

        this.arrow.innerHTML = '<path d="M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502 0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0 0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z"></path>'

        window.addEventListener('load', () => {
            while(self.firstElementChild) {
                self.firstElementChild.onmousedown = function() { self.setValue(this.innerText) }
                self.optionsWrapper.appendChild(self.firstElementChild)
            }

            self.inputWrapper.appendChild(self.inputField)
            self.inputWrapper.appendChild(self.arrow)
            self.appendChild(self.inputWrapper)
            self.appendChild(self.optionsWrapper)
        })
    }

    setValue(value) {
      this.inputField.value = value
      this.value = value
    }

    getValue() {
        return this.value;
    }

    focus() {
        this.classList.add('focused')
        this.optionsWrapper.style.display = 'inline-block'
    }

    unfocus() {
        this.classList.remove('focused')
        this.optionsWrapper.style.display = 'none'
        if(!this.getValue()) {
            this.inputField.value = ''
        }
    }
}

customElements.define('dl-select', DlSelect)
