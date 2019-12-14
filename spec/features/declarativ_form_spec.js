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

var formDefWithDisplayValue = {
    fields: [
        {
            name: 'proglang',
            displayName: 'Programming Language',
            allowedValues: [["af","Afrikaans"],["sq","Albanian"],["ar-dz","Arabic (Algeria)"],["ar-bh","Arabic (Bahrain)"]],
            defaultValue: 'ar-dz'
        }
    ]
}

describe('DeclarativForm', () => {

    beforeEach(async () => {
        await browser.url('declarativ_form_modal.html')
        await browser.keys('\uE000')
    })

    describe('constructor Function', () => {
        describe('attr Argument', () => {
           it('is an object');

           describe('classNames Key', () => {
              it('represents class names which will be added to the form DOM element', async () => {
                  var formDef = {
                      classNames: ['className1', 'className2'],
                      fields: [
                          {
                              name: 'note',
                              displayName: 'Your Note',
                              largetext: true,
                              allowNewlines: true,
                              defaultValue: 'A longer text'
                          }
                      ]
                  }

                  await browser.executeAsync((formDef, done) => {
                      var form = new DeclarativForm(formDef);
                      form.openInModal()
                      done()
                  }, formDef)

                  var form = await $('form')
                  expect(await form.getAttribute('class')).toMatch('className1 className2')
              })
           })

           describe('fields Key', () => {
              it('is an array of objects');

              describe('field object', () => {
                  describe('largetext Key', () => {
                      it('will cause the form to display this field as textarea', async () => {
                          var formDef = {
                              fields: [
                                  {
                                      name: 'note',
                                      displayName: 'Your Note',
                                      largetext: true,
                                      allowNewlines: true,
                                      defaultValue: 'A longer text'
                                  }
                              ]
                          }

                          await browser.executeAsync((formDef, done) => {
                              var form = new DeclarativForm(formDef, (formData) => {
                                  window.formData = formData;
                              });
                              form.openInModal()
                              done()
                          }, formDef)

                          var textarea = await $('textarea')
                          await textarea.click()

                          await browser.keys('new text')
                          await browser.keys('Enter')
                          await browser.keys('with new line')

                          okbtn = await $('.dl-modal .btn')
                          await okbtn.click()

                          var formData = await browser.execute(() => {
                              return window.formData
                          })

                          expect(formData).toEqual({ note: 'A longer textnew text\nwith new line' })
                      })
                  })

                  describe('allowNewlines Key', () => {
                      describe('when largetext is set to true and allowNewlines to false', () => {
                          it('does not insert newlines when pressing enter in a textfield', async () => {
                              var formDef = {
                                  fields: [
                                      {
                                          name: 'note',
                                          displayName: 'Your Note',
                                          largetext: true,
                                          allowNewlines: false,
                                          defaultValue: 'A longer text'
                                      }
                                  ]
                              }

                              await browser.executeAsync((formDef, done) => {
                                  var form = new DeclarativForm(formDef, (formData) => {
                                      window.formData = formData;
                                  });
                                  form.openInModal()
                                  done()
                              }, formDef)

                              var textarea = await $('textarea')
                              await textarea.click()

                              await browser.keys('new text')
                              await browser.keys('Enter')
                              await browser.keys('without new line')

                              okbtn = await $('.dl-modal .btn')
                              await okbtn.click()

                              var formData = await browser.execute(() => {
                                  return window.formData
                              })

                              expect(formData).toEqual({ note: 'A longer textnew textwithout new line' })
                          })
                      })

                      describe('when largetext is set to false and allowNewlines to true', () => {
                          it('closes the dialog when enter is pressed and does not insert a newline', async () => {

                              var formDef = {
                                  fields: [
                                      {
                                          name: 'proglang',
                                          displayName: 'Programming Language',
                                          defaultValue: 'python'
                                      }
                                  ]
                              }

                              await browser.executeAsync((formDef, done) => {
                                  var form = new DeclarativForm(formDef, (formData) => {
                                      window.formData = formData;
                                  });
                                  form.openInModal()
                                  done()
                              }, formDef)

                              var inputfield = await $('input')
                              await inputfield.click()

                              await browser.keys('new text')
                              await browser.keys('Enter')

                              var formData = await browser.execute(() => {
                                  return window.formData
                              })

                              expect(formData).toEqual({ proglang: 'pythonnew text' })
                          })
                      })
                  })
              })
           })
        })
    })

    describe('openInModal Function', () => {

        it('opens a modal', async () => {
            await browser.executeAsync((formDef, done) => {
                var form = new DeclarativForm(formDef)
                form.openInModal()
                done()
            }, formDef)

            var modalEl = await $('.dl-modal')
            expect(await modalEl.isDisplayed()).toEqual(true)
        })

        it('opens a modal which can be closed by clicking ok', async () => {
            var okbtn, modalEl

            await browser.executeAsync((formDef, done) => {
                var form = new DeclarativForm(formDef)
                form.openInModal()
                done()
            }, formDef)

            okbtn = await $('.dl-modal .btn')
            await okbtn.click()
            modalEl = await $('.dl-modal')
            expect(await modalEl.isDisplayed()).toEqual(false)
        })

        it('shows the display values in the select box (not the internal values)', async () => {
            await browser.executeAsync((formDef, done) => {
                var form = new DeclarativForm(formDef)
                form.openInModal()
                done()
            }, formDefWithDisplayValue)

            var input = await $('.dl-modal input')
            expect(await input.getValue()).toEqual('Arabic (Algeria)')
        })

        describe('when no cancelCallback is provided', () => {
            it('opens a modal which can be confirmed by pressing Enter key', async () => {
                var modalEl, wasConfirmed

                await browser.executeAsync((formDef, done) => {
                    var form = new DeclarativForm(formDef, () => {
                        window.confirmed = true
                    })
                    form.openInModal()
                    done()
                }, formDef)

                modalEl = await $('.dl-modal')

                expect(await modalEl.isDisplayed()).toEqual(true)

                await browser.keys('Enter')

                expect(await modalEl.isDisplayed()).toEqual(false)
                expect(await browser.executeAsync(d => d(window.confirmed))).toEqual(true)
            })

            it('opens a modal which cannot be confirmed by pressing enter when the focus is within a filed', async () => {
                var modalEl, wasConfirmed, input

                await browser.executeAsync((formDef, done) => {
                    var form = new DeclarativForm(formDef, () => {
                        window.confirmed = true
                    })
                    form.openInModal()
                    done()
                }, formDef)

                modalEl = await $('.dl-modal')
                expect(await modalEl.isDisplayed()).toEqual(true)

                input = await $('.dl-modal input')
                input.click()

                await browser.keys('Enter')

                expect(await modalEl.isDisplayed()).toEqual(true)
                expect(await browser.executeAsync(d => d(window.confirmed))).toBeFalsy()
            })

            it('opens a modal which can NOT be closed by pressing the x sign', async () => {
                var cancelBtn, modalEl

                await browser.executeAsync((formDef, done) => {
                    var form = new DeclarativForm(formDef, () => {})
                    form.openInModal()
                    done()
                }, formDef)

                cancelBtn = await $('.dl-modal .cancelBtn')
                modalEl = await $('.dl-modal')

                expect(await cancelBtn.isDisplayed()).toEqual(false)
                expect(await modalEl.isDisplayed()).toEqual(true)
            })

            it('opens a modal which can NOT be closed by pressing esc', async () => {
                var cancelBtn, modalEl

                await browser.executeAsync((formDef, done) => {
                    var form = new DeclarativForm(formDef)
                    form.openInModal()
                    done()
                }, formDef)

                await browser.keys('Escape')
                modalEl = await $('.dl-modal')

                expect(await modalEl.isDisplayed()).toEqual(true)
            })

            it('works when it is executed a couple of times with different params', async () => {
                var cancelBtn, modalEl

                await browser.executeAsync((formDef, done) => {
                    var form = new DeclarativForm(formDef, () => {}, () => {})
                    form.openInModal()
                    done()
                }, formDef)

                cancelBtn = await $('.dl-modal .cancelBtn')
                modalEl = await $('.dl-modal')

                expect(await cancelBtn.isDisplayed()).toEqual(true)
                expect(await modalEl.isDisplayed()).toEqual(true)

                cancelBtn = await $('.dl-modal .cancelBtn')
                await cancelBtn.click()

                //Now open anther modal
                await browser.executeAsync((formDef, done) => {
                    var form = new DeclarativForm(formDef, () => {})
                    form.openInModal()
                    done()
                }, formDef)

                cancelBtn = await $('.dl-modal .cancelBtn')
                modalEl = await $('.dl-modal')

                expect(await cancelBtn.isDisplayed()).toEqual(false)
                expect(await modalEl.isDisplayed()).toEqual(true)
            })
        })

        describe('when a cancelCallback is provided', () => {
            it('opens a modal which can be closed by pressing the x sign', async () => {
                var cancelBtn, modalEl

                await browser.executeAsync((formDef, done) => {
                    var form = new DeclarativForm(formDef, () => {}, () => {})
                    form.openInModal()
                    done()
                }, formDef)

                cancelBtn = await $('.dl-modal .cancelBtn')
                await cancelBtn.click()
                modalEl = await $('.dl-modal')
                expect(await modalEl.isDisplayed()).toEqual(false)
            })

            it('opens a modal which can be closed by pressing esc', async () => {
                var okbtn, modalEl

                await browser.executeAsync((formDef, done) => {
                    var form = new DeclarativForm(formDef, () => {}, () => {})
                    form.openInModal()
                    done()
                }, formDef)

                await browser.keys('Escape')
                modalEl = await $('.dl-modal')
                expect(await modalEl.isDisplayed()).toEqual(false)
            })
        })

        describe('when the modal is already open', () => {
            it('does not add a second modal HTML element to the DOM', async () => {
                var modals

                await browser.executeAsync((formDef, done) => {
                    var form = new DeclarativForm(formDef)
                    form.openInModal()
                    done()
                }, formDef)

                okbtn = await $('.dl-modal .btn')
                await okbtn.click()

                await browser.executeAsync((formDef, done) => {
                    var form = new DeclarativForm(formDef)
                    form.openInModal()
                    done()
                }, formDef)

                modals = await $$('.dl-modal')
                expect(await modals.length).toEqual(1)
            })
        })

        describe('when it is initilized in an even handler', () => {
            it('redners the dl-select box', async () => {
                var modalEl, btn, notSelectedOption

                await browser.executeAsync((formDef, done) => {
                    var  btn = document.createElement('div')
                    btn.innerHTML = 'click me'
                    btn.classList.add('open-btn')
                    document.body.appendChild(btn)

                    btn.onclick = function() {
                        var form = new DeclarativForm(formDef)
                        form.openInModal()
                    }

                    done()
                }, formDef)

                modalEl = await $('.dl-modal')
                expect(await modalEl.isExisting()).toEqual(false)
                btn = await $('.open-btn')
                await btn.click()
                modalEl = await $('.dl-modal')
                expect(await modalEl.isExisting()).toEqual(true)
                expect(await modalEl.isDisplayed()).toEqual(true)
                notSelectedOption = await $('dl-option=javascript')
                expect(await notSelectedOption.isDisplayed()).toEqual(false)
            })
        })
    })
})
