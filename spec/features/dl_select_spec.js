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

    describe('when keyboard is used to select option', () => {
        it('allows to select options via key up/down and enter', async () => {
            var dlOptions = await $('dl-option'),
                inputField = await $(inputFieldSelector)

            await inputField.click()
            await browser.keys('ArrowDown')
            await browser.keys('ArrowDown')
            await browser.keys('ArrowDown')
            await browser.keys('Enter')
            expect(await inputField.getValue()).toEqual('C++')
            expect(await dlOptions.isDisplayed()).toEqual(false)

            await inputField.click()
            await browser.keys('ArrowUp')
            await browser.keys('Enter')
            expect(await inputField.getValue()).toEqual('Java')
            expect(await dlOptions.isDisplayed()).toEqual(false)
        })

        describe('when options are filtered', () => {
            it('allows to select options via key down and enter', async () => {
                var dlOptions = await $('dl-option'),
                    inputField = await $(inputFieldSelector)

                await inputField.click()
                await browser.keys('java')

                await browser.keys('ArrowDown')
                await browser.keys('ArrowDown')
                await browser.keys('Enter')
                expect(await inputField.getValue()).toEqual('Java')
                expect(await dlOptions.isDisplayed()).toEqual(false)
            })

            it('allows to select options via key up and enter', async () => {
                var dlOptions = await $('dl-option'),
                    inputField = await $(inputFieldSelector)

                await inputField.click()
                await browser.keys('java')

                await browser.keys('ArrowDown')
                await browser.keys('ArrowDown')
                await browser.keys('ArrowUp')
                await browser.keys('Enter')
                expect(await inputField.getValue()).toEqual('JavaScript')
                expect(await dlOptions.isDisplayed()).toEqual(false)
            })
        })
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
              body = await $('body'),
              noMatchesHint = await $('.noMatchesHint')

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
              expect(await noMatchesHint.isDisplayed()).toEqual(false)
        })

        it('display a hint that no option matches when no options matches the input', async () => {
            var dlOptions = await $$('dl-option'),
                filteredDlOptions = [],
                inputField = await $(inputFieldSelector),
                body = await $('body'),
                noMatchesHint = await $('.noMatchesHint')

                expect(dlOptions.length).toEqual(4)

                await inputField.click()
                await inputField.keys('nothingMatchesThis')

                dlOptions = await $$('dl-option')

                for(let i=0; i<dlOptions.length; i++) {
                    if(await dlOptions[i].isDisplayed()) {
                        filteredDlOptions.push(dlOptions[i])
                    }
                }

                expect(filteredDlOptions.length).toEqual(0)
                expect(await noMatchesHint.isDisplayed()).toEqual(true)
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

        it('resets the filter when it focused after an option has already been choosen', async () => {
            var dlOptions = await $('dl-option'),
                inputField = await $(inputFieldSelector),
                body = await $('body'),
                filteredDlOptions = []

            await inputField.click()
            await browser.keys('javascript')
            dlOptions = await $('dl-option')
            await dlOptions.click()
            await inputField.click()

            dlOptions = await $$('dl-option')

            for(let i=0; i<dlOptions.length; i++) {
                if(await dlOptions[i].isDisplayed()) {
                    filteredDlOptions.push(dlOptions[i])
                }
            }

            expect(filteredDlOptions.length).toEqual(4)
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

    describe('when each option has a value attribute', () => {
        beforeEach(async () => {
            await browser.url('dl_select_with_value_in_options.html')
        })

        it('returns the options value not the captions', async () => {
            var dlOptions = await $('dl-option'),
                inputField = await $(inputFieldSelector),
                dlSelectValue

            await inputField.click()
            expect(await dlOptions.isDisplayed()).toEqual(true)

            await dlOptions.click()

            dlSelectValue = await browser.execute(function() {
                return document.querySelector('dl-select').getValue()
            })

            expect(await inputField.getValue()).toEqual('English')
            expect(dlSelectValue).toEqual('en')
        })
    })
})
