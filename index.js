const wdio = require("webdriverio");
const assert = require("assert");
const host = '127.0.0.1';   // default appium host
const port = 4723;          // default appium port

const waitforTimeout = 30 * 60000;
const commandTimeout = 30 * 60000;


const opts = {
  capabilities:
      {
       appiumVersion: '1.16.0',                 // Appium module version
       browserName: '',                        // browser name is empty for native apps
       platformName: 'Android',
       app: './app/ApiDemos-debug.apk',          // Path to your native app
       appPackage: 'io.appium.android.apis',  // Package name of your app
       appActivity: '.view.TextFields', // App activity of the app
       adbExecTimeout:20000,
       platformVersion: '7.1.1',// Android platform version of the device
       deviceName: 'and7',   // device name of the mobile device
       waitforTimeout: 20000,
       commandTimeout: 20000,
       newCommandTimeout: 30 * 60000,
       appWaitDuration:20000,
       automationName:'UiAutomator2',
       clearSystemFiles:true
      }
};

async function main () {
  const client = await wdio.remote(opts);
  const field = await client.$("android.widget.EditText");
  await field.setValue("Hello World!");
  const value = await field.getText();
  assert.equal(value,"Hello World!");
  await client.deleteSession();
}

main();






