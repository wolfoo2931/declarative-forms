require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
        border: 2px solid #ddd;
        border-radius: 4px;
    }

    dl-select.dl-focused .input-wrapper {
        border: 2px solid #bbb;
    }

    dl-select.dl-focused .input-wrapper svg {
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
        box-shadow: 0px 0px 10px -2px rgba(0,0,0,0.4);
        z-index: 100;
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
        width: 367px;
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
        color: #545454;
    }

    dl-select .options-wrapper dl-option:hover {
        background-color: rgba(224, 240, 227, 0.4);
    }

    dl-select .options-wrapper dl-option.dl-focused {
        background-color: rgba(224, 240, 227, 0.4);
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

        if(this.isInitialized) { return }

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
            if(str === '' || opt.innerText.toLowerCase().includes(str)) {
                opt.style.display = 'block'
                hasMatched = true
            } else {
                opt.style.display = 'none'
            }
        })

        this.noMatchesHint.style.display = hasMatched ? 'none' : 'block'
    }

    setValue(val) {
        var option = this.querySelector('dl-option[value='+val+']') ||
                     Array.prototype.find.call(this.querySelectorAll('dl-option'), function(el) {return el.innerText == val})

        this.setOption(option)
    }

    setOption(optionEl) {
        if(!optionEl) { return false }

        this.selectedOptionEl = optionEl
        this.inputField.value = optionEl.innerText
        this.setAttribute('value', optionEl.getAttribute('value') || optionEl.innerText)

        var evt = document.createEvent("HTMLEvents")
        evt.initEvent("change", false, true)
        this.dispatchEvent(evt)
    }

    getDisplayedText() {
        if(this.selectedOptionEl) {
            return this.selectedOptionEl.innerText
        } else {
            return ''
        }
    }

    getPlaceholderText() {
        if(this.selectedOptionEl) {
            return this.selectedOptionEl.innerText
        } else {
            return 'Select ...'
        }
    }

    getValue() {
        return this.getAttribute('value')
    }

    focus() {
        this.classList.add('dl-focused')
        this.inputField.placeholder = this.getPlaceholderText()
        this.inputField.value = ''
        this.optionsWrapper.style.display = 'inline-block'
        this.filterOptions(this.inputField.value)
    }

    unfocus() {
        this.classList.remove('dl-focused')
        this.optionsWrapper.style.display = 'none'
        this.inputField.value = this.getDisplayedText()
        this.inputField.blur()
    }
}

customElements.define('dl-select', DlSelect)

},{}],"/src/declarativ_form.js":[function(require,module,exports){
var dl = require('./dl_select');

function DeclarativForm(attrs, onChangeCallback, onCancelCallback) {
    var self = this;
    this.fields = attrs.fields
    this.dom = document.createElement('div')
    this.dom.classList.add('dl-form')
    this.formElement = document.createElement('form')
    this.dom.appendChild(this.formElement)
    this.onChangeCallback = onChangeCallback
    this.onCancelCallback = onCancelCallback
    this.buttons = attrs.buttons

    if(attrs.classNames) {
        attrs.classNames.forEach(function(name) {
            self.formElement.classList.add(name)
        })
    }

    this.escHandler = function(e) {
        if(e.key === 'Escape') {
            self.cancelModalIfCancelable()
        }
    }

    this.enterHandler = function(e) {
        if(e.key === 'Enter') {
            var field = self.fields.find(function(f) { return f.name === e.target.name})

            if(!field || !field.largetext) {
                self.closeModalIfOpen()
                e.preventDefault()
                e.stopPropagation()
            } else if(!field.allowNewlines) {
                e.preventDefault()
                e.stopPropagation()
            }
        }
    }

    this.fields.forEach(function(field) {
        var fieldWrapper = document.createElement('div'),
            fieldElement, label, allowedValues, message

        allowedValues = (field.allowedValues instanceof Function) ?
            field.allowedValues() :
            field.allowedValues

        message = (field.message instanceof Function) ?
            field.message() :
            field.message

        fieldWrapper.id = 'dl-form-field-wrapper-for-' + field.name
        fieldWrapper.classList.add('dl-form-field-wrapper')

        if(field.tab) {
            fieldWrapper.classList.add(field.tab.replace(/\s/g, ''))
        }

        if(allowedValues) {
            fieldElement = document.createElement('dl-select')
            allowedValues.forEach((val) => {
                let optEl = document.createElement('dl-option')
                if(Array.isArray(val)) {
                    optEl.setAttribute('value', val[0])
                    optEl.innerHTML = val[1]
                } else {
                    optEl.innerHTML = val
                }

                fieldElement.onchange = function() {
                    self.updateForm();
                }

                fieldElement.appendChild(optEl)
            })
        } else if (field.message) {
            fieldElement = document.createElement('p')
            fieldElement.classList.add('message')
            fieldElement.innerHTML = field.message
        } else if (field.largetext) {
            fieldElement = document.createElement('textarea')
        } else {
            fieldElement = document.createElement('input')
        }

        field.domElement = fieldElement
        fieldElement.name = field.name
        fieldElement.setAttribute('name', field.name)

        if(field.displayName) {
            label = document.createElement('label')
            label.innerHTML = field.displayName
            label.setAttribute('for', field.name)
            fieldWrapper.appendChild(label)
        }

        fieldWrapper.appendChild(fieldElement)
        self.dom.children[0].appendChild(fieldWrapper)

        if(field.defaultValue) {
            if(fieldElement.setValue) {
                fieldElement.setValue(field.defaultValue)
            } else if (fieldElement.tagName === 'INPUT' || fieldElement.tagName === 'TEXTAREA') {
                fieldElement.value = field.defaultValue
            } else {
                fieldElement.setAttribute('value', field.defaultValue)
            }
        }
    })
}

DeclarativForm.prototype = {

    updateForm: function() {
        var formData = this.getValues();

        this.fields.forEach(function(field) {
            if(!field.domElement) {
                return;
            }

            if(field.isActive && !field.isActive(formData)) {
                field.domElement.parentElement.classList.add('inactive')
            } else if(field.isActive && field.isActive(formData)) {
                field.domElement.parentElement.classList.remove('inactive')
            }
        });
    },

    getHTML: function() {
        return this.dom.outerHTML;
    },

    openInModal: function() {
        var self = this;
        this.modalEl = this.modalEl || this.createModalElement()

        document.removeEventListener('keydown', this.enterHandler)
        document.body.removeEventListener('keydown', this.escHandler, true)

        document.addEventListener("keydown", this.enterHandler)
        document.body.addEventListener('keydown', this.escHandler, true)

        this.updateTabs()
        this.modalEl.querySelector('.modal-content').appendChild(this.dom)
        this.modalEl.style.display = 'block'

    },

    updateTabs: function() {
        var tabsWrapper = this.modalEl.querySelector('.tabWrapper'),
            tabs = this.fields.filter(f => f.tab).map(f => f.tab).filter((value, index, self) => self.indexOf(value) === index),
            self = this, tmpTabEl

        tabsWrapper.innerHTML = ''

        tabs.forEach((tab) => {
            tmpTabEl = document.createElement('div')
            tmpTabEl.classList.add('dl-tab-btn')
            tmpTabEl.classList.add(tab.replace(/\s/g, ''))
            tmpTabEl.innerHTML = tab
            tmpTabEl.onclick = function() {
                self.setActiveTab(tab)
            }
            tabsWrapper.appendChild(tmpTabEl)
        })

        if(tabs[0]) {
            this.setActiveTab(tabs[0])
        }
    },

    setActiveTab: function(tab) {
        var tabClassName = tab.replace(/\s/g, ''),
            currentActiveTabBtn = document.querySelector('.dl-tab-btn.active'),
            tabBtn = document.querySelector('.dl-tab-btn.' + tabClassName)

        if(currentActiveTabBtn) {
            currentActiveTabBtn.classList.remove('active')
        }

        tabBtn.classList.add('active')

        this.fields.forEach(field => {
            if(!field.domElement) { return }
            if(field.tab === tab) {
                field.domElement.parentElement.classList.remove('notInTab')
            } else {
                field.domElement.parentElement.classList.add('notInTab')
            }
        })
    },

    cancelModalIfCancelable: function() {
        if(this.onCancelCallback) {
            if(this.modalEl) {
                this.modalEl.remove()
                this.modalEl = null
            }

            this.onCancelCallback()

            document.removeEventListener('keydown', this.enterHandler)
            document.body.removeEventListener('keydown', this.escHandler, true)
        }
    },

    closeModalIfOpen: function(callaback) {
        callaback = callaback || this.onChangeCallback

        if(this.modalEl) {
            this.modalEl.remove()
            this.modalEl = null
        }

        if(callaback) {
            callaback(this.getValues())
        }

        document.removeEventListener('keydown', this.enterHandler)
        document.body.removeEventListener('keydown', this.escHandler, true)
    },

    getValues: function() {
        var result  = {}

        this.fields.filter(function(field) {
            return field.domElement && !field.domElement.parentElement.classList.contains('inactive')
        }).forEach(function(field) {
            if(!field.domElement) { return }
            result[field.name] = field.domElement.getAttribute('value') || field.domElement.value

            if(!result[field.name]) {
                result[field.name] = ''
            }
        })

        return result
    },

    createModalElement: function() {
        var modalWrapper = document.createElement('div'),
            modal = document.createElement('div'),
            modalContent = document.createElement('div'),
            lowBar = document.createElement('div'),
            upBar  = document.createElement('div'),
            okBtn = document.createElement('div'),
            cancelBtn = document.createElement('div'),
            tabWrapper = document.createElement('div'),
            tmpBtn

        modalWrapper.classList.add('dl-modal')
        modalWrapper.style.display = 'none'
        modal.classList.add('modal')
        modalContent.classList.add('modal-content')
        tabWrapper.classList.add('tabWrapper')
        lowBar.classList.add('low-bar')
        okBtn.classList.add('btn')
        okBtn.innerHTML = 'OK'
        okBtn.onclick = () => { this.closeModalIfOpen() }

        if(this.buttons) {
            Object.keys(this.buttons).forEach((btn => {
                tmpBtn = document.createElement('div')
                tmpBtn.classList.add('btn')
                tmpBtn.innerHTML = btn
                tmpBtn.onclick = () => { this.closeModalIfOpen(this.buttons[btn]) }

                lowBar.appendChild(tmpBtn)
            }))
        } else {
            lowBar.appendChild(okBtn)
        }





        if(this.onCancelCallback) {
            upBar.classList.add('up-bar')
            cancelBtn.classList.add('cancelBtn')
            cancelBtn.onclick = () => { this.cancelModalIfCancelable() }
            upBar.appendChild(cancelBtn)
        }

        modalWrapper.appendChild(modal)
        modal.appendChild(upBar)
        modal.appendChild(tabWrapper)
        modal.appendChild(modalContent)
        modal.appendChild(lowBar)
        document.body.appendChild(modalWrapper)
        return modalWrapper
    }
}

module.exports = DeclarativForm

},{"./dl_select":1}]},{},["/src/declarativ_form.js"]);
