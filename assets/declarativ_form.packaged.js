require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"/src/declarativ_form.js":[function(require,module,exports){
function DeclarativForm(attrs) {
    var self = this;
    this.fields = attrs.fields
    this.dom = document.createElement('div')
    this.dom.classList.add('declarativ-form')
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

},{}]},{},["/src/declarativ_form.js"]);
