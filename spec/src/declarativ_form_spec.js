var DeclarativForm = require('./../../src/declarativ_form.js');

describe('DeclarativForms Object', () => {
    describe('constructor Function', () => {
        describe('fields Attribute', () => {
            it('is an array')

            describe('array Entry', () => {
                it('will be present in the form to be filled in by the user', () => {
                    var form = new DeclarativForm({fields: [ { name: 'fieldOne' } ]})
                    expect(form.getHTML()).toMatch(/<input name=('|")fieldOne('|")>/)

                    form = new DeclarativForm({fields: [ { name: 'fieldOne' }, { name: 'secondOne' } ]})
                    expect(form.getHTML()).toMatch(/<input name=('|")fieldOne('|")>/)
                    expect(form.getHTML()).toMatch(/<input name=('|")secondOne('|")>/)
                })

                describe('name Field', () => {
                    it('specifies the name of the form field and will be used to identify the field value', () => {
                        var form = new DeclarativForm({fields: [ { name: 'fieldOne' } ]})
                        expect(form.getValues()).toEqual({fieldOne: ''})

                        form = new DeclarativForm({fields: [ { name: 'fieldOne' }, { name: 'secondOne' } ]})
                        expect(form.getValues()).toEqual({fieldOne: '', secondOne: ''})
                    })
                })
            })
        })
    })
})
