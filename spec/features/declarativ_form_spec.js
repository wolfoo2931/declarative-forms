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
    })




})
