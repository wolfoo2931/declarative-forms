var inputFieldSelector = 'dl-select input',
    arrowBtnSelector = 'dl-select svg'

describe('DlSelect', () => {
    beforeEach(async () => {
        await browser.url('dl_select.html')
        await browser.keys('\uE000')
    })

    it('does not display the options when the select box is not focused', async () => {
        var dlOptions = await $('dl-option')
        expect(await dlOptions.isDisplayed()).toEqual(false)
    })

    it('displays the options when the select box focused', async () => {
        var dlOptions = await $('dl-option'),
            inputField = await $(inputFieldSelector)

        await inputField.click()
        expect(await dlOptions.isDisplayed()).toEqual(true)
    })

    it('focuses the field when the arrow is clicked', async () => {
        var dlOptions = await $('dl-option'),
            arrowBtn = await $(arrowBtnSelector),
            inputField = await $(inputFieldSelector)

        await arrowBtn.click()
        expect(await dlOptions.isDisplayed()).toEqual(true)
        await browser.keys('java')
        expect(await inputField.getValue()).toEqual('java')
    })

    describe('when an option gets clicked', () => {
        it('hides the options', async () => {
            var dlOptions = await $('dl-option'),
                inputField = await $(inputFieldSelector)

            await inputField.click()
            expect(await dlOptions.isDisplayed()).toEqual(true)
            await dlOptions.click()
            expect(await dlOptions.isDisplayed()).toEqual(false)
        })

        it('displays the choosen value', async () => {
            var dlOptions = await $('dl-option'),
                inputField = await $(inputFieldSelector)

            await inputField.click()
            expect(await dlOptions.isDisplayed()).toEqual(true)

            await dlOptions.click()
            expect(await inputField.getValue()).toEqual('JavaScript')
        })
    })

    describe('when focused is moved ot antoher element', () => {
        it('hides the options', async () => {
            var dlOptions = await $('dl-option'),
                inputField = await $(inputFieldSelector),
                body = await $('body')

            await inputField.click()
            expect(await dlOptions.isDisplayed()).toEqual(true)
            await body.click()
            expect(await dlOptions.isDisplayed()).toEqual(false)
        })

        it('empties the input field when no option has been selected', async () => {
            var dlOptions = await $('dl-option'),
                inputField = await $(inputFieldSelector),
                body = await $('body')

            await inputField.click()
            expect(await dlOptions.isDisplayed()).toEqual(true)
            await browser.keys('java')

            await body.click()
            expect(await inputField.getValue()).toEqual('')
        })
    })
})
