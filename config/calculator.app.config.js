/**
 * Configuration file
 */

const host = '127.0.0.1';   // default appium host
const port = 4723;          // default appium port

const waitforTimeout = 30 * 60000;
const commandTimeout = 30 * 60000;

exports.config = {
    debug: false,
    specs: [
        './features/calculator.feature',
    ],

    host: host,
    port: port,

    maxInstances: 1,

    capabilities: [
        {
            appiumVersion: '1.16.0',                 // Appium module version
            browserName: '',                        // browser name is empty for native apps
            platformName: 'Android',
            //app: './app/LGCalculator.apk',          // Path to your native app
            appPackage: 'com.android.calculator2',  // Package name of your app
            appActivity: 'com.android.calculator2.Calculator', // App activity of the app
            adbExecTimeout:20000,
            platformVersion: '7.1.1',
            deviceName: 'and7',         // Android platform version of the device
                 // device name of the mobile device
            waitforTimeout: 20000,
            commandTimeout: 20000,
            newCommandTimeout: 30 * 60000,
            appWaitDuration:20000,
            automationName:'UiAutomator2',
            clearSystemFiles:true
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
        ignoreUndefinedDefinitions: false,
        require: ['./stepDefinitions/calcSteps.ts']      // importing/requiring step definition files
    },

    /**
     * hooks help us execute the repeatitive and common utilities 
     * of the project.
     */
    onPrepare: function () {
        console.log('<<< NATIVE APPLICATION TESTS STARTED >>>');
    },

    afterScenario: function (scenario) {
        browser.screenshot();
     },

    onComplete: function () {
        console.log('<<< TESTING FINISHED >>>');
    }

};
