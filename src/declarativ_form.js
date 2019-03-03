var dl = require('./dl_select');

function DeclarativForm(attrs, onChangeCallback) {
    var self = this;
    this.fields = attrs.fields
    this.dom = document.createElement('div')
    this.dom.classList.add('dl-form')
    this.formElement = document.createElement('form')
    this.dom.appendChild(this.formElement)
    this.onChangeCallback = onChangeCallback

    this.fields.forEach(function(field) {
        var fieldElement, label

        if(field.allowedValues) {
            fieldElement = document.createElement('dl-select')
            field.allowedValues.forEach((val) => {
                let optEl = document.createElement('dl-option')
                optEl.innerHTML = val
                fieldElement.appendChild(optEl)
            })
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
            self.dom.children[0].appendChild(label)
        }

        self.dom.children[0].appendChild(fieldElement)

        if(field.defaultValue) {
            if(fieldElement.setValue) {
                fieldElement.setValue(field.defaultValue)
            } else {
                fieldElement.value = field.defaultValue
            }
        }
    })
}

DeclarativForm.prototype = {
    getHTML: function() {
        return this.dom.outerHTML;
    },

    openInModal: function() {
        this.modalEl = this.modalEl || this.createModalElement()

        this.modalEl.querySelector('.modal-content').appendChild(this.dom)
        this.modalEl.style.display = 'block'
    },

    closeModalIfOpen: function() {
        if(this.modalEl) {
            this.modalEl.remove()
            this.modalEl = null
        }

        if(this.onChangeCallback) {
            this.onChangeCallback(this.getValues())
        }
    },

    getValues: function() {
        var result  = {}

        this.fields.forEach(function(field) {
            result[field.name] = field.domElement.value
        })

        return result
    },

    createModalElement: function() {
        var modalWrapper = document.createElement('div'),
            modal = document.createElement('div'),
            modalContent = document.createElement('div'),
            lowBar = document.createElement('div'),
            okBtn = document.createElement('div')

        modalWrapper.classList.add('dl-modal')
        modalWrapper.style.display = 'none'
        modal.classList.add('modal')
        modalContent.classList.add('modal-content')
        lowBar.classList.add('low-bar')
        okBtn.classList.add('btn')
        okBtn.innerHTML = 'OK'
        okBtn.onclick = () => { this.closeModalIfOpen() }
        lowBar.appendChild(okBtn)

        modalWrapper.appendChild(modal)
        modal.appendChild(modalContent)
        modal.appendChild(lowBar)
        document.body.appendChild(modalWrapper)
        return modalWrapper
    }
}

module.exports = DeclarativForm
