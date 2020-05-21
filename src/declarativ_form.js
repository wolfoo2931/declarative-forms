var dl = require('./dl_select');
var tippy = require('tippy.js').default;

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
            fieldElement, label, allowedValues, message, tooltip

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
        } else if (field.render) {
            fieldElement = document.createElement('p')
            fieldElement.classList.add('render')
            field.render(fieldElement, self.formData)
        } else if (field.largetext) {
            fieldElement = document.createElement('textarea')
            fieldElement.oninput = fieldElement.onchange = function() {
                self.updateForm();
            }
        } else {
            fieldElement = document.createElement('input')
            fieldElement.oninput = fieldElement.onchange = function() {
                self.updateForm();
            }
        }

        field.domElement = fieldElement
        fieldElement.name = field.name
        fieldElement.setAttribute('name', field.name)

        if(field.displayName) {
            label = document.createElement('label')
            label.innerHTML = field.displayName

            if(field.tooltip) {
                tooltip = document.createElement('span')
                tooltip.dataset['tippyContent'] = field.tooltip
                tooltip.classList.add('dl-tooltip')
                tooltip.innerHTML = '?'
                console.log(tooltip)
                label.appendChild(tooltip)
            }
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

    self.updateForm()
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

            if(field.onFormChange) {
                field.onFormChange(formData)
            }

            if(field.render) {
                field.render(field.domElement, formData)
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
        tippy('[data-tippy-content]', {
            placement: 'right',
            allowHTML: true
        })
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
