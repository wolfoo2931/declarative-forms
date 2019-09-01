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
    describe('openInModal Function', () => {
        beforeEach(async () => {
            await browser.url('declarativ_form_modal.html')
            await browser.keys('\uE000')
        })

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
