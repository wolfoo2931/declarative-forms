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

    describe('when typing', () => {
        it('empties the existing text so I only see the text I entered', async () => {
            var dlOptions = await $('dl-option'),
                inputField = await $(inputFieldSelector),
                body = await $('body')

            await inputField.click()
            await dlOptions.click()
            expect(await inputField.getValue()).toEqual('JavaScript')

            await inputField.click()
            await browser.keys('xxx')
            expect(await inputField.getValue()).toEqual('xxx')
        })

        it('filters the options according to the input', async () => {
          var dlOptions = await $$('dl-option'),
              filteredDlOptions = [],
              inputField = await $(inputFieldSelector),
              body = await $('body')

              expect(dlOptions.length).toEqual(4)

              await inputField.click()
              await inputField.keys('java')

              dlOptions = await $$('dl-option')

              for(let i=0; i<dlOptions.length; i++) {
                  if(await dlOptions[i].isDisplayed()) {
                      filteredDlOptions.push(dlOptions[i])
                  }
              }

              expect(filteredDlOptions.length).toEqual(2)
        })

        it('resets the value to the last valid choosen option when focused lost', async () => {
            var dlOptions = await $('dl-option'),
                inputField = await $(inputFieldSelector),
                body = await $('body')

            await inputField.click()
            await dlOptions.click()
            expect(await inputField.getValue()).toEqual('JavaScript')

            await inputField.click()
            await browser.keys('xxx')
            expect(await inputField.getValue()).toEqual('xxx')
            await body.click()
            expect(await inputField.getValue()).toEqual('JavaScript')
        })
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

        it('empties the input field when no option has been selected and no valid option has been choosen yet', async () => {
            var dlOptions = await $('dl-option'),
                inputField = await $(inputFieldSelector),
                body = await $('body')

            await inputField.click()
            expect(await dlOptions.isDisplayed()).toEqual(true)
            await browser.keys('java')

            await body.click()
            expect(await inputField.getValue()).toEqual('')
        })

        it('resets the input field when input text has been changed to an invalid value but a valid value has been chossen before', async () => {
            var dlOptions = await $('dl-option'),
                inputField = await $(inputFieldSelector),
                body = await $('body')

            await inputField.click()
            expect(await dlOptions.isDisplayed()).toEqual(true)

            await dlOptions.click()
            expect(await inputField.getValue()).toEqual('JavaScript')

            await inputField.click()
            await browser.keys('notAvailableOption')

            await body.click()
            expect(await inputField.getValue()).toEqual('JavaScript')
        })
    })
})
