var DeclarativForm = require('./../../src/declarativ_form.js');

describe('DeclarativForms Object', () => {
    describe('constructor Function', () => {
        describe('onChangeCallback Attribute', () => {
            it('gets executed when the modal gets closed', (done) => {
                  var callback = function(formData) {
                      expect(formData).toEqual({fieldOne: ''})
                      done()
                  }

                  var form = new DeclarativForm({fields: [ { name: 'fieldOne' } ]}, callback)
                  form.openInModal()
                  form.closeModalIfOpen()
            })
        })

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

                describe('displayName Field', () => {
                    it('specifies the label caption for this filed', () => {
                        var form = new DeclarativForm({fields: [ { name: 'fieldOne', displayName: 'Field One' } ]})
                        expect(form.getHTML()).toMatch(/<label for=('|")fieldOne('|")>Field One<\/label>/)
                    })
                })

                describe('allowedValues Field', () => {
                    describe('when it is an array', () => {
                        it('provides a select box with all array items as options', () => {
                            var formDef = {
                                fields: [
                                    {
                                        name: 'proglang',
                                        displayName: 'Programming Language',
                                        allowedValues: ['javascript', 'java', 'python']
                                    }
                                ]
                            }

                            var form = new DeclarativForm(formDef)

                            expect(form.getHTML()).toMatch(/javascript/)
                            expect(form.getHTML()).toMatch(/java/)
                            expect(form.getHTML()).toMatch(/python/)
                        })
                    })

                })

                describe('defaultValue Field', () => {
                    it('represents the default value of the field', () => {
                        var formDef = {
                            fields: [
                                {
                                    name: 'proglang',
                                    displayName: 'Programming Language',
                                    allowedValues: ['javascript', 'java', 'python'],
                                    defaultValue: 'python'
                                }
                            ]
                        }

                        var form = new DeclarativForm(formDef)
                        expect(form.getValues()).toEqual({proglang: 'python'})
                    })
                })
            })
        })
    })
})
