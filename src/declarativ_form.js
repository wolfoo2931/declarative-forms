import './dl_select';
import tippy from 'tippy.js';
import equal from 'deep-equal';

var tippyInstances = new Map();
var modalDialogs = [];

document.addEventListener("keydown", e => {
    if(modalDialogs.length === 0) {
        return;
    }

    const lastDialog = modalDialogs[modalDialogs.length - 1];

    if(e.key === 'Escape') {
        lastDialog.escHandler(e)
    } else if(e.key === 'Enter') {
        if(Object.keys(lastDialog.buttons).length === 1) {
            lastDialog.enterHandler(e)
        }
    }
});

function DeclarativForm(attrs, onChangeCallback, onCancelCallback, confirmButtonCaption) {
    var self = this;
    this.fields = attrs.fields
    this.dom = document.createElement('div')
    this.dom.classList.add('dl-form')
    this.formElement = document.createElement('form')
    this.dom.appendChild(this.formElement)
    this.onChangeCallback = onChangeCallback
    this.onCancelCallback = onCancelCallback
    this.buttons = attrs.buttons || { [confirmButtonCaption || 'OK']: { action: onChangeCallback, id: 'confirmBtn-' + Math.round(Math.random()*1000000) }  }
    this.initPromises = {}
    this.allPromises = []
    this.nonEmptyTabs = new Set()
    this.onInputChangeSubscribers = []

    if(Object.keys(this.buttons).length === 1) {
        this.onChangeCallback = Object.values(this.buttons)[0].action || Object.values(this.buttons)[0]
    }

    if(attrs.classNames) {
        attrs.classNames.forEach(function(name) {
            self.formElement.classList.add(name)
        })
    }

    this.formElement.onsubmit = function(e) {
        e.preventDefault();
        return false;
    }

    this.escHandler = function(e) {
        self.cancelModalIfCancelable()
    }

    this.enterHandler = function(e) {
        var self = this;
        var field = self.fields.find(function(f) { return f.name === e.target.name})
        var confirmBtnElID =  Object.values(self.buttons).map(b => b.id).find(id => !!id)
        var confirmBtnEl = document.getElementById(confirmBtnElID)

        if(!field || !field.largetext) {
            if(!confirmBtnEl || !confirmBtnEl.classList.contains('disabled')) {
                Promise.allSettled(self.allPromises).then(() => {
                    self.updateCalculatedFields().then(() => {
                        self.closeModalIfOpen()
                    })
                })
            }

            e.preventDefault()
            e.stopPropagation()
        } else if(!field.allowNewlines) {
            e.preventDefault()
            e.stopPropagation()
        }
    }

    this.fields.forEach((field, fieldIndex) => {
        var fieldWrapper = document.createElement('div'),
            fieldElement, label, allowedValues,
            message, tooltip

        allowedValues = (field.allowedValues instanceof Function) ?
            field.allowedValues() :
            field.allowedValues

        message = (field.message instanceof Function) ?
            field.message() :
            field.message

        fieldWrapper.id = 'dl-form-field-wrapper-for-' + field.name
        fieldWrapper.classList.add('dl-form-field-wrapper')

        if(field.tab) {
            let tmpFieldTab = typeof field.tab === 'function' ? field.tab(field) : field.tab;

            (Array.isArray(tmpFieldTab) ? tmpFieldTab : [tmpFieldTab])
            .filter(x => x)
            .forEach(x => {
                fieldWrapper.classList.add(x.replace(/\s/g, ''));
            })
        }

        if(allowedValues) {
            fieldElement = document.createElement('dl-select')

            if(field.multiple) {
                fieldElement.setAttribute('mulitple-allowed', 'true');
            }

            if(field.placeholder) {
                fieldElement.setAttribute('placeholder', field.placeholder)
            }

            fieldWrapper.classList.add('dl-select-wrapper')
            fieldElement.setLoadingStatus()
            self.initPromises[field.name] = Promise.resolve(allowedValues).then(values => {
                field.domElement.removeAllOptions()

                values.forEach((val) => {
                    let optEl = document.createElement('dl-option')
                    if(Array.isArray(val)) {
                        optEl.setAttribute('value', val[0])
                        optEl.innerHTML = val[1]
                        if(val[2]) {
                            optEl.setAttribute('displayWhenSelected', val[2])
                        }
                    } else {
                        optEl.innerHTML = val
                    }

                    fieldElement.onchange = () => {
                        self.updateForm(fieldElement)
                    }

                    fieldElement.addOption(optEl)
                })

                fieldElement.unsetLoadingStatus()
            }).catch(_ => {
                fieldElement.unsetLoadingStatus()
            })

            this.allPromises.push(self.initPromises[field.name])
        } else if (field.message) {
            fieldElement = document.createElement('p')
            fieldElement.classList.add('message')
            fieldElement.innerHTML = field.message
        } else if (field.arrayOf) {
            fieldElement = document.createElement('div')
            fieldElement.classList.add('array-of')
            fieldElement.setValue = (value) => {
                fieldElement.value = value
                self.updateForm(fieldElement)
            }

            field.render = (dom, formData) => {
                dom.innerHTML = ''

                let renderEntry = field.renderEntry || (obj => Object.values(obj).filter(val => (typeof val === 'string') && val.trim() !== '').join(', '))

                if(field.suggested) {
                    let suggestedContainer = document.createElement('div')
                    suggestedContainer.classList.add('dl-form-array-suggested-container')
                    let suggestedEntries = typeof field.suggested === 'function' ?
                        field.suggested(formData, modalDialogs.map(d => d.getValues())) :
                        field.suggested;

                    (suggestedEntries || []).forEach((suggestedEntry, fieldIndex) => {
                        checkboxEl = document.createElement('span')

                        let cb = document.createElement('input')
                        cb.id = 'field-' + fieldIndex
                        cb.setAttribute('type', 'checkbox')
                        cb.oninput = cb.onchange = () => {
                            field.domElement.acceptedSuggestions = field.domElement.acceptedSuggestions || [];

                            checkboxEl.setAttribute('value', cb.checked)

                            if(cb.checked) {
                                field.domElement.acceptedSuggestions.push([suggestedEntry, fieldIndex])
                            } else {
                                field.domElement.acceptedSuggestions = field.domElement.acceptedSuggestions.filter(x => x[1] !== fieldIndex)
                            }
                        }

                        let labelEl = document.createElement('label')
                        labelEl.setAttribute('for', 'field-' + fieldIndex)
                        labelEl.innerHTML = renderEntry(suggestedEntry)

                        checkboxEl.classList.add('check')
                        checkboxEl.classList.add('dl-form-array-of-suggestion')
                        checkboxEl.appendChild(cb)
                        checkboxEl.appendChild(labelEl)
                        checkboxEl.setAttribute('value', false)
                        checkboxEl.jsonValue = suggestedEntry

                        suggestedContainer.appendChild(checkboxEl)

                        return checkboxEl
                    })

                    dom.appendChild(suggestedContainer)
                }

                const getConfirmButton = action => ({
                    'OK': {
                        action,
                        id: 'addIntegration',
                        isActive: formData => field.isValidRecord ? field.isValidRecord(formData, self) : true,
                    }
                })

                dom.value && dom.value.forEach && dom.value.forEach((entryObj, elIndex) => {
                    let entryEl = document.createElement('div')
                    let deleteElBtn = document.createElement('button')
                    let editElBtn = document.createElement('button')
                    deleteElBtn.innerHTML = 'Remove'
                    editElBtn.innerHTML = 'Edit'
                    entryEl.innerHTML = '<span>' + renderEntry(entryObj) + '</span>'
                    entryEl.dataset.ElIndex = elIndex
                    entryEl.classList.add('dl-form-array-of-entry')

                    entryEl.appendChild(editElBtn)
                    entryEl.appendChild(deleteElBtn)

                    deleteElBtn.classList.add('delete-array-of-btn')

                    editElBtn.classList.add('edit-array-of-btn')
                    editElBtn.dataset.ElIndex = elIndex
                    editElBtn.onclick = e => {
                        e.preventDefault()

                        let editFieds = field.arrayOf.map(field => {
                            return {
                                ...field,
                                editArrayOfEntryMode: true,
                                defaultValue: dom.value[editElBtn.dataset.ElIndex][field.name] || field.defaultValue || ''
                            };
                        })

                        field.mapFiledsOnEdit = field.mapFiledsOnEdit || (f => f);

                        new DeclarativForm({ classNames: [`form-for-array-of-${field.name}`], fields: field.mapFiledsOnEdit(editFieds, dom.value[editElBtn.dataset.ElIndex]), buttons: getConfirmButton(formData => {
                            dom.value = dom.value || []
                            dom.value[editElBtn.dataset.ElIndex] = formData
                            dom.setValue(dom.value)
                            if(field.onChange) {
                                Promise.allSettled(this.allPromises).then(() => field.onChange(this.getValues()))
                            }
                        }) }, () => {}, () => {}).openInModal()
                    }

                    deleteElBtn.dataset.ElIndex = elIndex
                    deleteElBtn.onclick = e => {
                        dom.value.splice(deleteElBtn.dataset.ElIndex, 1)
                        dom.setValue(dom.value)
                        e.preventDefault()
                        if(field.onChange) {
                            Promise.allSettled(this.allPromises).then(() => field.onChange(this.getValues()))
                        }
                    }

                    dom.appendChild(entryEl)
                })

                let addButton = document.createElement('button')
                addButton.classList.add('dl-form-array-of-add-entry')
                addButton.innerHTML = field.newButtonLabel || 'Add'

                addButton.onclick = e => {
                    new DeclarativForm({ classNames: [`form-for-array-of-${field.name}`], fields: field.arrayOf, buttons: getConfirmButton(formData => {
                        dom.value = dom.value || []
                        dom.value.push(formData)
                        dom.setValue(dom.value)
                        if(field.onChange) {
                            Promise.all(this.allPromises).then(() => field.onChange(this.getValues()))
                        }
                    })}, () => {}, () => {}).openInModal()

                    e.preventDefault()
                }

                dom.appendChild(addButton)
            }

            field.render(fieldElement, self.formData, self)
        } else if (field.render) {
            fieldElement = document.createElement('p')
            fieldElement.classList.add('render')

            fieldElement.setValue = (value) => {
                fieldElement.value = value
                self.updateForm(fieldElement)
            }

            fieldElement.onChange = function (forceFormUpdate) {
                self.updateForm(fieldElement, forceFormUpdate);
            }

            field.render(fieldElement, self.formData, self)
        } else if (field.largetext) {
            fieldElement = document.createElement('textarea')
            fieldElement.oninput = fieldElement.onchange = function() {
                self.updateForm(fieldElement);
            }

            fieldElement.setValue = (value) => {
                fieldElement.value = value
                self.updateForm(fieldElement)
            }
        } else if (field.check) {
            fieldElement = document.createElement('span')

            let cb = document.createElement('input')
            cb.id = 'field-' + fieldIndex
            cb.setAttribute('type', 'checkbox')
            cb.oninput = cb.onchange = function() {
                fieldElement.setAttribute('value', cb.checked)
                self.updateForm(cb);
            }

            let labelEl = document.createElement('label')
            labelEl.setAttribute('for', 'field-' + fieldIndex)
            labelEl.innerHTML = field.check

            fieldElement.classList.add('check')
            fieldElement.appendChild(cb)
            fieldElement.appendChild(labelEl)
            fieldElement.setAttribute('value', typeof field.defaultValue === 'function' ? field.defaultValue(self.formData) : field.defaultValue)
            fieldElement.setValue = function(val) {
                cb.checked = !!val
            }
        } else if (field.detailedOptions) {
            fieldElement = document.createElement('div')
            fieldElement.classList.add('detailed-options')

            field.detailedOptions.forEach(function(option) {
                var optionEl = document.createElement('div');
                optionEl.classList.add('detailed-option');

                optionEl.innerHTML = option.html;
                optionEl.setAttribute('data-value', option.value);

                optionEl.addEventListener("click", function() {
                    fieldElement.value = option.value;
                    fieldElement.querySelectorAll('.detailed-option').forEach(function(option) {
                        option.classList.remove('active');
                    });

                    optionEl.classList.add('active');
                    self.updateForm(optionEl);
                });

                fieldElement.appendChild(optionEl)
                fieldElement.setValue = function(val) {
                    var el = fieldElement.querySelector(`div[data-value="${val}"]`);

                    if(!el) {
                        return;
                    }

                    fieldElement.value = val;
                    fieldElement.querySelectorAll('.detailed-option').forEach(function(option) {
                        option.classList.remove('active');
                    });

                    el.classList.add('active');
                }
            });
        } else if (field.calculate) {
            fieldElement = document.createElement('input')
            fieldElement.type = 'hidden'
        } else {
            fieldElement = document.createElement('input')
            fieldElement.setValue = function(val) {
                fieldElement.value = val;
            }

            if(field.inputType) {
                fieldElement.setAttribute('type', field.inputType);
            }

            if(field.autocomplete) {
                fieldElement.setAttribute('autocomplete', field.autocomplete);
            }

            if(field.placeholder && typeof field.placeholder !== 'function') {
                fieldElement.placeholder = field.placeholder;
            }

            fieldElement.oninput = fieldElement.onchange = function() {
                self.updateForm(fieldElement);
            }
        }

        field.domElement = fieldElement
        fieldElement.name = field.name
        fieldElement.setAttribute('name', field.name)

        if(field.className) {
            field.className.split(' ').forEach(cn => fieldWrapper.classList.add(cn))
        }

        if(field.displayName) {
            label = document.createElement('label')
            label.innerHTML = field.displayName
            label.setAttribute('for', field.name)
            fieldWrapper.appendChild(label)
        } else {
            fieldWrapper.classList.add('withoutLabel')
        }

        if(field.tooltip) {
            tooltip = document.createElement('span')
            tooltip.dataset['tippyContent'] = field.tooltip.text || field.tooltip
            tooltip.dataset['initialTippyContent'] = field.tooltip.text || field.tooltip
            tooltip.classList.add('dl-tooltip')
            tooltip.innerHTML = '?'

            if(label && !field.tooltip.inInput) {
                label.appendChild(tooltip)
            } else {
                tooltip.classList.add('dl-tooltip-in-input')
                fieldElement.classList.add('dl-tooltip-inside')
                fieldWrapper.appendChild(tooltip)
            }
        }

        if(fieldElement.type === 'hidden') {
            fieldWrapper.classList.add('dl-form-hidden-field')
        }

        fieldWrapper.appendChild(fieldElement)
        self.dom.children[0].appendChild(fieldWrapper)

        if(field.defaultValue) {
            this.allPromises.push(Promise.all(self.initPromises[field.name]).then(_ => {
                let tmpDefaultValue = typeof field.defaultValue === 'function' ? field.defaultValue(self.formData) : field.defaultValue

                if(fieldElement.setValue) {
                    fieldElement.setValue(tmpDefaultValue)
                } else if (fieldElement.tagName === 'INPUT' || fieldElement.tagName === 'TEXTAREA') {
                    fieldElement.value = tmpDefaultValue
                } else {
                    fieldElement.setAttribute('value', tmpDefaultValue)
                }
            }))
        }
    })

    Promise.allSettled(this.allPromises).then(_ => self.updateForm())
}

DeclarativForm.prototype = {

    hasUpdatedSinceLastCompare(formData, includeTab) {
        if(!this._lastFromUpdatSate && formData) {
            this._lastFromUpdatSate = formData;
            return true;
        }

        const formDataCopy = JSON.parse(JSON.stringify(formData));
        const formDataCopyWithoutTab = JSON.parse(JSON.stringify(formData));
        delete formDataCopyWithoutTab.activeTab;

        if(includeTab) {
            if(!equal(this._lastFromUpdatSate, formDataCopy)) {
                this._lastFromUpdatSate = formDataCopy;
                this._lastFromUpdatSateWithoutTab = formDataCopyWithoutTab;
                return true;
            }
        } else {
            if(!equal(this._lastFromUpdatSateWithoutTab, formDataCopyWithoutTab)) {
                this._lastFromUpdatSate = formDataCopy;
                this._lastFromUpdatSateWithoutTab = formDataCopyWithoutTab;
                return true;
            }
        }

        return false;
    },

    updateForm: function(triggerElement, forceFormUpdate, alsoWhenTabChanged) {
        var formData = this.getValues();
        var self = this
        var triggerFieldName = triggerElement && triggerElement.name;
        var dataUnchanged = !this.hasUpdatedSinceLastCompare(formData, alsoWhenTabChanged);

        if(dataUnchanged && !forceFormUpdate) {
            return;
        }

        this.nonEmptyTabs = new Set();

        var addNonEmptyTab = (f) => {
            let tmpFieldTab = typeof f.tab === 'function' ? f.tab(f) : f.tab;
            if(tmpFieldTab) {
                this.nonEmptyTabs.add(tmpFieldTab)
            }
        }

        this.fields.forEach(field => {
            var shouldReload = (!triggerFieldName || (field.reloadOnChangeOf && field.reloadOnChangeOf.includes(triggerFieldName)))
            if(!field.domElement) {
                return;
            }

            if(field.isActive) {
                let tmpIsActive = field.isActive(formData, modalDialogs.map(d => d.getValues()), field)
                if(tmpIsActive) {
                    field.domElement.parentElement.classList.remove('inactive')
                    if(field.tab) {
                        addNonEmptyTab(field)
                    }
                } else {
                    field.domElement.parentElement.classList.add('inactive')
                }
            } else if (field.tab) {
                addNonEmptyTab(field)
            }

            if(field.onFormChange) {
                field.onFormChange(formData, self, triggerElement)
            }

            if(field.render) {
                field.render(field.domElement, formData, self)
            }

            if(field.placeholder && typeof field.placeholder === 'function') {
                field.domElement.placeholder = field.placeholder(formData);
            }

            if(field.allowedValues instanceof Function && shouldReload) {
                const allowedValues = field.allowedValues(formData)
                field.domElement.setLoadingStatus()
                this.allPromises.push(allowedValues)

                Promise.resolve(allowedValues).then(values => {
                    this.resetTooltip(field.name)
                    field.domElement.removeAllOptions()

                    values && values.forEach((val) => {
                        let optEl = document.createElement('dl-option')
                        if(Array.isArray(val)) {
                            optEl.setAttribute('value', val[0])
                            optEl.innerHTML = val[1]
                            if(val[2]) {
                                optEl.setAttribute('displayWhenSelected', val[2])
                            }
                        } else {
                            optEl.innerHTML = val
                        }

                        field.domElement.onchange = function() {
                            self.updateForm(field.domElement)
                        }

                        field.domElement.addOption(optEl)
                    })

                    field.domElement.unsetLoadingStatus()
                    field.domElement.setValue(field.domElement.getValue())
                }).catch(err => {
                    field.domElement.unsetLoadingStatus()
                    if(field.onValuesCalculationFailedMessage) {
                        const message = field.onValuesCalculationFailedMessage(formData, err);
                        if(message.level === 'info') {
                            this.setTooltipWarning(field.name, message.text)
                        } else if(message.level === 'warning') {
                            this.setTooltipWarning(field.name, message.text)
                        } else if(message.level === 'error') {
                            this.setTooltipError(field.name, message.text)
                        }
                    }
                })
            }
        });

        Promise.allSettled(this.allPromises).then(() => {
            formData = this.getValues();

            if(!dataUnchanged) {
                self.notifyOnInputSubscribers(formData);
            }

            self.updateTabs()

            Object.values(this.buttons)
                .filter(btn => (btn.isActive && btn.id))
                .forEach(btn => {
                    let buttonEl = document.getElementById(btn.id)
                    if(!buttonEl) return;

                    buttonEl.classList.add('disabled')

                    let isActiveCheckPrmise = btn.isActive(formData)
                    this.allPromises.push(isActiveCheckPrmise)

                    Promise.resolve(isActiveCheckPrmise)
                        .then(BtnIsActive => {
                            if(BtnIsActive) {
                                buttonEl.classList.remove('disabled')
                            } else {
                                buttonEl.classList.add('disabled')
                            }
                        })
                });

            Object.values(this.buttons)
                .filter(btn => (btn.isVisible && btn.id))
                .forEach(btn => {
                    let buttonEl = document.getElementById(btn.id)
                    if(!buttonEl) return;

                    buttonEl.classList.add('invisible')

                    let isVisibleCheckPrmise = btn.isVisible(formData)
                    this.allPromises.push(isVisibleCheckPrmise)

                    Promise.resolve(isVisibleCheckPrmise)
                        .then(BtnIsActive => {
                            if(BtnIsActive) {
                                buttonEl.classList.remove('invisible')
                            } else {
                                buttonEl.classList.add('invisible')
                            }
                        })
                });
        })
    },

    subscribeOnInput(callback) {
        this.onInputChangeSubscribers.push(callback);
    },

    notifyOnInputSubscribers(formData) {
        this.onInputChangeSubscribers.forEach((cb) => cb(JSON.parse(JSON.stringify(formData))))
    },

    updateCalculatedFields(triggerFieldName, formData) {
        return Promise.allSettled(this.fields.map(field => new Promise(done => {
            var shouldReload = (!triggerFieldName || (field.reloadOnChangeOf && field.reloadOnChangeOf.includes(triggerFieldName)))

            if(field.calculate && shouldReload) {
                return Promise.allSettled(this.allPromises).then(() => {
                    const thisUpdatePromise = field.calculate(formData || this.getValues())
                    this.allPromises.push(thisUpdatePromise)
                    return Promise.resolve(thisUpdatePromise).then(v => {
                        field.domElement._value = v
                        done()
                    })
                })
            } else {
                done()
            }
        })))
    },

    getHTML: function() {
        return this.dom.outerHTML;
    },

    openInModal: function(attr) {
        var self = this;
        modalDialogs.push(this);
        this.isEmbedded = false;

        this.modalEl = this.modalEl || this.createModalElement(attr)

        var modalContent = this.modalEl.querySelector('.modal-content')
        var modalWindow = this.modalEl.querySelector('.modal')

        this.updateTabs()
        modalContent.appendChild(this.dom)
        this.modalEl.style.display = 'block'

        if(attr && attr.classNames) {
            attr.classNames.forEach(function(name) {
                modalWindow.classList.add(name)
            })
        }

        if(attr && attr.wrapperClassNames) {
            attr.wrapperClassNames.forEach(function(name) {
                self.modalEl.classList.add(name)
            })
        }

        this.updateTooltips();

        if(modalDialogs.length >= 2) {
            modalDialogs[modalDialogs.length-2].hide()
        }
    },

    appendInElement: function(el, attr) {
        var self = this
        this.isEmbedded = true;
        this.modalEl = this.modalEl || this.createModalElement(attr, true)
        this.modalEl.style.display = 'block'

        var modalContent = this.modalEl.querySelector('.modal-content')

        this.modalEl.classList.add('noModalDialog')

        if(attr && attr.classNames) {
            attr.classNames.forEach(function(name) {
                self.modalEl.classList.add(name)
            })
        }

        modalContent.appendChild(this.dom)
        el.appendChild(this.modalEl)

        Promise.allSettled(this.allPromises).then(_ => {
            this.updateTabs()
            this.updateTooltips()
        })
    },

    hide: function() {
        this.modalEl && this.modalEl.classList.add('dl-modal-hidden')
    },

    show: function() {
        this.modalEl && this.modalEl.classList.remove('dl-modal-hidden')
    },

    updateTooltips: function(sel) {
        sel = sel || '[data-tippy-content]';

        var domElements = document.querySelectorAll(sel);

        domElements.forEach(el => {
            if(tippyInstances.get(el)) {
                tippyInstances.get(el).forEach(el => el.destroy());
                tippyInstances.delete(el);
            }
        })

        var tippies = tippy(sel, {
            placement: 'right',
            allowHTML: true,
            interactive: true
        })

        tippies.forEach(tippy => {
            if(tippyInstances.get(tippy.reference)) {
                tippyInstances.get(tippy.reference).push(tippy)
            } else {
                tippyInstances.set(tippy.reference, [tippy]);
            }
        });
    },

    setTooltip: function(fieldName, text, iconContent, className) {
        className = className || '';
        var tooltipSelector = `#dl-form-field-wrapper-for-${fieldName} .dl-tooltip`;
        var tooltipEl = document.querySelector(tooltipSelector);

        if(tooltipEl.classList.value.includes('dl-tooltip-in-input')) {
            tooltipEl.classList.value = `dl-tooltip dl-tooltip-in-input ${className}`;
        } else {
            tooltipEl.classList.value = `dl-tooltip ${className}`;
        }

        tooltipEl.dataset['tippyContent'] = text;
        tooltipEl.innerHTML = iconContent;

        this.updateTooltips(tooltipSelector);
    },

    setTooltipSuccess: function(fieldName, text) {
        this.setTooltip(fieldName, text, '&#10003;', 'tooltip-success')
    },

    setTooltipWarning: function(fieldName, text) {
        this.setTooltip(fieldName, text, '!', 'tooltip-warning');
    },

    setTooltipError: function(fieldName, text) {
        this.setTooltip(fieldName, text, '!', 'tooltip-error');
    },

    resetTooltip: function(fieldName) {
        var tooltipEl = document.querySelector(`#dl-form-field-wrapper-for-${fieldName} .dl-tooltip`);

        if(tooltipEl) {
            this.setTooltip(fieldName, tooltipEl.dataset['initialTippyContent'], '?', '');
        }
    },

    resetTooltips: function(fieldNames) {
        fieldNames.forEach(fieldName => this.resetTooltip(fieldName))
    },

    updateTabs: function() {
        var tabsWrapper = this.modalEl.querySelector('.tabWrapper'),
            self = this, tmpTabEl,
            tabs = this.fields
                .filter(f => f.tab)
                .map(f => typeof f.tab === 'function' ? f.tab(f) : f.tab)
                .flat()
                .filter((value, index, self) => self.indexOf(value) === index);

        var tabsClassNames = Array.prototype.map.call(tabsWrapper.children, (tab) => {
            return tab.className.split(' ').filter((cn) => ['seen'].includes(cn))
        });

        tabsWrapper.innerHTML = '';

        var filteredTabs = tabs
            .filter(tab => tab && self.nonEmptyTabs.has(tab))

        filteredTabs.forEach((tab, tabIndex) => {
            tmpTabEl = document.createElement('div')
            tmpTabEl.classList.add('dl-tab-btn')
            tmpTabEl.classList.add(tab.replace(/\s/g, ''))
            tmpTabEl.innerHTML = tab
            tmpTabEl.onclick = function() {
                self.setActiveTab(tab)
            }

            if(tabsClassNames[tabIndex]) {
                tabsClassNames[tabIndex].forEach(cn => tmpTabEl.classList.add(cn))
            }

            tabsWrapper.appendChild(tmpTabEl)
        })

        if(this.activeTab || filteredTabs[0]) {
            this.setActiveTab(this.activeTab || filteredTabs[0])
        }
    },

    setActiveTab: function(tab) {
        if(!tab) {
            tab = this.activeTab
        }

        if(!tab) {
            return;
        }

        var tabClassName = tab.replace(/\s/g, ''),
            currentActiveTabBtn = document.querySelector('.dl-tab-btn.active'),
            tabBtn = document.querySelector('.dl-tab-btn.' + tabClassName)

        if(currentActiveTabBtn) {
            currentActiveTabBtn.classList.remove('active')
        }

        tabBtn.classList.add('active')
        tabBtn.classList.add('seen')

        this.activeTab = tab;
        this.fields.forEach(field => {
            if(!field.domElement) { return }

            let tmpFieldTab = typeof field.tab === 'function' ? field.tab(field) : field.tab;

            if(tmpFieldTab === tab || (tmpFieldTab && tmpFieldTab.includes && tmpFieldTab.includes(tab))) {
                field.domElement.parentElement.classList.remove('notInTab')
            } else {
                field.domElement.parentElement.classList.add('notInTab')
            }
        })

        this.updateForm(undefined, undefined, true);
    },

    deleteFromStack: function() {
        modalDialogs = modalDialogs.filter(dia => dia !== this)
    },

    cancelModalIfCancelable: function() {
        if(this.onCancelCallback) {
            if(this.modalEl) {
                this.modalEl.remove()
                this.modalEl = null
            }

            this.onCancelCallback()
            this.deleteFromStack()

            if(modalDialogs.length) {
                modalDialogs[modalDialogs.length-1].show()
                modalDialogs[modalDialogs.length-1].setActiveTab()
            }
        }
    },

    closeModalIfOpen: function(callaback) {
        callaback = callaback || this.onChangeCallback

        if(this.modalEl && !this.isEmbedded) {
            this.modalEl.remove()
            this.modalEl = null
        }

        if(callaback) {
            callaback(this.getValues())
        }

        this.deleteFromStack()

        if(modalDialogs.length) {
            modalDialogs[modalDialogs.length-1].show()
            modalDialogs[modalDialogs.length-1].setActiveTab()
        }
    },

    remove: function() {
        if(this.modalEl) {
            this.modalEl.remove()
            this.modalEl = null
        }

        this.deleteFromStack()

        if(modalDialogs.length) {
            modalDialogs[modalDialogs.length-1].show()
            modalDialogs[modalDialogs.length-1].setActiveTab()
        }
    },

    getValues: function() {
        var result  = {}

        //TODO: filter calculated fields
        this.fields.filter(function(field) {
            return field.domElement && !field.domElement.parentElement.classList.contains('inactive')
        }).forEach(function(field) {
            if(!field.domElement) { return }
            result[field.name] = field.domElement.getAttribute('value') || field.domElement._value || field.domElement.value

            if(field.domElement.acceptedSuggestions) {
                result[field.name] = result[field.name] || [];
                field.domElement.acceptedSuggestions
                    .map(el => el[0])
                    .forEach(candidate => {
                        if(!result[field.name].find(processed => JSON.stringify(candidate) === JSON.stringify(processed))) {
                            result[field.name].push(candidate)
                        }
                    })
            }

            if(!result[field.name]) {
                result[field.name] = ''
            }

            if(field.check) {
                result[field.name] = result[field.name] === 'true'
            }
        })

        result.activeTab = this.activeTab;
        return result
    },

    createModalElement: function(attr, doNotMount) {

        attr = attr || {}
        attr.classNames = attr.classNames || []

        var modalWrapper = document.createElement('div'),
            modal = document.createElement('div'),
            modalContent = document.createElement('div'),
            lowBar = document.createElement('div'),
            upBar  = document.createElement('div'),
            cancelBtn = document.createElement('div'),
            tabWrapper = document.createElement('div'),
            tmpBtn

        modalWrapper.classList.add('dl-modal')
        modalWrapper.style.display = 'none'
        modal.classList.add('modal')
        modalContent.classList.add('modal-content')
        tabWrapper.classList.add('tabWrapper')
        lowBar.classList.add('low-bar')

        Object.keys(this.buttons).forEach((btn => {
            let callback = typeof this.buttons[btn] === 'function' ? this.buttons[btn] : this.buttons[btn].action
            tmpBtn = document.createElement('div')
            tmpBtn.classList.add('btn')
            tmpBtn.innerHTML = btn

            if(this.buttons[btn].id) {
                tmpBtn.id = this.buttons[btn].id
            }

            if(this.buttons[btn].class) {
                this.buttons[btn].class.split(' ').forEach((className) => {
                    tmpBtn.classList.add(className)
                })
            }

            tmpBtn.onclick = (event) => {
                const classes = event.target.classList

                if(classes.contains('loading-btn') || classes.contains('disabled')) {
                    return
                }

                Promise.allSettled(this.allPromises).then(() => {
                    if(!classes.contains('disabled')) {
                        this.updateCalculatedFields().then(() => {
                            if(!this.buttons[btn].doNotCloseModal) {
                                this.closeModalIfOpen(callback)
                            } else {
                                callback(this.getValues())
                            }

                            classes.remove('loading-btn')
                        })
                    }
                })
            }

            lowBar.appendChild(tmpBtn)
        }))

        if(this.onCancelCallback) {
            upBar.classList.add('up-bar')
            cancelBtn.classList.add('cancelBtn')
            cancelBtn.classList.add('secondary')
            cancelBtn.onclick = () => { this.cancelModalIfCancelable() }
            upBar.appendChild(cancelBtn)
        }

        modalWrapper.appendChild(modal)
        modal.appendChild(upBar)
        modal.appendChild(tabWrapper)
        modal.appendChild(modalContent)
        modal.appendChild(lowBar)

        if(!doNotMount) {
            document.body.appendChild(modalWrapper)
        }

        return modalWrapper
    }
}

export default DeclarativForm
