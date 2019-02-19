describe('Structured Text Editor', () => {

    beforeEach(async () => {
        await browser.url('index.html');
        await browser.keys('\uE000');
    })

    it('displays the default content', async () => {
        var element = await $('body'),
            content = await element.getText()

        expect(content).toEqual('Hello World')
    })
})
