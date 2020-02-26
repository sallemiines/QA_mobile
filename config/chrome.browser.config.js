/**
 * Configuration file for web app
 */

const host = '127.0.0.1';   // default appium host
const port = 4723;          // default appium port

const waitforTimeout = 30 * 60000;
const commandTimeout = 30 * 60000;

exports.config = {
    debug: false,
    specs: [
        './features/browser.feature',
    ],

    reporters: ['allure','spec'],
    reporterOptions: {
        allure: {
            outputDir: 'allure-results',
             disableWebdriverStepsReporting: true,
             disableWebdriverScreenshotsReporting: true,

        }
    },

    host: host,
    port: port,

    maxInstances: 1,

    baseUrl: 'http://www.google.com',

    capabilities: [
        {
            appiumVersion: '1.16.0',
            browserName: 'chrome',  // browser name should be specified
            platformName: 'Android',
            platformVersion: '7.1.1',
            deviceName: 'and7', // device name is mandatory
            adbExecTimeout:20000,
            waitforTimeout: 30000,
            commandTimeout: 30000,
            newCommandTimeout: 30 * 60000,
            noReset:true,
            language: 'fr',
            locale: 'FR'
        }
    ],

    services: ['appium'],
    appium: {
        waitStartTime: 6000,
        waitforTimeout: waitforTimeout,
        command: 'appium',
        logFileName: 'appium.log',
        args: {
            address: host,
            port: port,
            commandTimeout: commandTimeout,
            sessionOverride: true,
            debugLogSpacing: true
        }
    },

    /**
     * test configurations
     */
    logLevel: 'silent',
    coloredLogs: true,
    framework: 'cucumber',          // cucumber framework specified 
    cucumberOpts: {
        compiler: ['ts:ts-node/register'],
        backtrace: true,
        failFast: false,
        timeout: 5 * 60 * 60000,
        require: ['./stepDefinitions/browserSteps.ts']   // importing/requiring step definition files
    },

    /**
     * hooks
     */
    onPrepare: function () {
        console.log('<<< BROWSER TESTS STARTED >>>');
    },

    before: function (capabilities, specs) {
        browser.url(this.baseUrl);
    },

    afterScenario: function (scenario) {
       browser.screenshot();
    },

    onComplete: function () {

        console.log('<<< TESTING FINISHED >>>');
    }

};