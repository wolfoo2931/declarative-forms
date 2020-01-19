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

        this.modalEl.querySelector('.modal-content').appendChild(this.dom)
        this.modalEl.style.display = 'block'
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

    closeModalIfOpen: function() {
        if(this.modalEl) {
            this.modalEl.remove()
            this.modalEl = null
        }

        if(this.onChangeCallback) {
            this.onChangeCallback(this.getValues())
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
            cancelBtn = document.createElement('div')

        modalWrapper.classList.add('dl-modal')
        modalWrapper.style.display = 'none'
        modal.classList.add('modal')
        modalContent.classList.add('modal-content')
        lowBar.classList.add('low-bar')
        okBtn.classList.add('btn')
        okBtn.innerHTML = 'OK'
        okBtn.onclick = () => { this.closeModalIfOpen() }
        lowBar.appendChild(okBtn)

        if(this.onCancelCallback) {
            upBar.classList.add('up-bar')
            cancelBtn.classList.add('cancelBtn')
            cancelBtn.onclick = () => { this.cancelModalIfCancelable() }
            upBar.appendChild(cancelBtn)
        }

        modalWrapper.appendChild(modal)
        modal.appendChild(upBar)
        modal.appendChild(modalContent)
        modal.appendChild(lowBar)
        document.body.appendChild(modalWrapper)
        return modalWrapper
    }
}

module.exports = DeclarativForm
