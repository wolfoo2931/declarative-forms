var DeclarativForms = require('./../../src/declarativ_forms.js');

describe('declarativ-forms', () => {
    it('is a constructor function', () => {
        var obj = new DeclarativForms();
        expect(obj).not.toBeNull();
    });
});
