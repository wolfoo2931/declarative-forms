exports.config = {

    specs: ['./spec/features/**/*.js'],
    exclude: [],

    maxInstances: 1,

    deprecationWarnings: false,

    capabilities: [{
        browserName: 'chrome'
    }],

    sync: true,
    logLevel: 'error',
    coloredLogs: true,
    bail: 0,
    screenshotPath: './.errorShots/',
    baseUrl: 'file:///' + __dirname + '/assets/',
    waitforTimeout: 100000,
    connectionRetryTimeout: 90000,
    connectionRetryCount: 3,

    staticServerLog: false,

    reporters: ['spec'],

    framework: 'jasmine',
    jasmineNodeOpts: {
        defaultTimeoutInterval: 100000,
        expectationResultHandler: function(passed, assertion) {}
    }
}
