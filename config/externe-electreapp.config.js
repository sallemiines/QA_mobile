/**
 * Configuration file
 */

const host = '172.16.0.169';   // default appium host
const port = 4723;          // default appium


const waitforTimeout = 30 * 60000;
const commandTimeout = 30 * 60000;

exports.config = {
    debug: false,
    specs: [
        './features/livre.feature',
    ],

    reporters: ['allure','spec'],
    reporterOptions: {
        allure: {
            outputDir: './allure-results/'
        }
    },
    host: host,
    port: port,

    maxInstances: 1,

    capabilities: [
        {
                 appiumVersion: '1.16.0',                 // Appium module version
                 browserName: '',                        // browser name is empty for native apps
                 platformName: 'Android',
                 app: '/apk/elect.apk',          // Path to your native app
                 appPackage: 'com.immanens.electrelh',  // Package name of your app
                 appActivity:'com.immanens.electrelh.ui.activities.SplashScreenActivity', // App activity of the app
                 adbExecTimeout:20000,
                 platformVersion: '5.1',// Android platform version of the device
                 deviceName: 'holala',   // device name of the mobile device
                 waitforTimeout: 20000,
                 commandTimeout: 20000,
                 newCommandTimeout: 30 * 60000,
                 appWaitDuration:20000,
                 automationName:'UiAutomator2',
                 clearSystemFiles:true,
        }
    ],

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
        ignoreUndefinedDefinitions: false,
        require: ['./stepDefinitions/livreSteps.ts']      // importing/requiring step definition files
    },

    /**
     * hooks help us execute the repeatitive and common utilities 
     * of the project.
     */
    onPrepare: function () {
        console.log('<<< EXTERNAL EMULATION : INSTALLING & TESTIN THE "ELECTRE"  APPLICATION  >>>');
    },

    afterScenario: function (scenario) {
        browser.screenshot();
     },

    onComplete: function () {
        console.log('<<< TESTING FINISHED >>>');
    }

};
