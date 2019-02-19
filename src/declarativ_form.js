function DeclarativForm(attrs) {
    var self = this;
    this.fields = attrs.fields
    this.dom = document.createElement('div')
    this.formElement = document.createElement('form')
    this.dom.appendChild(this.formElement)

    this.fields.forEach(function(field) {
        var fieldElement = document.createElement('input')
        field.domElement = fieldElement
        fieldElement.name = field.name
        self.dom.children[0].appendChild(fieldElement)
    })
}

DeclarativForm.prototype = {
    getHTML: function() {
        return this.dom.outerHTML;
    },

    getValues: function() {
        var result  = {}

        this.fields.forEach(function(field) {
            result[field.name] = field.domElement.value
        })

        return result
    }
}

module.exports = DeclarativForm
