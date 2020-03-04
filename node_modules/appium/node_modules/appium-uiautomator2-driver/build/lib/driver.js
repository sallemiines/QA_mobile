"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.AndroidUiautomator2Driver = void 0;

require("source-map-support/register");

var _lodash = _interopRequireDefault(require("lodash"));

var _appiumBaseDriver = require("appium-base-driver");

var _uiautomator = require("./uiautomator2");

var _appiumSupport = require("appium-support");

var _asyncbox = require("asyncbox");

var _bluebird = _interopRequireDefault(require("bluebird"));

var _logger = _interopRequireDefault(require("./logger"));

var _index = _interopRequireDefault(require("./commands/index"));

var _appiumAdb = require("appium-adb");

var _helpers = _interopRequireDefault(require("./helpers"));

var _appiumAndroidDriver = require("appium-android-driver");

var _desiredCaps = _interopRequireDefault(require("./desired-caps"));

var _portscanner = require("portscanner");

var _asyncLock = _interopRequireDefault(require("async-lock"));

const helpers = Object.assign({}, _helpers.default, _appiumAndroidDriver.androidHelpers);
const SYSTEM_PORT_RANGE = [8200, 8299];
const PORT_ALLOCATION_GUARD = new _asyncLock.default();
const DEVICE_PORT = 6790;
const NO_PROXY = [['GET', new RegExp('^/session/(?!.*/)')], ['GET', new RegExp('^/session/[^/]+/alert_[^/]+')], ['GET', new RegExp('^/session/[^/]+/alert/[^/]+')], ['GET', new RegExp('^/session/[^/]+/appium/[^/]+/current_activity')], ['GET', new RegExp('^/session/[^/]+/appium/[^/]+/current_package')], ['GET', new RegExp('^/session/[^/]+/appium/app/[^/]+')], ['GET', new RegExp('^/session/[^/]+/appium/device/[^/]+')], ['GET', new RegExp('^/session/[^/]+/appium/settings')], ['GET', new RegExp('^/session/[^/]+/context')], ['GET', new RegExp('^/session/[^/]+/contexts')], ['GET', new RegExp('^/session/[^/]+/element/[^/]+/attribute')], ['GET', new RegExp('^/session/[^/]+/element/[^/]+/displayed')], ['GET', new RegExp('^/session/[^/]+/element/[^/]+/enabled')], ['GET', new RegExp('^/session/[^/]+/element/[^/]+/location_in_view')], ['GET', new RegExp('^/session/[^/]+/element/[^/]+/name')], ['GET', new RegExp('^/session/[^/]+/element/[^/]+/screenshot')], ['GET', new RegExp('^/session/[^/]+/element/[^/]+/selected')], ['GET', new RegExp('^/session/[^/]+/ime/[^/]+')], ['GET', new RegExp('^/session/[^/]+/location')], ['GET', new RegExp('^/session/[^/]+/log/types')], ['GET', new RegExp('^/session/[^/]+/network_connection')], ['GET', new RegExp('^/session/[^/]+/screenshot')], ['GET', new RegExp('^/session/[^/]+/timeouts')], ['GET', new RegExp('^/session/[^/]+/url')], ['POST', new RegExp('^/session/[^/]+/[^/]+_alert$')], ['POST', new RegExp('^/session/[^/]+/actions')], ['POST', new RegExp('^/session/[^/]+/alert/[^/]+')], ['POST', new RegExp('^/session/[^/]+/app/[^/]')], ['POST', new RegExp('^/session/[^/]+/appium/[^/]+/start_activity')], ['POST', new RegExp('^/session/[^/]+/appium/app/[^/]+')], ['POST', new RegExp('^/session/[^/]+/appium/compare_images')], ['POST', new RegExp('^/session/[^/]+/appium/device/(?!set_clipboard)[^/]+')], ['POST', new RegExp('^/session/[^/]+/appium/element/[^/]+/replace_value')], ['POST', new RegExp('^/session/[^/]+/appium/element/[^/]+/value')], ['POST', new RegExp('^/session/[^/]+/appium/getPerformanceData')], ['POST', new RegExp('^/session/[^/]+/appium/performanceData/types')], ['POST', new RegExp('^/session/[^/]+/appium/settings')], ['POST', new RegExp('^/session/[^/]+/appium/execute_driver')], ['POST', new RegExp('^/session/[^/]+/appium/start_recording_screen')], ['POST', new RegExp('^/session/[^/]+/appium/stop_recording_screen')], ['POST', new RegExp('^/session/[^/]+/appium/.*event')], ['POST', new RegExp('^/session/[^/]+/context')], ['POST', new RegExp('^/session/[^/]+/element')], ['POST', new RegExp('^/session/[^/]+/ime/[^/]+')], ['POST', new RegExp('^/session/[^/]+/keys')], ['POST', new RegExp('^/session/[^/]+/location')], ['POST', new RegExp('^/session/[^/]+/log')], ['POST', new RegExp('^/session/[^/]+/network_connection')], ['POST', new RegExp('^/session/[^/]+/timeouts')], ['POST', new RegExp('^/session/[^/]+/touch/multi/perform')], ['POST', new RegExp('^/session/[^/]+/touch/perform')], ['POST', new RegExp('^/session/[^/]+/url')], ['POST', new RegExp('^/session/[^/]+/execute')], ['POST', new RegExp('^/session/[^/]+/execute_async')], ['GET', new RegExp('^/session/[^/]+/window/rect')], ['POST', new RegExp('^/session/[^/]+/execute/async')], ['POST', new RegExp('^/session/[^/]+/execute/sync')]];
const CHROME_NO_PROXY = [['GET', new RegExp('^/session/[^/]+/appium')], ['GET', new RegExp('^/session/[^/]+/context')], ['GET', new RegExp('^/session/[^/]+/element/[^/]+/rect')], ['GET', new RegExp('^/session/[^/]+/orientation')], ['POST', new RegExp('^/session/[^/]+/appium')], ['POST', new RegExp('^/session/[^/]+/context')], ['POST', new RegExp('^/session/[^/]+/orientation')], ['POST', new RegExp('^/session/[^/]+/touch/multi/perform')], ['POST', new RegExp('^/session/[^/]+/touch/perform')]];
const APK_EXTENSION = '.apk';
const APKS_EXTENSION = '.apks';
const MEMOIZED_FUNCTIONS = ['getStatusBarHeight', 'getDevicePixelRatio'];

class AndroidUiautomator2Driver extends _appiumBaseDriver.BaseDriver {
  constructor(opts = {}, shouldValidateCaps = true) {
    delete opts.shell;
    super(opts, shouldValidateCaps);
    this.locatorStrategies = ['xpath', 'id', 'class name', 'accessibility id', '-android uiautomator'];
    this.desiredCapConstraints = _desiredCaps.default;
    this.uiautomator2 = null;
    this.jwpProxyActive = false;
    this.defaultIME = null;
    this.jwpProxyAvoid = NO_PROXY;
    this.apkStrings = {};
    this.settings = new _appiumBaseDriver.DeviceSettings({
      ignoreUnimportantViews: false,
      allowInvisibleElements: false
    }, this.onSettingsUpdate.bind(this));
    this.chromedriver = null;
    this.sessionChromedrivers = {};

    for (const fn of MEMOIZED_FUNCTIONS) {
      this[fn] = _lodash.default.memoize(this[fn]);
    }
  }

  validateDesiredCaps(caps) {
    return super.validateDesiredCaps(caps) && _appiumAndroidDriver.androidHelpers.validateDesiredCaps(caps);
  }

  async createSession(...args) {
    try {
      let [sessionId, caps] = await super.createSession(...args);
      let serverDetails = {
        platform: 'LINUX',
        webStorageEnabled: false,
        takesScreenshot: true,
        javascriptEnabled: true,
        databaseEnabled: false,
        networkConnectionEnabled: true,
        locationContextEnabled: false,
        warnings: {},
        desired: this.caps
      };
      this.caps = Object.assign(serverDetails, this.caps);
      this.curContext = this.defaultContextName();
      let defaultOpts = {
        fullReset: false,
        autoLaunch: true,
        adbPort: _appiumAdb.DEFAULT_ADB_PORT,
        androidInstallTimeout: 90000
      };

      _lodash.default.defaults(this.opts, defaultOpts);

      if (this.isChromeSession) {
        _logger.default.info("We're going to run a Chrome-based session");

        let {
          pkg,
          activity
        } = helpers.getChromePkg(this.opts.browserName);
        this.opts.appPackage = this.caps.appPackage = pkg;
        this.opts.appActivity = this.caps.appActivity = activity;

        _logger.default.info(`Chrome-type package and activity are ${pkg} and ${activity}`);
      }

      if (this.opts.reboot) {
        this.setAvdFromCapabilities(caps);
      }

      if (this.opts.app) {
        this.opts.app = await this.helpers.configureApp(this.opts.app, [APK_EXTENSION, APKS_EXTENSION]);
        await this.checkAppPresent();
      } else if (this.opts.appPackage) {
        _logger.default.info(`Starting '${this.opts.appPackage}' directly on the device`);
      } else {
        _logger.default.info(`Neither 'app' nor 'appPackage' was set. Starting UiAutomator2 ` + 'without the target application');
      }

      this.opts.adbPort = this.opts.adbPort || _appiumAdb.DEFAULT_ADB_PORT;
      await this.startUiAutomator2Session();
      await this.fillDeviceDetails();

      if (this.opts.mjpegScreenshotUrl) {
        _logger.default.info(`Starting MJPEG stream reading URL: '${this.opts.mjpegScreenshotUrl}'`);

        this.mjpegStream = new _appiumSupport.mjpeg.MJpegStream(this.opts.mjpegScreenshotUrl);
        await this.mjpegStream.start();
      }

      return [sessionId, this.caps];
    } catch (e) {
      await this.deleteSession();
      throw e;
    }
  }

  async fillDeviceDetails() {
    this.caps.pixelRatio = await this.getDevicePixelRatio();
    this.caps.statBarHeight = await this.getStatusBarHeight();
    this.caps.viewportRect = await this.getViewPortRect();
  }

  get driverData() {
    return {};
  }

  async getSession() {
    let sessionData = await super.getSession();

    _logger.default.debug('Getting session details from server to mix in');

    let uia2Data = await this.uiautomator2.jwproxy.command('/', 'GET', {});
    return Object.assign({}, sessionData, uia2Data);
  }

  isEmulator() {
    return !!(this.opts.avd || /emulator/.test(this.opts.udid));
  }

  setAvdFromCapabilities(caps) {
    if (this.opts.avd) {
      _logger.default.info('avd name defined, ignoring device name and platform version');
    } else {
      if (!caps.deviceName) {
        _logger.default.errorAndThrow('avd or deviceName should be specified when reboot option is enables');
      }

      if (!caps.platformVersion) {
        _logger.default.errorAndThrow('avd or platformVersion should be specified when reboot option is enabled');
      }

      let avdDevice = caps.deviceName.replace(/[^a-zA-Z0-9_.]/g, '-');
      this.opts.avd = `${avdDevice}__${caps.platformVersion}`;
    }
  }

  async allocateSystemPort() {
    await PORT_ALLOCATION_GUARD.acquire(AndroidUiautomator2Driver.name, async () => {
      try {
        this.opts.systemPort = this.opts.systemPort || (await (0, _portscanner.findAPortNotInUse)(SYSTEM_PORT_RANGE[0], SYSTEM_PORT_RANGE[1]));
      } catch (e) {
        _logger.default.errorAndThrow(`Cannot find any free port in range ${_lodash.default.first(SYSTEM_PORT_RANGE)}..${_lodash.default.last(SYSTEM_PORT_RANGE)}}. ` + `Please set the available port number by providing the systemPort capability or ` + `double check the processes that are locking ports within this range and terminate ` + `these which are not needed anymore`);
      }

      _logger.default.debug(`Forwarding UiAutomator2 Server port ${DEVICE_PORT} to ${this.opts.systemPort}`);

      await this.adb.forwardPort(this.opts.systemPort, DEVICE_PORT);
    });
  }

  async releaseSystemPort() {
    if (!this.opts.systemPort) {
      return;
    }

    await PORT_ALLOCATION_GUARD.acquire(AndroidUiautomator2Driver.name, async () => await this.adb.removePortForward(this.opts.systemPort));
  }

  async startUiAutomator2Session() {
    let {
      udid,
      emPort
    } = await helpers.getDeviceInfoFromCaps(this.opts);
    this.opts.udid = udid;
    this.opts.emPort = emPort;
    this.adb = await _appiumAndroidDriver.androidHelpers.createADB(this.opts);
    const apiLevel = await this.adb.getApiLevel();

    if (apiLevel < 21) {
      _logger.default.errorAndThrow('UIAutomator2 is only supported since Android 5.0 (Lollipop). ' + 'You could still use other supported backends in order to automate older Android versions.');
    }

    if (apiLevel >= 28) {
      _logger.default.warn('Relaxing hidden api policy');

      await this.adb.setHiddenApiPolicy('1');
    }

    if (_appiumSupport.util.hasValue(this.opts.gpsEnabled)) {
      if (this.isEmulator()) {
        _logger.default.info(`Trying to ${this.opts.gpsEnabled ? 'enable' : 'disable'} gps location provider`);

        await this.adb.toggleGPSLocationProvider(this.opts.gpsEnabled);
      } else {
        _logger.default.warn(`Sorry! 'gpsEnabled' capability is only available for emulators`);
      }
    }

    const appInfo = await helpers.getLaunchInfo(this.adb, this.opts);
    Object.assign(this.opts, appInfo || {});
    this.caps.deviceName = this.adb.curDeviceId;
    this.caps.deviceUDID = this.opts.udid;
    this.defaultIME = await helpers.initDevice(this.adb, this.opts);
    await this.allocateSystemPort();
    await this.initUiAutomator2Server();

    if (this.opts.disableWindowAnimation && (await this.adb.getApiLevel()) < 26) {
      if (await this.adb.isAnimationOn()) {
        _logger.default.info('Disabling animation via io.appium.settings');

        await this.adb.setAnimationState(false);
        this._wasWindowAnimationDisabled = true;
      } else {
        _logger.default.info('Window animation is already disabled');
      }
    }

    if (this.opts.autoLaunch) {
      await this.initAUT();
    }

    if (!this.caps.appPackage && appInfo) {
      this.caps.appPackage = appInfo.appPackage;
    }

    await this.uiautomator2.startSession(this.caps);
    await this.addDeviceInfoToCaps();

    if (!this.opts.skipUnlock) {
      await helpers.unlock(this, this.adb, this.caps);
    } else {
      _logger.default.debug(`'skipUnlock' capability set, so skipping device unlock`);
    }

    if (this.isChromeSession) {
      await this.startChromeSession(this);
    } else if (this.opts.autoLaunch && this.opts.appPackage) {
      await this.ensureAppStarts();
    }

    if (_appiumSupport.util.hasValue(this.opts.orientation)) {
      _logger.default.debug(`Setting initial orientation to '${this.opts.orientation}'`);

      await this.setOrientation(this.opts.orientation);
    }

    if (this.opts.autoWebview) {
      const viewName = this.defaultWebviewName();
      const timeout = this.opts.autoWebviewTimeout || 2000;

      _logger.default.info(`Setting auto webview to context '${viewName}' with timeout ${timeout}ms`);

      await (0, _asyncbox.retryInterval)(timeout / 500, 500, this.setContext.bind(this), viewName);
    }

    this.jwpProxyActive = true;
  }

  async addDeviceInfoToCaps() {
    const {
      apiVersion,
      platformVersion,
      manufacturer,
      model,
      realDisplaySize,
      displayDensity
    } = await this.mobileGetDeviceInfo();
    this.caps.deviceApiLevel = parseInt(apiVersion, 10);
    this.caps.platformVersion = platformVersion;
    this.caps.deviceScreenSize = realDisplaySize;
    this.caps.deviceScreenDensity = displayDensity;
    this.caps.deviceModel = model;
    this.caps.deviceManufacturer = manufacturer;
  }

  async initUiAutomator2Server() {
    this.uiautomator2 = new _uiautomator.UiAutomator2Server({
      host: this.opts.remoteAdbHost || this.opts.host || '127.0.0.1',
      systemPort: this.opts.systemPort,
      devicePort: DEVICE_PORT,
      adb: this.adb,
      apk: this.opts.app,
      tmpDir: this.opts.tmpDir,
      appPackage: this.opts.appPackage,
      appActivity: this.opts.appActivity,
      disableWindowAnimation: !!this.opts.disableWindowAnimation
    });
    this.proxyReqRes = this.uiautomator2.proxyReqRes.bind(this.uiautomator2);

    if (this.opts.skipServerInstallation) {
      _logger.default.info(`'skipServerInstallation' is set. Skipping UIAutomator2 server installation.`);
    } else {
      await this.uiautomator2.installServerApk(this.opts.uiautomator2ServerInstallTimeout);
    }
  }

  async initAUT() {
    if (this.opts.uninstallOtherPackages) {
      await helpers.uninstallOtherPackages(this.adb, helpers.parseArray(this.opts.uninstallOtherPackages), [_appiumAndroidDriver.SETTINGS_HELPER_PKG_ID, _uiautomator.SERVER_PACKAGE_ID, _uiautomator.SERVER_TEST_PACKAGE_ID]);
    }

    if (this.opts.otherApps) {
      let otherApps;

      try {
        otherApps = helpers.parseArray(this.opts.otherApps);
      } catch (e) {
        _logger.default.errorAndThrow(`Could not parse "otherApps" capability: ${e.message}`);
      }

      otherApps = await _bluebird.default.all(otherApps.map(app => this.helpers.configureApp(app, [APK_EXTENSION, APKS_EXTENSION])));
      await helpers.installOtherApks(otherApps, this.adb, this.opts);
    }

    if (this.opts.app) {
      if (!this.opts.noSign && !(await this.adb.checkApkCert(this.opts.app, this.opts.appPackage))) {
        await helpers.signApp(this.adb, this.opts.app);
      }

      if (!this.opts.skipUninstall) {
        await this.adb.uninstallApk(this.opts.appPackage);
      }

      await helpers.installApk(this.adb, this.opts);
    } else {
      if (this.opts.fullReset) {
        _logger.default.errorAndThrow('Full reset requires an app capability, use fastReset if app is not provided');
      }

      _logger.default.debug('No app capability. Assuming it is already on the device');

      if (this.opts.fastReset && this.opts.appPackage) {
        await helpers.resetApp(this.adb, this.opts);
      }
    }
  }

  async ensureAppStarts() {
    const appWaitPackage = this.opts.appWaitPackage || this.opts.appPackage;
    const appWaitActivity = this.opts.appWaitActivity || this.opts.appActivity;

    _logger.default.info(`Starting '${this.opts.appPackage}/${this.opts.appActivity} ` + `and waiting for '${appWaitPackage}/${appWaitActivity}'`);

    if (this.caps.androidCoverage) {
      _logger.default.info(`androidCoverage is configured. ` + ` Starting instrumentation of '${this.caps.androidCoverage}'...`);

      await this.adb.androidCoverage(this.caps.androidCoverage, appWaitPackage, appWaitActivity);
    } else {
      await this.adb.startApp({
        pkg: this.opts.appPackage,
        activity: this.opts.appActivity,
        action: this.opts.intentAction,
        category: this.opts.intentCategory,
        flags: this.opts.intentFlags,
        waitPkg: this.opts.appWaitPackage,
        waitActivity: this.opts.appWaitActivity,
        waitForLaunch: this.opts.appWaitForLaunch,
        optionalIntentArguments: this.opts.optionalIntentArguments,
        stopApp: !this.opts.dontStopAppOnReset,
        retry: true
      });
    }
  }

  async deleteSession() {
    _logger.default.debug('Deleting UiAutomator2 session');

    await _appiumAndroidDriver.androidHelpers.removeAllSessionWebSocketHandlers(this.server, this.sessionId);

    if (this.uiautomator2) {
      try {
        await this.stopChromedriverProxies();
      } catch (err) {
        _logger.default.warn(`Unable to stop ChromeDriver proxies: ${err.message}`);
      }

      if (this.jwpProxyActive) {
        try {
          await this.uiautomator2.deleteSession();
        } catch (err) {
          _logger.default.warn(`Unable to proxy deleteSession to UiAutomator2: ${err.message}`);
        }
      }

      this.uiautomator2 = null;
    }

    this.jwpProxyActive = false;

    if (this.adb) {
      if (this.opts.unicodeKeyboard && this.opts.resetKeyboard && this.defaultIME) {
        _logger.default.debug(`Resetting IME to '${this.defaultIME}'`);

        try {
          await this.adb.setIME(this.defaultIME);
        } catch (err) {
          _logger.default.warn(`Unable to reset IME: ${err.message}`);
        }
      }

      if (this.caps.androidCoverage) {
        _logger.default.info('Shutting down the adb process of instrumentation...');

        await this.adb.endAndroidCoverage();

        if (this.caps.androidCoverageEndIntent) {
          _logger.default.info(`Sending intent broadcast '${this.caps.androidCoverageEndIntent}' at the end of instrumenting.`);

          await this.adb.broadcast(this.caps.androidCoverageEndIntent);
        } else {
          _logger.default.warn('No androidCoverageEndIntent is configured in caps. Possibly you cannot get coverage file.');
        }
      }

      if (this.opts.appPackage) {
        if (!this.isChromeSession && !this.opts.dontStopAppOnReset) {
          try {
            await this.adb.forceStop(this.opts.appPackage);
          } catch (err) {
            _logger.default.warn(`Unable to force stop app: ${err.message}`);
          }
        }

        if (this.opts.fullReset && !this.opts.skipUninstall) {
          _logger.default.debug(`Capability 'fullReset' set to 'true', Uninstalling '${this.opts.appPackage}'`);

          try {
            await this.adb.uninstallApk(this.opts.appPackage);
          } catch (err) {
            _logger.default.warn(`Unable to uninstall app: ${err.message}`);
          }
        }
      }

      if (this._wasWindowAnimationDisabled) {
        _logger.default.info('Restoring window animation state');

        await this.adb.setAnimationState(true);
      }

      await this.adb.stopLogcat();

      try {
        await this.releaseSystemPort();
      } catch (error) {
        _logger.default.warn(`Unable to remove port forward: ${error.message}`);
      }

      if ((await this.adb.getApiLevel()) >= 28) {
        _logger.default.info('Restoring hidden api policy to the device default configuration');

        await this.adb.setDefaultHiddenApiPolicy();
      }

      if (this.opts.reboot) {
        let avdName = this.opts.avd.replace('@', '');

        _logger.default.debug(`Closing emulator '${avdName}'`);

        try {
          await this.adb.killEmulator(avdName);
        } catch (err) {
          _logger.default.warn(`Unable to close emulator: ${err.message}`);
        }
      }
    }

    if (this.mjpegStream) {
      _logger.default.info('Closing MJPEG stream');

      this.mjpegStream.stop();
    }

    await super.deleteSession();
  }

  async checkAppPresent() {
    _logger.default.debug('Checking whether app is actually present');

    if (!(await _appiumSupport.fs.exists(this.opts.app))) {
      _logger.default.errorAndThrow(`Could not find app apk at '${this.opts.app}'`);
    }
  }

  async onSettingsUpdate() {}

  async wrapBootstrapDisconnect(wrapped) {
    await wrapped();
    await this.adb.restart();
    await this.allocateSystemPort();
  }

  proxyActive(sessionId) {
    super.proxyActive(sessionId);
    return true;
  }

  canProxy(sessionId) {
    super.canProxy(sessionId);
    return true;
  }

  getProxyAvoidList(sessionId) {
    super.getProxyAvoidList(sessionId);

    if (_appiumSupport.util.hasValue(this.chromedriver)) {
      this.jwpProxyAvoid = CHROME_NO_PROXY;
    } else {
      this.jwpProxyAvoid = NO_PROXY;
    }

    if (this.opts.nativeWebScreenshot) {
      this.jwpProxyAvoid = [...this.jwpProxyAvoid, ['GET', new RegExp('^/session/[^/]+/screenshot')]];
    }

    return this.jwpProxyAvoid;
  }

  get isChromeSession() {
    return helpers.isChromeBrowser(this.opts.browserName);
  }

}

exports.AndroidUiautomator2Driver = AndroidUiautomator2Driver;

for (let [cmd, fn] of _lodash.default.toPairs(_appiumAndroidDriver.androidCommands)) {
  AndroidUiautomator2Driver.prototype[cmd] = fn;
}

for (let [cmd, fn] of _lodash.default.toPairs(_index.default)) {
  AndroidUiautomator2Driver.prototype[cmd] = fn;
}

var _default = AndroidUiautomator2Driver;
exports.default = _default;require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9kcml2ZXIuanMiXSwibmFtZXMiOlsiaGVscGVycyIsIk9iamVjdCIsImFzc2lnbiIsInVpYXV0b21hdG9yMkhlbHBlcnMiLCJhbmRyb2lkSGVscGVycyIsIlNZU1RFTV9QT1JUX1JBTkdFIiwiUE9SVF9BTExPQ0FUSU9OX0dVQVJEIiwiQXN5bmNMb2NrIiwiREVWSUNFX1BPUlQiLCJOT19QUk9YWSIsIlJlZ0V4cCIsIkNIUk9NRV9OT19QUk9YWSIsIkFQS19FWFRFTlNJT04iLCJBUEtTX0VYVEVOU0lPTiIsIk1FTU9JWkVEX0ZVTkNUSU9OUyIsIkFuZHJvaWRVaWF1dG9tYXRvcjJEcml2ZXIiLCJCYXNlRHJpdmVyIiwiY29uc3RydWN0b3IiLCJvcHRzIiwic2hvdWxkVmFsaWRhdGVDYXBzIiwic2hlbGwiLCJsb2NhdG9yU3RyYXRlZ2llcyIsImRlc2lyZWRDYXBDb25zdHJhaW50cyIsInVpYXV0b21hdG9yMiIsImp3cFByb3h5QWN0aXZlIiwiZGVmYXVsdElNRSIsImp3cFByb3h5QXZvaWQiLCJhcGtTdHJpbmdzIiwic2V0dGluZ3MiLCJEZXZpY2VTZXR0aW5ncyIsImlnbm9yZVVuaW1wb3J0YW50Vmlld3MiLCJhbGxvd0ludmlzaWJsZUVsZW1lbnRzIiwib25TZXR0aW5nc1VwZGF0ZSIsImJpbmQiLCJjaHJvbWVkcml2ZXIiLCJzZXNzaW9uQ2hyb21lZHJpdmVycyIsImZuIiwiXyIsIm1lbW9pemUiLCJ2YWxpZGF0ZURlc2lyZWRDYXBzIiwiY2FwcyIsImNyZWF0ZVNlc3Npb24iLCJhcmdzIiwic2Vzc2lvbklkIiwic2VydmVyRGV0YWlscyIsInBsYXRmb3JtIiwid2ViU3RvcmFnZUVuYWJsZWQiLCJ0YWtlc1NjcmVlbnNob3QiLCJqYXZhc2NyaXB0RW5hYmxlZCIsImRhdGFiYXNlRW5hYmxlZCIsIm5ldHdvcmtDb25uZWN0aW9uRW5hYmxlZCIsImxvY2F0aW9uQ29udGV4dEVuYWJsZWQiLCJ3YXJuaW5ncyIsImRlc2lyZWQiLCJjdXJDb250ZXh0IiwiZGVmYXVsdENvbnRleHROYW1lIiwiZGVmYXVsdE9wdHMiLCJmdWxsUmVzZXQiLCJhdXRvTGF1bmNoIiwiYWRiUG9ydCIsIkRFRkFVTFRfQURCX1BPUlQiLCJhbmRyb2lkSW5zdGFsbFRpbWVvdXQiLCJkZWZhdWx0cyIsImlzQ2hyb21lU2Vzc2lvbiIsImxvZ2dlciIsImluZm8iLCJwa2ciLCJhY3Rpdml0eSIsImdldENocm9tZVBrZyIsImJyb3dzZXJOYW1lIiwiYXBwUGFja2FnZSIsImFwcEFjdGl2aXR5IiwicmVib290Iiwic2V0QXZkRnJvbUNhcGFiaWxpdGllcyIsImFwcCIsImNvbmZpZ3VyZUFwcCIsImNoZWNrQXBwUHJlc2VudCIsInN0YXJ0VWlBdXRvbWF0b3IyU2Vzc2lvbiIsImZpbGxEZXZpY2VEZXRhaWxzIiwibWpwZWdTY3JlZW5zaG90VXJsIiwibWpwZWdTdHJlYW0iLCJtanBlZyIsIk1KcGVnU3RyZWFtIiwic3RhcnQiLCJlIiwiZGVsZXRlU2Vzc2lvbiIsInBpeGVsUmF0aW8iLCJnZXREZXZpY2VQaXhlbFJhdGlvIiwic3RhdEJhckhlaWdodCIsImdldFN0YXR1c0JhckhlaWdodCIsInZpZXdwb3J0UmVjdCIsImdldFZpZXdQb3J0UmVjdCIsImRyaXZlckRhdGEiLCJnZXRTZXNzaW9uIiwic2Vzc2lvbkRhdGEiLCJkZWJ1ZyIsInVpYTJEYXRhIiwiandwcm94eSIsImNvbW1hbmQiLCJpc0VtdWxhdG9yIiwiYXZkIiwidGVzdCIsInVkaWQiLCJkZXZpY2VOYW1lIiwiZXJyb3JBbmRUaHJvdyIsInBsYXRmb3JtVmVyc2lvbiIsImF2ZERldmljZSIsInJlcGxhY2UiLCJhbGxvY2F0ZVN5c3RlbVBvcnQiLCJhY3F1aXJlIiwibmFtZSIsInN5c3RlbVBvcnQiLCJmaXJzdCIsImxhc3QiLCJhZGIiLCJmb3J3YXJkUG9ydCIsInJlbGVhc2VTeXN0ZW1Qb3J0IiwicmVtb3ZlUG9ydEZvcndhcmQiLCJlbVBvcnQiLCJnZXREZXZpY2VJbmZvRnJvbUNhcHMiLCJjcmVhdGVBREIiLCJhcGlMZXZlbCIsImdldEFwaUxldmVsIiwid2FybiIsInNldEhpZGRlbkFwaVBvbGljeSIsInV0aWwiLCJoYXNWYWx1ZSIsImdwc0VuYWJsZWQiLCJ0b2dnbGVHUFNMb2NhdGlvblByb3ZpZGVyIiwiYXBwSW5mbyIsImdldExhdW5jaEluZm8iLCJjdXJEZXZpY2VJZCIsImRldmljZVVESUQiLCJpbml0RGV2aWNlIiwiaW5pdFVpQXV0b21hdG9yMlNlcnZlciIsImRpc2FibGVXaW5kb3dBbmltYXRpb24iLCJpc0FuaW1hdGlvbk9uIiwic2V0QW5pbWF0aW9uU3RhdGUiLCJfd2FzV2luZG93QW5pbWF0aW9uRGlzYWJsZWQiLCJpbml0QVVUIiwic3RhcnRTZXNzaW9uIiwiYWRkRGV2aWNlSW5mb1RvQ2FwcyIsInNraXBVbmxvY2siLCJ1bmxvY2siLCJzdGFydENocm9tZVNlc3Npb24iLCJlbnN1cmVBcHBTdGFydHMiLCJvcmllbnRhdGlvbiIsInNldE9yaWVudGF0aW9uIiwiYXV0b1dlYnZpZXciLCJ2aWV3TmFtZSIsImRlZmF1bHRXZWJ2aWV3TmFtZSIsInRpbWVvdXQiLCJhdXRvV2Vidmlld1RpbWVvdXQiLCJzZXRDb250ZXh0IiwiYXBpVmVyc2lvbiIsIm1hbnVmYWN0dXJlciIsIm1vZGVsIiwicmVhbERpc3BsYXlTaXplIiwiZGlzcGxheURlbnNpdHkiLCJtb2JpbGVHZXREZXZpY2VJbmZvIiwiZGV2aWNlQXBpTGV2ZWwiLCJwYXJzZUludCIsImRldmljZVNjcmVlblNpemUiLCJkZXZpY2VTY3JlZW5EZW5zaXR5IiwiZGV2aWNlTW9kZWwiLCJkZXZpY2VNYW51ZmFjdHVyZXIiLCJVaUF1dG9tYXRvcjJTZXJ2ZXIiLCJob3N0IiwicmVtb3RlQWRiSG9zdCIsImRldmljZVBvcnQiLCJhcGsiLCJ0bXBEaXIiLCJwcm94eVJlcVJlcyIsInNraXBTZXJ2ZXJJbnN0YWxsYXRpb24iLCJpbnN0YWxsU2VydmVyQXBrIiwidWlhdXRvbWF0b3IyU2VydmVySW5zdGFsbFRpbWVvdXQiLCJ1bmluc3RhbGxPdGhlclBhY2thZ2VzIiwicGFyc2VBcnJheSIsIlNFVFRJTkdTX0hFTFBFUl9QS0dfSUQiLCJTRVJWRVJfUEFDS0FHRV9JRCIsIlNFUlZFUl9URVNUX1BBQ0tBR0VfSUQiLCJvdGhlckFwcHMiLCJtZXNzYWdlIiwiQiIsImFsbCIsIm1hcCIsImluc3RhbGxPdGhlckFwa3MiLCJub1NpZ24iLCJjaGVja0Fwa0NlcnQiLCJzaWduQXBwIiwic2tpcFVuaW5zdGFsbCIsInVuaW5zdGFsbEFwayIsImluc3RhbGxBcGsiLCJmYXN0UmVzZXQiLCJyZXNldEFwcCIsImFwcFdhaXRQYWNrYWdlIiwiYXBwV2FpdEFjdGl2aXR5IiwiYW5kcm9pZENvdmVyYWdlIiwic3RhcnRBcHAiLCJhY3Rpb24iLCJpbnRlbnRBY3Rpb24iLCJjYXRlZ29yeSIsImludGVudENhdGVnb3J5IiwiZmxhZ3MiLCJpbnRlbnRGbGFncyIsIndhaXRQa2ciLCJ3YWl0QWN0aXZpdHkiLCJ3YWl0Rm9yTGF1bmNoIiwiYXBwV2FpdEZvckxhdW5jaCIsIm9wdGlvbmFsSW50ZW50QXJndW1lbnRzIiwic3RvcEFwcCIsImRvbnRTdG9wQXBwT25SZXNldCIsInJldHJ5IiwicmVtb3ZlQWxsU2Vzc2lvbldlYlNvY2tldEhhbmRsZXJzIiwic2VydmVyIiwic3RvcENocm9tZWRyaXZlclByb3hpZXMiLCJlcnIiLCJ1bmljb2RlS2V5Ym9hcmQiLCJyZXNldEtleWJvYXJkIiwic2V0SU1FIiwiZW5kQW5kcm9pZENvdmVyYWdlIiwiYW5kcm9pZENvdmVyYWdlRW5kSW50ZW50IiwiYnJvYWRjYXN0IiwiZm9yY2VTdG9wIiwic3RvcExvZ2NhdCIsImVycm9yIiwic2V0RGVmYXVsdEhpZGRlbkFwaVBvbGljeSIsImF2ZE5hbWUiLCJraWxsRW11bGF0b3IiLCJzdG9wIiwiZnMiLCJleGlzdHMiLCJ3cmFwQm9vdHN0cmFwRGlzY29ubmVjdCIsIndyYXBwZWQiLCJyZXN0YXJ0IiwicHJveHlBY3RpdmUiLCJjYW5Qcm94eSIsImdldFByb3h5QXZvaWRMaXN0IiwibmF0aXZlV2ViU2NyZWVuc2hvdCIsImlzQ2hyb21lQnJvd3NlciIsImNtZCIsInRvUGFpcnMiLCJhbmRyb2lkQ29tbWFuZHMiLCJwcm90b3R5cGUiLCJjb21tYW5kcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFHQSxNQUFNQSxPQUFPLEdBQUdDLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjLEVBQWQsRUFBa0JDLGdCQUFsQixFQUF1Q0MsbUNBQXZDLENBQWhCO0FBSUEsTUFBTUMsaUJBQWlCLEdBQUcsQ0FBQyxJQUFELEVBQU8sSUFBUCxDQUExQjtBQUdBLE1BQU1DLHFCQUFxQixHQUFHLElBQUlDLGtCQUFKLEVBQTlCO0FBSUEsTUFBTUMsV0FBVyxHQUFHLElBQXBCO0FBTUEsTUFBTUMsUUFBUSxHQUFHLENBQ2YsQ0FBQyxLQUFELEVBQVEsSUFBSUMsTUFBSixDQUFXLG1CQUFYLENBQVIsQ0FEZSxFQUVmLENBQUMsS0FBRCxFQUFRLElBQUlBLE1BQUosQ0FBVyw2QkFBWCxDQUFSLENBRmUsRUFHZixDQUFDLEtBQUQsRUFBUSxJQUFJQSxNQUFKLENBQVcsNkJBQVgsQ0FBUixDQUhlLEVBSWYsQ0FBQyxLQUFELEVBQVEsSUFBSUEsTUFBSixDQUFXLCtDQUFYLENBQVIsQ0FKZSxFQUtmLENBQUMsS0FBRCxFQUFRLElBQUlBLE1BQUosQ0FBVyw4Q0FBWCxDQUFSLENBTGUsRUFNZixDQUFDLEtBQUQsRUFBUSxJQUFJQSxNQUFKLENBQVcsa0NBQVgsQ0FBUixDQU5lLEVBT2YsQ0FBQyxLQUFELEVBQVEsSUFBSUEsTUFBSixDQUFXLHFDQUFYLENBQVIsQ0FQZSxFQVFmLENBQUMsS0FBRCxFQUFRLElBQUlBLE1BQUosQ0FBVyxpQ0FBWCxDQUFSLENBUmUsRUFTZixDQUFDLEtBQUQsRUFBUSxJQUFJQSxNQUFKLENBQVcseUJBQVgsQ0FBUixDQVRlLEVBVWYsQ0FBQyxLQUFELEVBQVEs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TSxTQUFGLEVBQWE7QUFDNUIsVUFBTWtNLGlCQUFOLENBQXdCbE0sU0FBeEI7O0FBR0EsUUFBSWtGLG9CQUFLQyxRQUFMLENBQWMsS0FBSzVGLFlBQW5CLENBQUosRUFBc0M7QUFFcEMsV0FBS1IsYUFBTCxHQUFxQmYsZUFBckI7QUFDRCxLQUhELE1BR087QUFDTCxXQUFLZSxhQUFMLEdBQXFCakIsUUFBckI7QUFDRDs7QUFDRCxRQUFJLEtBQUtTLElBQUwsQ0FBVTROLG1CQUFkLEVBQW1DO0FBQ2pDLFdBQUtwTixhQUFMLEdBQXFCLENBQUMsR0FBRyxLQUFLQSxhQUFULEVBQXdCLENBQUMsS0FBRCxFQUFRLElBQUloQixNQUFKLENBQVcsNEJBQVgsQ0FBUixDQUF4QixDQUFyQjtBQUNEOztBQUVELFdBQU8sS0FBS2dCLGFBQVo7QUFDRDs7QUFFRCxNQUFJcUMsZUFBSixHQUF1QjtBQUNyQixXQUFPL0QsT0FBTyxDQUFDK08sZUFBUixDQUF3QixLQUFLN04sSUFBTCxDQUFVbUQsV0FBbEMsQ0FBUDtBQUNEOztBQTloQmdEOzs7O0FBa2lCbkQsS0FBSyxJQUFJLENBQUMySyxHQUFELEVBQU01TSxFQUFOLENBQVQsSUFBc0JDLGdCQUFFNE0sT0FBRixDQUFVQyxvQ0FBVixDQUF0QixFQUFrRDtBQUNoRG5PLEVBQUFBLHlCQUF5QixDQUFDb08sU0FBMUIsQ0FBb0NILEdBQXBDLElBQTJDNU0sRUFBM0M7QUFDRDs7QUFHRCxLQUFLLElBQUksQ0FBQzRNLEdBQUQsRUFBTTVNLEVBQU4sQ0FBVCxJQUFzQkMsZ0JBQUU0TSxPQUFGLENBQVVHLGNBQVYsQ0FBdEIsRUFBMkM7QUFDekNyTyxFQUFBQSx5QkFBeUIsQ0FBQ29PLFNBQTFCLENBQW9DSCxHQUFwQyxJQUEyQzVNLEVBQTNDO0FBQ0Q7O2VBR2NyQix5QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgeyBCYXNlRHJpdmVyLCBEZXZpY2VTZXR0aW5ncyB9IGZyb20gJ2FwcGl1bS1iYXNlLWRyaXZlcic7XG5pbXBvcnQgeyBVaUF1dG9tYXRvcjJTZXJ2ZXIsIFNFUlZFUl9QQUNLQUdFX0lELCBTRVJWRVJfVEVTVF9QQUNLQUdFX0lEIH0gZnJvbSAnLi91aWF1dG9tYXRvcjInO1xuaW1wb3J0IHsgZnMsIHV0aWwsIG1qcGVnIH0gZnJvbSAnYXBwaXVtLXN1cHBvcnQnO1xuaW1wb3J0IHsgcmV0cnlJbnRlcnZhbCB9IGZyb20gJ2FzeW5jYm94JztcbmltcG9ydCBCIGZyb20gJ2JsdWViaXJkJztcbmltcG9ydCBsb2dnZXIgZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IGNvbW1hbmRzIGZyb20gJy4vY29tbWFuZHMvaW5kZXgnO1xuaW1wb3J0IHsgREVGQVVMVF9BREJfUE9SVCB9IGZyb20gJ2FwcGl1bS1hZGInO1xuaW1wb3J0IHVpYXV0b21hdG9yMkhlbHBlcnMgZnJvbSAnLi9oZWxwZXJzJztcbmltcG9ydCB7IGFuZHJvaWRIZWxwZXJzLCBhbmRyb2lkQ29tbWFuZHMsIFNFVFRJTkdTX0hFTFBFUl9QS0dfSUQgfSBmcm9tICdhcHBpdW0tYW5kcm9pZC1kcml2ZXInO1xuaW1wb3J0IGRlc2lyZWRDYXBDb25zdHJhaW50cyBmcm9tICcuL2Rlc2lyZWQtY2Fwcyc7XG5pbXBvcnQgeyBmaW5kQVBvcnROb3RJblVzZSB9IGZyb20gJ3BvcnRzY2FubmVyJztcbmltcG9ydCBBc3luY0xvY2sgZnJvbSAnYXN5bmMtbG9jayc7XG5cblxuY29uc3QgaGVscGVycyA9IE9iamVjdC5hc3NpZ24oe30sIHVpYXV0b21hdG9yMkhlbHBlcnMsIGFuZHJvaWRIZWxwZXJzKTtcblxuLy8gVGhlIHJhbmdlIG9mIHBvcnRzIHdlIGNhbiB1c2Ugb24gdGhlIHN5c3RlbSBmb3IgY29tbXVuaWNhdGluZyB0byB0aGVcbi8vIFVpQXV0b21hdG9yMiBIVFRQIHNlcnZlciBvbiB0aGUgZGV2aWNlXG5jb25zdCBTWVNURU1fUE9SVF9SQU5HRSA9IFs4MjAwLCA4Mjk5XTtcbi8vIFRoZSBndWFyZCBpcyBuZWVkZWQgdG8gYXZvaWQgZHluYW1pYyBwb3J0IGFsbG9jYXRpb24gY29uZmxpY3RzXG4vLyBmb3IgcGFyYWxsZWwgZHJpdmVyIHNlc3Npb25zXG5jb25zdCBQT1JUX0FMTE9DQVRJT05fR1VBUkQgPSBuZXcgQXN5bmNMb2NrKCk7XG5cbi8vIFRoaXMgaXMgdGhlIHBvcnQgdGhhdCBVaUF1dG9tYXRvcjIgbGlzdGVucyB0byBvbiB0aGUgZGV2aWNlLiBXZSB3aWxsIGZvcndhcmRcbi8vIG9uZSBvZiB0aGUgcG9ydHMgYWJvdmUgb24gdGhlIHN5c3RlbSB0byB0aGlzIHBvcnQgb24gdGhlIGRldmljZS5cbmNvbnN0IERFVklDRV9QT1JUID0gNjc5MDtcblxuLy8gTk9fUFJPWFkgY29udGFpbnMgdGhlIHBhdGhzIHRoYXQgd2UgbmV2ZXIgd2FudCB0byBwcm94eSB0byBVaUF1dG9tYXRvcjIgc2VydmVyLlxuLy8gVE9ETzogIEFkZCB0aGUgbGlzdCBvZiBwYXRocyB0aGF0IHdlIG5ldmVyIHdhbnQgdG8gcHJveHkgdG8gVWlBdXRvbWF0b3IyIHNlcnZlci5cbi8vIFRPRE86IE5lZWQgdG8gc2VncmVnYXRlIHRoZSBwYXRocyBiZXR0ZXIgd2F5IHVzaW5nIHJlZ3VsYXIgZXhwcmVzc2lvbnMgd2hlcmV2ZXIgYXBwbGljYWJsZS5cbi8vIChOb3Qgc2VncmVnYXRpbmcgcmlnaHQgYXdheSBiZWNhdXNlIG1vcmUgcGF0aHMgdG8gYmUgYWRkZWQgaW4gdGhlIE5PX1BST1hZIGxpc3QpXG5jb25zdCBOT19QUk9YWSA9IFtcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vKD8hLiovKScpXSxcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYWxlcnRfW14vXSsnKV0sXG4gIFsnR0VUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2FsZXJ0L1teL10rJyldLFxuICBbJ0dFVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9hcHBpdW0vW14vXSsvY3VycmVudF9hY3Rpdml0eScpXSxcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL1teL10rL2N1cnJlbnRfcGFja2FnZScpXSxcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL2FwcC9bXi9dKycpXSxcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL2RldmljZS9bXi9dKycpXSxcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL3NldHRpbmdzJyldLFxuICBbJ0dFVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9jb250ZXh0JyldLFxuICBbJ0dFVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9jb250ZXh0cycpXSxcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvZWxlbWVudC9bXi9dKy9hdHRyaWJ1dGUnKV0sXG4gIFsnR0VUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2VsZW1lbnQvW14vXSsvZGlzcGxheWVkJyldLFxuICBbJ0dFVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9lbGVtZW50L1teL10rL2VuYWJsZWQnKV0sXG4gIFsnR0VUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2VsZW1lbnQvW14vXSsvbG9jYXRpb25faW5fdmlldycpXSxcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvZWxlbWVudC9bXi9dKy9uYW1lJyldLFxuICBbJ0dFVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9lbGVtZW50L1teL10rL3NjcmVlbnNob3QnKV0sXG4gIFsnR0VUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2VsZW1lbnQvW14vXSsvc2VsZWN0ZWQnKV0sXG4gIFsnR0VUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2ltZS9bXi9dKycpXSxcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvbG9jYXRpb24nKV0sXG4gIFsnR0VUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2xvZy90eXBlcycpXSxcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvbmV0d29ya19jb25uZWN0aW9uJyldLFxuICBbJ0dFVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9zY3JlZW5zaG90JyldLFxuICBbJ0dFVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy90aW1lb3V0cycpXSxcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvdXJsJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvW14vXStfYWxlcnQkJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYWN0aW9ucycpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2FsZXJ0L1teL10rJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwL1teL10nKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9hcHBpdW0vW14vXSsvc3RhcnRfYWN0aXZpdHknKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9hcHBpdW0vYXBwL1teL10rJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL2NvbXBhcmVfaW1hZ2VzJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL2RldmljZS8oPyFzZXRfY2xpcGJvYXJkKVteL10rJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL2VsZW1lbnQvW14vXSsvcmVwbGFjZV92YWx1ZScpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2FwcGl1bS9lbGVtZW50L1teL10rL3ZhbHVlJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL2dldFBlcmZvcm1hbmNlRGF0YScpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2FwcGl1bS9wZXJmb3JtYW5jZURhdGEvdHlwZXMnKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9hcHBpdW0vc2V0dGluZ3MnKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9hcHBpdW0vZXhlY3V0ZV9kcml2ZXInKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9hcHBpdW0vc3RhcnRfcmVjb3JkaW5nX3NjcmVlbicpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2FwcGl1bS9zdG9wX3JlY29yZGluZ19zY3JlZW4nKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9hcHBpdW0vLipldmVudCcpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2NvbnRleHQnKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9lbGVtZW50JyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvaW1lL1teL10rJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsva2V5cycpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2xvY2F0aW9uJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvbG9nJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvbmV0d29ya19jb25uZWN0aW9uJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvdGltZW91dHMnKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy90b3VjaC9tdWx0aS9wZXJmb3JtJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvdG91Y2gvcGVyZm9ybScpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL3VybCcpXSxcblxuICAvLyBNSlNPTldQIGNvbW1hbmRzXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9leGVjdXRlJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvZXhlY3V0ZV9hc3luYycpXSxcbiAgLy8gVzNDIGNvbW1hbmRzXG4gIFsnR0VUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL3dpbmRvdy9yZWN0JyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvZXhlY3V0ZS9hc3luYycpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2V4ZWN1dGUvc3luYycpXSxcbl07XG5cbi8vIFRoaXMgaXMgYSBzZXQgb2YgbWV0aG9kcyBhbmQgcGF0aHMgdGhhdCB3ZSBuZXZlciB3YW50IHRvIHByb3h5IHRvIENocm9tZWRyaXZlci5cbmNvbnN0IENIUk9NRV9OT19QUk9YWSA9IFtcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtJyldLFxuICBbJ0dFVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9jb250ZXh0JyldLFxuICBbJ0dFVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9lbGVtZW50L1teL10rL3JlY3QnKV0sXG4gIFsnR0VUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL29yaWVudGF0aW9uJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvY29udGV4dCcpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL29yaWVudGF0aW9uJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvdG91Y2gvbXVsdGkvcGVyZm9ybScpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL3RvdWNoL3BlcmZvcm0nKV0sXG5dO1xuY29uc3QgQVBLX0VYVEVOU0lPTiA9ICcuYXBrJztcbmNvbnN0IEFQS1NfRVhURU5TSU9OID0gJy5hcGtzJztcblxuY29uc3QgTUVNT0laRURfRlVOQ1RJT05TID0gW1xuICAnZ2V0U3RhdHVzQmFySGVpZ2h0JyxcbiAgJ2dldERldmljZVBpeGVsUmF0aW8nLFxuXTtcblxuY2xhc3MgQW5kcm9pZFVpYXV0b21hdG9yMkRyaXZlciBleHRlbmRzIEJhc2VEcml2ZXIge1xuICBjb25zdHJ1Y3RvciAob3B0cyA9IHt9LCBzaG91bGRWYWxpZGF0ZUNhcHMgPSB0cnVlKSB7XG4gICAgLy8gYHNoZWxsYCBvdmVyd3JpdGVzIGFkYi5zaGVsbCwgc28gcmVtb3ZlXG4gICAgZGVsZXRlIG9wdHMuc2hlbGw7XG5cbiAgICBzdXBlcihvcHRzLCBzaG91bGRWYWxpZGF0ZUNhcHMpO1xuICAgIHRoaXMubG9jYXRvclN0cmF0ZWdpZXMgPSBbXG4gICAgICAneHBhdGgnLFxuICAgICAgJ2lkJyxcbiAgICAgICdjbGFzcyBuYW1lJyxcbiAgICAgICdhY2Nlc3NpYmlsaXR5IGlkJyxcbiAgICAgICctYW5kcm9pZCB1aWF1dG9tYXRvcidcbiAgICBdO1xuICAgIHRoaXMuZGVzaXJlZENhcENvbnN0cmFpbnRzID0gZGVzaXJlZENhcENvbnN0cmFpbnRzO1xuICAgIHRoaXMudWlhdXRvbWF0b3IyID0gbnVsbDtcbiAgICB0aGlzLmp3cFByb3h5QWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5kZWZhdWx0SU1FID0gbnVsbDtcbiAgICB0aGlzLmp3cFByb3h5QXZvaWQgPSBOT19QUk9YWTtcbiAgICB0aGlzLmFwa1N0cmluZ3MgPSB7fTsgLy8gbWFwIG9mIGxhbmd1YWdlIC0+IHN0cmluZ3Mgb2JqXG5cbiAgICB0aGlzLnNldHRpbmdzID0gbmV3IERldmljZVNldHRpbmdzKHtpZ25vcmVVbmltcG9ydGFudFZpZXdzOiBmYWxzZSwgYWxsb3dJbnZpc2libGVFbGVtZW50czogZmFsc2V9LFxuICAgICAgICB0aGlzLm9uU2V0dGluZ3NVcGRhdGUuYmluZCh0aGlzKSk7XG4gICAgLy8gaGFuZGxlIHdlYnZpZXcgbWVjaGFuaWNzIGZyb20gQW5kcm9pZERyaXZlclxuICAgIHRoaXMuY2hyb21lZHJpdmVyID0gbnVsbDtcbiAgICB0aGlzLnNlc3Npb25DaHJvbWVkcml2ZXJzID0ge307XG5cbiAgICAvLyBtZW1vaXplIGZ1bmN0aW9ucyBoZXJlLCBzbyB0aGF0IHRoZXkgYXJlIGRvbmUgb24gYSBwZXItaW5zdGFuY2UgYmFzaXNcbiAgICBmb3IgKGNvbnN0IGZuIG9mIE1FTU9JWkVEX0ZVTkNUSU9OUykge1xuICAgICAgdGhpc1tmbl0gPSBfLm1lbW9pemUodGhpc1tmbl0pO1xuICAgIH1cbiAgfVxuXG4gIHZhbGlkYXRlRGVzaXJlZENhcHMgKGNhcHMpIHtcbiAgICByZXR1cm4gc3VwZXIudmFsaWRhdGVEZXNpcmVkQ2FwcyhjYXBzKSAmJiBhbmRyb2lkSGVscGVycy52YWxpZGF0ZURlc2lyZWRDYXBzKGNhcHMpO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlU2Vzc2lvbiAoLi4uYXJncykge1xuICAgIHRyeSB7XG4gICAgICAvLyBUT0RPIGhhbmRsZSBvdGhlclNlc3Npb25EYXRhIGZvciBtdWx0aXBsZSBzZXNzaW9uc1xuICAgICAgbGV0IFtzZXNzaW9uSWQsIGNhcHNdID0gYXdhaXQgc3VwZXIuY3JlYXRlU2Vzc2lvbiguLi5hcmdzKTtcblxuICAgICAgbGV0IHNlcnZlckRldGFpbHMgPSB7XG4gICAgICAgIHBsYXRmb3JtOiAnTElOVVgnLFxuICAgICAgICB3ZWJTdG9yYWdlRW5hYmxlZDogZmFsc2UsXG4gICAgICAgIHRha2VzU2NyZWVuc2hvdDogdHJ1ZSxcbiAgICAgICAgamF2YXNjcmlwdEVuYWJsZWQ6IHRydWUsXG4gICAgICAgIGRhdGFiYXNlRW5hYmxlZDogZmFsc2UsXG4gICAgICAgIG5ldHdvcmtDb25uZWN0aW9uRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgbG9jYXRpb25Db250ZXh0RW5hYmxlZDogZmFsc2UsXG4gICAgICAgIHdhcm5pbmdzOiB7fSxcbiAgICAgICAgZGVzaXJlZDogdGhpcy5jYXBzLFxuICAgICAgfTtcblxuICAgICAgdGhpcy5jYXBzID0gT2JqZWN0LmFzc2lnbihzZXJ2ZXJEZXRhaWxzLCB0aGlzLmNhcHMpO1xuXG4gICAgICB0aGlzLmN1ckNvbnRleHQgPSB0aGlzLmRlZmF1bHRDb250ZXh0TmFtZSgpO1xuXG4gICAgICBsZXQgZGVmYXVsdE9wdHMgPSB7XG4gICAgICAgIGZ1bGxSZXNldDogZmFsc2UsXG4gICAgICAgIGF1dG9MYXVuY2g6IHRydWUsXG4gICAgICAgIGFkYlBvcnQ6IERFRkFVTFRfQURCX1BPUlQsXG4gICAgICAgIGFuZHJvaWRJbnN0YWxsVGltZW91dDogOTAwMDBcbiAgICAgIH07XG4gICAgICBfLmRlZmF1bHRzKHRoaXMub3B0cywgZGVmYXVsdE9wdHMpO1xuXG4gICAgICBpZiAodGhpcy5pc0Nocm9tZVNlc3Npb24pIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oXCJXZSdyZSBnb2luZyB0byBydW4gYSBDaHJvbWUtYmFzZWQgc2Vzc2lvblwiKTtcbiAgICAgICAgbGV0IHtwa2csIGFjdGl2aXR5fSA9IGhlbHBlcnMuZ2V0Q2hyb21lUGtnKHRoaXMub3B0cy5icm93c2VyTmFtZSk7XG4gICAgICAgIHRoaXMub3B0cy5hcHBQYWNrYWdlID0gdGhpcy5jYXBzLmFwcFBhY2thZ2UgPSBwa2c7XG4gICAgICAgIHRoaXMub3B0cy5hcHBBY3Rpdml0eSA9IHRoaXMuY2Fwcy5hcHBBY3Rpdml0eSA9IGFjdGl2aXR5O1xuICAgICAgICBsb2dnZXIuaW5mbyhgQ2hyb21lLXR5cGUgcGFja2FnZSBhbmQgYWN0aXZpdHkgYXJlICR7cGtnfSBhbmQgJHthY3Rpdml0eX1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub3B0cy5yZWJvb3QpIHtcbiAgICAgICAgdGhpcy5zZXRBdmRGcm9tQ2FwYWJpbGl0aWVzKGNhcHMpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRzLmFwcCkge1xuICAgICAgICAvLyBmaW5kIGFuZCBjb3B5LCBvciBkb3dubG9hZCBhbmQgdW56aXAgYW4gYXBwIHVybCBvciBwYXRoXG4gICAgICAgIHRoaXMub3B0cy5hcHAgPSBhd2FpdCB0aGlzLmhlbHBlcnMuY29uZmlndXJlQXBwKHRoaXMub3B0cy5hcHAsIFtBUEtfRVhURU5TSU9OLCBBUEtTX0VYVEVOU0lPTl0pO1xuICAgICAgICBhd2FpdCB0aGlzLmNoZWNrQXBwUHJlc2VudCgpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdHMuYXBwUGFja2FnZSkge1xuICAgICAgICAvLyB0aGUgYXBwIGlzbid0IGFuIGFjdHVhbCBhcHAgZmlsZSBidXQgcmF0aGVyIHNvbWV0aGluZyB3ZSB3YW50IHRvXG4gICAgICAgIC8vIGFzc3VtZSBpcyBvbiB0aGUgZGV2aWNlIGFuZCBqdXN0IGxhdW5jaCB2aWEgdGhlIGFwcFBhY2thZ2VcbiAgICAgICAgbG9nZ2VyLmluZm8oYFN0YXJ0aW5nICcke3RoaXMub3B0cy5hcHBQYWNrYWdlfScgZGlyZWN0bHkgb24gdGhlIGRldmljZWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oYE5laXRoZXIgJ2FwcCcgbm9yICdhcHBQYWNrYWdlJyB3YXMgc2V0LiBTdGFydGluZyBVaUF1dG9tYXRvcjIgYCArXG4gICAgICAgICAgJ3dpdGhvdXQgdGhlIHRhcmdldCBhcHBsaWNhdGlvbicpO1xuICAgICAgfVxuICAgICAgdGhpcy5vcHRzLmFkYlBvcnQgPSB0aGlzLm9wdHMuYWRiUG9ydCB8fCBERUZBVUxUX0FEQl9QT1JUO1xuXG4gICAgICBhd2FpdCB0aGlzLnN0YXJ0VWlBdXRvbWF0b3IyU2Vzc2lvbigpO1xuICAgICAgYXdhaXQgdGhpcy5maWxsRGV2aWNlRGV0YWlscygpO1xuICAgICAgaWYgKHRoaXMub3B0cy5tanBlZ1NjcmVlbnNob3RVcmwpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oYFN0YXJ0aW5nIE1KUEVHIHN0cmVhbSByZWFkaW5nIFVSTDogJyR7dGhpcy5vcHRzLm1qcGVnU2NyZWVuc2hvdFVybH0nYCk7XG4gICAgICAgIHRoaXMubWpwZWdTdHJlYW0gPSBuZXcgbWpwZWcuTUpwZWdTdHJlYW0odGhpcy5vcHRzLm1qcGVnU2NyZWVuc2hvdFVybCk7XG4gICAgICAgIGF3YWl0IHRoaXMubWpwZWdTdHJlYW0uc3RhcnQoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBbc2Vzc2lvbklkLCB0aGlzLmNhcHNdO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGF3YWl0IHRoaXMuZGVsZXRlU2Vzc2lvbigpO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBmaWxsRGV2aWNlRGV0YWlscyAoKSB7XG4gICAgdGhpcy5jYXBzLnBpeGVsUmF0aW8gPSBhd2FpdCB0aGlzLmdldERldmljZVBpeGVsUmF0aW8oKTtcbiAgICB0aGlzLmNhcHMuc3RhdEJhckhlaWdodCA9IGF3YWl0IHRoaXMuZ2V0U3RhdHVzQmFySGVpZ2h0KCk7XG4gICAgdGhpcy5jYXBzLnZpZXdwb3J0UmVjdCA9IGF3YWl0IHRoaXMuZ2V0Vmlld1BvcnRSZWN0KCk7XG4gIH1cblxuICBnZXQgZHJpdmVyRGF0YSAoKSB7XG4gICAgLy8gVE9ETyBmaWxsIG91dCByZXNvdXJjZSBpbmZvIGhlcmVcbiAgICByZXR1cm4ge307XG4gIH1cblxuICBhc3luYyBnZXRTZXNzaW9uICgpIHtcbiAgICBsZXQgc2Vzc2lvbkRhdGEgPSBhd2FpdCBzdXBlci5nZXRTZXNzaW9uKCk7XG4gICAgbG9nZ2VyLmRlYnVnKCdHZXR0aW5nIHNlc3Npb24gZGV0YWlscyBmcm9tIHNlcnZlciB0byBtaXggaW4nKTtcbiAgICBsZXQgdWlhMkRhdGEgPSBhd2FpdCB0aGlzLnVpYXV0b21hdG9yMi5qd3Byb3h5LmNvbW1hbmQoJy8nLCAnR0VUJywge30pO1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBzZXNzaW9uRGF0YSwgdWlhMkRhdGEpO1xuICB9XG5cbiAgaXNFbXVsYXRvciAoKSB7XG4gICAgcmV0dXJuICEhKHRoaXMub3B0cy5hdmQgfHwgL2VtdWxhdG9yLy50ZXN0KHRoaXMub3B0cy51ZGlkKSk7XG4gIH1cblxuICBzZXRBdmRGcm9tQ2FwYWJpbGl0aWVzIChjYXBzKSB7XG4gICAgaWYgKHRoaXMub3B0cy5hdmQpIHtcbiAgICAgIGxvZ2dlci5pbmZvKCdhdmQgbmFtZSBkZWZpbmVkLCBpZ25vcmluZyBkZXZpY2UgbmFtZSBhbmQgcGxhdGZvcm0gdmVyc2lvbicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWNhcHMuZGV2aWNlTmFtZSkge1xuICAgICAgICBsb2dnZXIuZXJyb3JBbmRUaHJvdygnYXZkIG9yIGRldmljZU5hbWUgc2hvdWxkIGJlIHNwZWNpZmllZCB3aGVuIHJlYm9vdCBvcHRpb24gaXMgZW5hYmxlcycpO1xuICAgICAgfVxuICAgICAgaWYgKCFjYXBzLnBsYXRmb3JtVmVyc2lvbikge1xuICAgICAgICBsb2dnZXIuZXJyb3JBbmRUaHJvdygnYXZkIG9yIHBsYXRmb3JtVmVyc2lvbiBzaG91bGQgYmUgc3BlY2lmaWVkIHdoZW4gcmVib290IG9wdGlvbiBpcyBlbmFibGVkJyk7XG4gICAgICB9XG4gICAgICBsZXQgYXZkRGV2aWNlID0gY2Fwcy5kZXZpY2VOYW1lLnJlcGxhY2UoL1teYS16QS1aMC05Xy5dL2csICctJyk7XG4gICAgICB0aGlzLm9wdHMuYXZkID0gYCR7YXZkRGV2aWNlfV9fJHtjYXBzLnBsYXRmb3JtVmVyc2lvbn1gO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGFsbG9jYXRlU3lzdGVtUG9ydCAoKSB7XG4gICAgYXdhaXQgUE9SVF9BTExPQ0FUSU9OX0dVQVJELmFjcXVpcmUoQW5kcm9pZFVpYXV0b21hdG9yMkRyaXZlci5uYW1lLCBhc3luYyAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICB0aGlzLm9wdHMuc3lzdGVtUG9ydCA9IHRoaXMub3B0cy5zeXN0ZW1Qb3J0IHx8IGF3YWl0IGZpbmRBUG9ydE5vdEluVXNlKFxuICAgICAgICAgIFNZU1RFTV9QT1JUX1JBTkdFWzBdLCBTWVNURU1fUE9SVF9SQU5HRVsxXSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvckFuZFRocm93KFxuICAgICAgICAgIGBDYW5ub3QgZmluZCBhbnkgZnJlZSBwb3J0IGluIHJhbmdlICR7Xy5maXJzdChTWVNURU1fUE9SVF9SQU5HRSl9Li4ke18ubGFzdChTWVNURU1fUE9SVF9SQU5HRSl9fS4gYCArXG4gICAgICAgICAgYFBsZWFzZSBzZXQgdGhlIGF2YWlsYWJsZSBwb3J0IG51bWJlciBieSBwcm92aWRpbmcgdGhlIHN5c3RlbVBvcnQgY2FwYWJpbGl0eSBvciBgICtcbiAgICAgICAgICBgZG91YmxlIGNoZWNrIHRoZSBwcm9jZXNzZXMgdGhhdCBhcmUgbG9ja2luZyBwb3J0cyB3aXRoaW4gdGhpcyByYW5nZSBhbmQgdGVybWluYXRlIGAgK1xuICAgICAgICAgIGB0aGVzZSB3aGljaCBhcmUgbm90IG5lZWRlZCBhbnltb3JlYCk7XG4gICAgICB9XG4gICAgICBsb2dnZXIuZGVidWcoYEZvcndhcmRpbmcgVWlBdXRvbWF0b3IyIFNlcnZlciBwb3J0ICR7REVWSUNFX1BPUlR9IHRvICR7dGhpcy5vcHRzLnN5c3RlbVBvcnR9YCk7XG4gICAgICBhd2FpdCB0aGlzLmFkYi5mb3J3YXJkUG9ydCh0aGlzLm9wdHMuc3lzdGVtUG9ydCwgREVWSUNFX1BPUlQpO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgcmVsZWFzZVN5c3RlbVBvcnQgKCkge1xuICAgIGlmICghdGhpcy5vcHRzLnN5c3RlbVBvcnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXdhaXQgUE9SVF9BTExPQ0FUSU9OX0dVQVJELmFjcXVpcmUoQW5kcm9pZFVpYXV0b21hdG9yMkRyaXZlci5uYW1lLFxuICAgICAgYXN5bmMgKCkgPT4gYXdhaXQgdGhpcy5hZGIucmVtb3ZlUG9ydEZvcndhcmQodGhpcy5vcHRzLnN5c3RlbVBvcnQpKTtcbiAgfVxuXG4gIGFzeW5jIHN0YXJ0VWlBdXRvbWF0b3IyU2Vzc2lvbiAoKSB7XG4gICAgLy8gZ2V0IGRldmljZSB1ZGlkIGZvciB0aGlzIHNlc3Npb25cbiAgICBsZXQge3VkaWQsIGVtUG9ydH0gPSBhd2FpdCBoZWxwZXJzLmdldERldmljZUluZm9Gcm9tQ2Fwcyh0aGlzLm9wdHMpO1xuICAgIHRoaXMub3B0cy51ZGlkID0gdWRpZDtcbiAgICB0aGlzLm9wdHMuZW1Qb3J0ID0gZW1Qb3J0O1xuXG4gICAgLy8gbm93IHRoYXQgd2Uga25vdyBvdXIgamF2YSB2ZXJzaW9uIGFuZCBkZXZpY2UgaW5mbywgd2UgY2FuIGNyZWF0ZSBvdXJcbiAgICAvLyBBREIgaW5zdGFuY2VcbiAgICB0aGlzLmFkYiA9IGF3YWl0IGFuZHJvaWRIZWxwZXJzLmNyZWF0ZUFEQih0aGlzLm9wdHMpO1xuXG4gICAgY29uc3QgYXBpTGV2ZWwgPSBhd2FpdCB0aGlzLmFkYi5nZXRBcGlMZXZlbCgpO1xuXG4gICAgaWYgKGFwaUxldmVsIDwgMjEpIHtcbiAgICAgIGxvZ2dlci5lcnJvckFuZFRocm93KCdVSUF1dG9tYXRvcjIgaXMgb25seSBzdXBwb3J0ZWQgc2luY2UgQW5kcm9pZCA1LjAgKExvbGxpcG9wKS4gJyArXG4gICAgICAgICdZb3UgY291bGQgc3RpbGwgdXNlIG90aGVyIHN1cHBvcnRlZCBiYWNrZW5kcyBpbiBvcmRlciB0byBhdXRvbWF0ZSBvbGRlciBBbmRyb2lkIHZlcnNpb25zLicpO1xuICAgIH1cblxuICAgIGlmIChhcGlMZXZlbCA+PSAyOCkgeyAvLyBBbmRyb2lkIFBcbiAgICAgIGxvZ2dlci53YXJuKCdSZWxheGluZyBoaWRkZW4gYXBpIHBvbGljeScpO1xuICAgICAgYXdhaXQgdGhpcy5hZGIuc2V0SGlkZGVuQXBpUG9saWN5KCcxJyk7XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgaWYgd2UgaGF2ZSB0byBlbmFibGUvZGlzYWJsZSBncHMgYmVmb3JlIHJ1bm5pbmcgdGhlIGFwcGxpY2F0aW9uXG4gICAgaWYgKHV0aWwuaGFzVmFsdWUodGhpcy5vcHRzLmdwc0VuYWJsZWQpKSB7XG4gICAgICBpZiAodGhpcy5pc0VtdWxhdG9yKCkpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oYFRyeWluZyB0byAke3RoaXMub3B0cy5ncHNFbmFibGVkID8gJ2VuYWJsZScgOiAnZGlzYWJsZSd9IGdwcyBsb2NhdGlvbiBwcm92aWRlcmApO1xuICAgICAgICBhd2FpdCB0aGlzLmFkYi50b2dnbGVHUFNMb2NhdGlvblByb3ZpZGVyKHRoaXMub3B0cy5ncHNFbmFibGVkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZ2dlci53YXJuKGBTb3JyeSEgJ2dwc0VuYWJsZWQnIGNhcGFiaWxpdHkgaXMgb25seSBhdmFpbGFibGUgZm9yIGVtdWxhdG9yc2ApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGdldCBhcHBQYWNrYWdlIGV0IGFsIGZyb20gbWFuaWZlc3QgaWYgbmVjZXNzYXJ5XG4gICAgY29uc3QgYXBwSW5mbyA9IGF3YWl0IGhlbHBlcnMuZ2V0TGF1bmNoSW5mbyh0aGlzLmFkYiwgdGhpcy5vcHRzKTtcbiAgICAvLyBhbmQgZ2V0IGl0IG9udG8gb3VyICdvcHRzJyBvYmplY3Qgc28gd2UgdXNlIGl0IGZyb20gbm93IG9uXG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLm9wdHMsIGFwcEluZm8gfHwge30pO1xuXG4gICAgLy8gc2V0IGFjdHVhbCBkZXZpY2UgbmFtZSwgdWRpZCwgcGxhdGZvcm0gdmVyc2lvbiwgc2NyZWVuIHNpemUsIHNjcmVlbiBkZW5zaXR5LCBtb2RlbCBhbmQgbWFudWZhY3R1cmVyIGRldGFpbHNcbiAgICB0aGlzLmNhcHMuZGV2aWNlTmFtZSA9IHRoaXMuYWRiLmN1ckRldmljZUlkO1xuICAgIHRoaXMuY2Fwcy5kZXZpY2VVRElEID0gdGhpcy5vcHRzLnVkaWQ7XG5cbiAgICAvLyBzdGFydCBhbiBhdmQsIHNldCB0aGUgbGFuZ3VhZ2UvbG9jYWxlLCBwaWNrIGFuIGVtdWxhdG9yLCBldGMuLi5cbiAgICAvLyBUT0RPIHdpdGggbXVsdGlwbGUgZGV2aWNlcyB3ZSdsbCBuZWVkIHRvIHBhcmFtZXRlcml6ZSB0aGlzXG4gICAgdGhpcy5kZWZhdWx0SU1FID0gYXdhaXQgaGVscGVycy5pbml0RGV2aWNlKHRoaXMuYWRiLCB0aGlzLm9wdHMpO1xuXG4gICAgLy8gUHJlcGFyZSB0aGUgZGV2aWNlIGJ5IGZvcndhcmRpbmcgdGhlIFVpQXV0b21hdG9yMiBwb3J0XG4gICAgLy8gVGhpcyBjYWxsIG11dGF0ZXMgdGhpcy5vcHRzLnN5c3RlbVBvcnQgaWYgaXQgaXMgbm90IHNldCBleHBsaWNpdGx5XG4gICAgYXdhaXQgdGhpcy5hbGxvY2F0ZVN5c3RlbVBvcnQoKTtcblxuICAgIC8vIHNldCB1cCB0aGUgbW9kaWZpZWQgVWlBdXRvbWF0b3IyIHNlcnZlciBldGNcbiAgICBhd2FpdCB0aGlzLmluaXRVaUF1dG9tYXRvcjJTZXJ2ZXIoKTtcblxuICAgIC8vIFNob3VsZCBiZSBhZnRlciBpbnN0YWxsaW5nIGlvLmFwcGl1bS5zZXR0aW5ncyBpbiBoZWxwZXJzLmluaXREZXZpY2VcbiAgICBpZiAodGhpcy5vcHRzLmRpc2FibGVXaW5kb3dBbmltYXRpb24gJiYgKGF3YWl0IHRoaXMuYWRiLmdldEFwaUxldmVsKCkgPCAyNikpIHsgLy8gQVBJIGxldmVsIDI2IGlzIEFuZHJvaWQgOC4wLlxuICAgICAgLy8gR3JhbnRpbmcgYW5kcm9pZC5wZXJtaXNzaW9uLlNFVF9BTklNQVRJT05fU0NBTEUgaXMgbmVjZXNzYXJ5IHRvIGhhbmRsZSBhbmltYXRpb25zIHVuZGVyIEFQSSBsZXZlbCAyNlxuICAgICAgLy8gUmVhZCBodHRwczovL2dpdGh1Yi5jb20vYXBwaXVtL2FwcGl1bS9wdWxsLzExNjQwI2lzc3VlY29tbWVudC00MzgyNjA0NzdcbiAgICAgIC8vIGAtLW5vLXdpbmRvdy1hbmltYXRpb25gIHdvcmtzIG92ZXIgQW5kcm9pZCA4IHRvIGRpc2FibGUgYWxsIG9mIGFuaW1hdGlvbnNcbiAgICAgIGlmIChhd2FpdCB0aGlzLmFkYi5pc0FuaW1hdGlvbk9uKCkpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJ0Rpc2FibGluZyBhbmltYXRpb24gdmlhIGlvLmFwcGl1bS5zZXR0aW5ncycpO1xuICAgICAgICBhd2FpdCB0aGlzLmFkYi5zZXRBbmltYXRpb25TdGF0ZShmYWxzZSk7XG4gICAgICAgIHRoaXMuX3dhc1dpbmRvd0FuaW1hdGlvbkRpc2FibGVkID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKCdXaW5kb3cgYW5pbWF0aW9uIGlzIGFscmVhZHkgZGlzYWJsZWQnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgdXNlciBzZXRzIGF1dG9MYXVuY2ggdG8gZmFsc2UsIHRoZXkgYXJlIHJlc3BvbnNpYmxlIGZvciBpbml0QVVUKCkgYW5kIHN0YXJ0QVVUKClcbiAgICBpZiAodGhpcy5vcHRzLmF1dG9MYXVuY2gpIHtcbiAgICAgIC8vIHNldCB1cCBhcHAgdW5kZXIgdGVzdFxuICAgICAgLy8gcHJlcGFyZSBvdXIgYWN0dWFsIEFVVCwgZ2V0IGl0IG9uIHRoZSBkZXZpY2UsIGV0Yy4uLlxuICAgICAgYXdhaXQgdGhpcy5pbml0QVVUKCk7XG4gICAgfVxuICAgIC8vIEFkZGluZyBBVVQgcGFja2FnZSBuYW1lIGluIHRoZSBjYXBhYmlsaXRpZXMgaWYgcGFja2FnZSBuYW1lIG5vdCBleGlzdCBpbiBjYXBzXG4gICAgaWYgKCF0aGlzLmNhcHMuYXBwUGFja2FnZSAmJiBhcHBJbmZvKSB7XG4gICAgICB0aGlzLmNhcHMuYXBwUGFja2FnZSA9IGFwcEluZm8uYXBwUGFja2FnZTtcbiAgICB9XG5cbiAgICAvLyBsYXVuY2ggVWlBdXRvbWF0b3IyIGFuZCB3YWl0IHRpbGwgaXRzIG9ubGluZSBhbmQgd2UgaGF2ZSBhIHNlc3Npb25cbiAgICBhd2FpdCB0aGlzLnVpYXV0b21hdG9yMi5zdGFydFNlc3Npb24odGhpcy5jYXBzKTtcblxuICAgIGF3YWl0IHRoaXMuYWRkRGV2aWNlSW5mb1RvQ2FwcygpO1xuXG4gICAgLy8gVW5sb2NrIHRoZSBkZXZpY2UgYWZ0ZXIgdGhlIHNlc3Npb24gaXMgc3RhcnRlZC5cbiAgICBpZiAoIXRoaXMub3B0cy5za2lwVW5sb2NrKSB7XG4gICAgICAvLyB1bmxvY2sgdGhlIGRldmljZSB0byBwcmVwYXJlIGl0IGZvciB0ZXN0aW5nXG4gICAgICBhd2FpdCBoZWxwZXJzLnVubG9jayh0aGlzLCB0aGlzLmFkYiwgdGhpcy5jYXBzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLmRlYnVnKGAnc2tpcFVubG9jaycgY2FwYWJpbGl0eSBzZXQsIHNvIHNraXBwaW5nIGRldmljZSB1bmxvY2tgKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc0Nocm9tZVNlc3Npb24pIHsgLy8gc3RhcnQgYSBjaHJvbWVkcml2ZXIgc2Vzc2lvblxuICAgICAgYXdhaXQgdGhpcy5zdGFydENocm9tZVNlc3Npb24odGhpcyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLm9wdHMuYXV0b0xhdW5jaCAmJiB0aGlzLm9wdHMuYXBwUGFja2FnZSkge1xuICAgICAgYXdhaXQgdGhpcy5lbnN1cmVBcHBTdGFydHMoKTtcbiAgICB9XG5cbiAgICAvLyBpZiB0aGUgaW5pdGlhbCBvcmllbnRhdGlvbiBpcyByZXF1ZXN0ZWQsIHNldCBpdFxuICAgIGlmICh1dGlsLmhhc1ZhbHVlKHRoaXMub3B0cy5vcmllbnRhdGlvbikpIHtcbiAgICAgIGxvZ2dlci5kZWJ1ZyhgU2V0dGluZyBpbml0aWFsIG9yaWVudGF0aW9uIHRvICcke3RoaXMub3B0cy5vcmllbnRhdGlvbn0nYCk7XG4gICAgICBhd2FpdCB0aGlzLnNldE9yaWVudGF0aW9uKHRoaXMub3B0cy5vcmllbnRhdGlvbik7XG4gICAgfVxuXG4gICAgLy8gaWYgd2Ugd2FudCB0byBpbW1lZGlhdGVseSBnZXQgaW50byBhIHdlYnZpZXcsIHNldCBvdXIgY29udGV4dFxuICAgIC8vIGFwcHJvcHJpYXRlbHlcbiAgICBpZiAodGhpcy5vcHRzLmF1dG9XZWJ2aWV3KSB7XG4gICAgICBjb25zdCB2aWV3TmFtZSA9IHRoaXMuZGVmYXVsdFdlYnZpZXdOYW1lKCk7XG4gICAgICBjb25zdCB0aW1lb3V0ID0gdGhpcy5vcHRzLmF1dG9XZWJ2aWV3VGltZW91dCB8fCAyMDAwO1xuICAgICAgbG9nZ2VyLmluZm8oYFNldHRpbmcgYXV0byB3ZWJ2aWV3IHRvIGNvbnRleHQgJyR7dmlld05hbWV9JyB3aXRoIHRpbWVvdXQgJHt0aW1lb3V0fW1zYCk7XG4gICAgICBhd2FpdCByZXRyeUludGVydmFsKHRpbWVvdXQgLyA1MDAsIDUwMCwgdGhpcy5zZXRDb250ZXh0LmJpbmQodGhpcyksIHZpZXdOYW1lKTtcbiAgICB9XG5cbiAgICAvLyBub3cgdGhhdCBldmVyeXRoaW5nIGhhcyBzdGFydGVkIHN1Y2Nlc3NmdWxseSwgdHVybiBvbiBwcm94eWluZyBzbyBhbGxcbiAgICAvLyBzdWJzZXF1ZW50IHNlc3Npb24gcmVxdWVzdHMgZ28gc3RyYWlnaHQgdG8vZnJvbSB1aWF1dG9tYXRvcjJcbiAgICB0aGlzLmp3cFByb3h5QWN0aXZlID0gdHJ1ZTtcbiAgfVxuXG4gIGFzeW5jIGFkZERldmljZUluZm9Ub0NhcHMgKCkge1xuICAgIGNvbnN0IHtcbiAgICAgIGFwaVZlcnNpb24sXG4gICAgICBwbGF0Zm9ybVZlcnNpb24sXG4gICAgICBtYW51ZmFjdHVyZXIsXG4gICAgICBtb2RlbCxcbiAgICAgIHJlYWxEaXNwbGF5U2l6ZSxcbiAgICAgIGRpc3BsYXlEZW5zaXR5LFxuICAgIH0gPSBhd2FpdCB0aGlzLm1vYmlsZUdldERldmljZUluZm8oKTtcbiAgICB0aGlzLmNhcHMuZGV2aWNlQXBpTGV2ZWwgPSBwYXJzZUludChhcGlWZXJzaW9uLCAxMCk7XG4gICAgdGhpcy5jYXBzLnBsYXRmb3JtVmVyc2lvbiA9IHBsYXRmb3JtVmVyc2lvbjtcbiAgICB0aGlzLmNhcHMuZGV2aWNlU2NyZWVuU2l6ZSA9IHJlYWxEaXNwbGF5U2l6ZTtcbiAgICB0aGlzLmNhcHMuZGV2aWNlU2NyZWVuRGVuc2l0eSA9IGRpc3BsYXlEZW5zaXR5O1xuICAgIHRoaXMuY2Fwcy5kZXZpY2VNb2RlbCA9IG1vZGVsO1xuICAgIHRoaXMuY2Fwcy5kZXZpY2VNYW51ZmFjdHVyZXIgPSBtYW51ZmFjdHVyZXI7XG4gIH1cblxuICBhc3luYyBpbml0VWlBdXRvbWF0b3IyU2VydmVyICgpIHtcbiAgICAvLyBub3cgdGhhdCB3ZSBoYXZlIHBhY2thZ2UgYW5kIGFjdGl2aXR5LCB3ZSBjYW4gY3JlYXRlIGFuIGluc3RhbmNlIG9mXG4gICAgLy8gdWlhdXRvbWF0b3IyIHdpdGggdGhlIGFwcHJvcHJpYXRlIGRhdGFcbiAgICB0aGlzLnVpYXV0b21hdG9yMiA9IG5ldyBVaUF1dG9tYXRvcjJTZXJ2ZXIoe1xuICAgICAgaG9zdDogdGhpcy5vcHRzLnJlbW90ZUFkYkhvc3QgfHwgdGhpcy5vcHRzLmhvc3QgfHwgJzEyNy4wLjAuMScsXG4gICAgICBzeXN0ZW1Qb3J0OiB0aGlzLm9wdHMuc3lzdGVtUG9ydCxcbiAgICAgIGRldmljZVBvcnQ6IERFVklDRV9QT1JULFxuICAgICAgYWRiOiB0aGlzLmFkYixcbiAgICAgIGFwazogdGhpcy5vcHRzLmFwcCxcbiAgICAgIHRtcERpcjogdGhpcy5vcHRzLnRtcERpcixcbiAgICAgIGFwcFBhY2thZ2U6IHRoaXMub3B0cy5hcHBQYWNrYWdlLFxuICAgICAgYXBwQWN0aXZpdHk6IHRoaXMub3B0cy5hcHBBY3Rpdml0eSxcbiAgICAgIGRpc2FibGVXaW5kb3dBbmltYXRpb246ICEhdGhpcy5vcHRzLmRpc2FibGVXaW5kb3dBbmltYXRpb24sXG4gICAgfSk7XG4gICAgdGhpcy5wcm94eVJlcVJlcyA9IHRoaXMudWlhdXRvbWF0b3IyLnByb3h5UmVxUmVzLmJpbmQodGhpcy51aWF1dG9tYXRvcjIpO1xuXG4gICAgaWYgKHRoaXMub3B0cy5za2lwU2VydmVySW5zdGFsbGF0aW9uKSB7XG4gICAgICBsb2dnZXIuaW5mbyhgJ3NraXBTZXJ2ZXJJbnN0YWxsYXRpb24nIGlzIHNldC4gU2tpcHBpbmcgVUlBdXRvbWF0b3IyIHNlcnZlciBpbnN0YWxsYXRpb24uYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHRoaXMudWlhdXRvbWF0b3IyLmluc3RhbGxTZXJ2ZXJBcGsodGhpcy5vcHRzLnVpYXV0b21hdG9yMlNlcnZlckluc3RhbGxUaW1lb3V0KTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBpbml0QVVUICgpIHtcbiAgICAvLyBVbmluc3RhbGwgYW55IHVuaW5zdGFsbE90aGVyUGFja2FnZXMgd2hpY2ggd2VyZSBzcGVjaWZpZWQgaW4gY2Fwc1xuICAgIGlmICh0aGlzLm9wdHMudW5pbnN0YWxsT3RoZXJQYWNrYWdlcykge1xuICAgICAgYXdhaXQgaGVscGVycy51bmluc3RhbGxPdGhlclBhY2thZ2VzKFxuICAgICAgICB0aGlzLmFkYixcbiAgICAgICAgaGVscGVycy5wYXJzZUFycmF5KHRoaXMub3B0cy51bmluc3RhbGxPdGhlclBhY2thZ2VzKSxcbiAgICAgICAgW1NFVFRJTkdTX0hFTFBFUl9QS0dfSUQsIFNFUlZFUl9QQUNLQUdFX0lELCBTRVJWRVJfVEVTVF9QQUNLQUdFX0lEXVxuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBJbnN0YWxsIGFueSBcIm90aGVyQXBwc1wiIHRoYXQgd2VyZSBzcGVjaWZpZWQgaW4gY2Fwc1xuICAgIGlmICh0aGlzLm9wdHMub3RoZXJBcHBzKSB7XG4gICAgICBsZXQgb3RoZXJBcHBzO1xuICAgICAgdHJ5IHtcbiAgICAgICAgb3RoZXJBcHBzID0gaGVscGVycy5wYXJzZUFycmF5KHRoaXMub3B0cy5vdGhlckFwcHMpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBsb2dnZXIuZXJyb3JBbmRUaHJvdyhgQ291bGQgbm90IHBhcnNlIFwib3RoZXJBcHBzXCIgY2FwYWJpbGl0eTogJHtlLm1lc3NhZ2V9YCk7XG4gICAgICB9XG4gICAgICBvdGhlckFwcHMgPSBhd2FpdCBCLmFsbChvdGhlckFwcHNcbiAgICAgICAgLm1hcCgoYXBwKSA9PiB0aGlzLmhlbHBlcnMuY29uZmlndXJlQXBwKGFwcCwgW0FQS19FWFRFTlNJT04sIEFQS1NfRVhURU5TSU9OXSkpKTtcbiAgICAgIGF3YWl0IGhlbHBlcnMuaW5zdGFsbE90aGVyQXBrcyhvdGhlckFwcHMsIHRoaXMuYWRiLCB0aGlzLm9wdHMpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdHMuYXBwKSB7XG4gICAgICBpZiAoIXRoaXMub3B0cy5ub1NpZ24gJiYgIWF3YWl0IHRoaXMuYWRiLmNoZWNrQXBrQ2VydCh0aGlzLm9wdHMuYXBwLCB0aGlzLm9wdHMuYXBwUGFja2FnZSkpIHtcbiAgICAgICAgYXdhaXQgaGVscGVycy5zaWduQXBwKHRoaXMuYWRiLCB0aGlzLm9wdHMuYXBwKTtcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5vcHRzLnNraXBVbmluc3RhbGwpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5hZGIudW5pbnN0YWxsQXBrKHRoaXMub3B0cy5hcHBQYWNrYWdlKTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IGhlbHBlcnMuaW5zdGFsbEFwayh0aGlzLmFkYiwgdGhpcy5vcHRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMub3B0cy5mdWxsUmVzZXQpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yQW5kVGhyb3coJ0Z1bGwgcmVzZXQgcmVxdWlyZXMgYW4gYXBwIGNhcGFiaWxpdHksIHVzZSBmYXN0UmVzZXQgaWYgYXBwIGlzIG5vdCBwcm92aWRlZCcpO1xuICAgICAgfVxuICAgICAgbG9nZ2VyLmRlYnVnKCdObyBhcHAgY2FwYWJpbGl0eS4gQXNzdW1pbmcgaXQgaXMgYWxyZWFkeSBvbiB0aGUgZGV2aWNlJyk7XG4gICAgICBpZiAodGhpcy5vcHRzLmZhc3RSZXNldCAmJiB0aGlzLm9wdHMuYXBwUGFja2FnZSkge1xuICAgICAgICBhd2FpdCBoZWxwZXJzLnJlc2V0QXBwKHRoaXMuYWRiLCB0aGlzLm9wdHMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGVuc3VyZUFwcFN0YXJ0cyAoKSB7XG4gICAgLy8gbWFrZSBzdXJlIHdlIGhhdmUgYW4gYWN0aXZpdHkgYW5kIHBhY2thZ2UgdG8gd2FpdCBmb3JcbiAgICBjb25zdCBhcHBXYWl0UGFja2FnZSA9IHRoaXMub3B0cy5hcHBXYWl0UGFja2FnZSB8fCB0aGlzLm9wdHMuYXBwUGFja2FnZTtcbiAgICBjb25zdCBhcHBXYWl0QWN0aXZpdHkgPSB0aGlzLm9wdHMuYXBwV2FpdEFjdGl2aXR5IHx8IHRoaXMub3B0cy5hcHBBY3Rpdml0eTtcblxuICAgIGxvZ2dlci5pbmZvKGBTdGFydGluZyAnJHt0aGlzLm9wdHMuYXBwUGFja2FnZX0vJHt0aGlzLm9wdHMuYXBwQWN0aXZpdHl9IGAgK1xuICAgICAgYGFuZCB3YWl0aW5nIGZvciAnJHthcHBXYWl0UGFja2FnZX0vJHthcHBXYWl0QWN0aXZpdHl9J2ApO1xuXG4gICAgaWYgKHRoaXMuY2Fwcy5hbmRyb2lkQ292ZXJhZ2UpIHtcbiAgICAgIGxvZ2dlci5pbmZvKGBhbmRyb2lkQ292ZXJhZ2UgaXMgY29uZmlndXJlZC4gYCArXG4gICAgICAgIGAgU3RhcnRpbmcgaW5zdHJ1bWVudGF0aW9uIG9mICcke3RoaXMuY2Fwcy5hbmRyb2lkQ292ZXJhZ2V9Jy4uLmApO1xuICAgICAgYXdhaXQgdGhpcy5hZGIuYW5kcm9pZENvdmVyYWdlKHRoaXMuY2Fwcy5hbmRyb2lkQ292ZXJhZ2UsIGFwcFdhaXRQYWNrYWdlLCBhcHBXYWl0QWN0aXZpdHkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCB0aGlzLmFkYi5zdGFydEFwcCh7XG4gICAgICAgIHBrZzogdGhpcy5vcHRzLmFwcFBhY2thZ2UsXG4gICAgICAgIGFjdGl2aXR5OiB0aGlzLm9wdHMuYXBwQWN0aXZpdHksXG4gICAgICAgIGFjdGlvbjogdGhpcy5vcHRzLmludGVudEFjdGlvbixcbiAgICAgICAgY2F0ZWdvcnk6IHRoaXMub3B0cy5pbnRlbnRDYXRlZ29yeSxcbiAgICAgICAgZmxhZ3M6IHRoaXMub3B0cy5pbnRlbnRGbGFncyxcbiAgICAgICAgd2FpdFBrZzogdGhpcy5vcHRzLmFwcFdhaXRQYWNrYWdlLFxuICAgICAgICB3YWl0QWN0aXZpdHk6IHRoaXMub3B0cy5hcHBXYWl0QWN0aXZpdHksXG4gICAgICAgIHdhaXRGb3JMYXVuY2g6IHRoaXMub3B0cy5hcHBXYWl0Rm9yTGF1bmNoLFxuICAgICAgICBvcHRpb25hbEludGVudEFyZ3VtZW50czogdGhpcy5vcHRzLm9wdGlvbmFsSW50ZW50QXJndW1lbnRzLFxuICAgICAgICBzdG9wQXBwOiAhdGhpcy5vcHRzLmRvbnRTdG9wQXBwT25SZXNldCxcbiAgICAgICAgcmV0cnk6IHRydWVcbiAgICAgIH0pO1xuICAgIH1cblxuICB9XG5cbiAgYXN5bmMgZGVsZXRlU2Vzc2lvbiAoKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdEZWxldGluZyBVaUF1dG9tYXRvcjIgc2Vzc2lvbicpO1xuICAgIGF3YWl0IGFuZHJvaWRIZWxwZXJzLnJlbW92ZUFsbFNlc3Npb25XZWJTb2NrZXRIYW5kbGVycyh0aGlzLnNlcnZlciwgdGhpcy5zZXNzaW9uSWQpO1xuICAgIGlmICh0aGlzLnVpYXV0b21hdG9yMikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy5zdG9wQ2hyb21lZHJpdmVyUHJveGllcygpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGxvZ2dlci53YXJuKGBVbmFibGUgdG8gc3RvcCBDaHJvbWVEcml2ZXIgcHJveGllczogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmp3cFByb3h5QWN0aXZlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy51aWF1dG9tYXRvcjIuZGVsZXRlU2Vzc2lvbigpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBsb2dnZXIud2FybihgVW5hYmxlIHRvIHByb3h5IGRlbGV0ZVNlc3Npb24gdG8gVWlBdXRvbWF0b3IyOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLnVpYXV0b21hdG9yMiA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuandwUHJveHlBY3RpdmUgPSBmYWxzZTtcblxuICAgIGlmICh0aGlzLmFkYikge1xuICAgICAgaWYgKHRoaXMub3B0cy51bmljb2RlS2V5Ym9hcmQgJiYgdGhpcy5vcHRzLnJlc2V0S2V5Ym9hcmQgJiYgdGhpcy5kZWZhdWx0SU1FKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgUmVzZXR0aW5nIElNRSB0byAnJHt0aGlzLmRlZmF1bHRJTUV9J2ApO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHRoaXMuYWRiLnNldElNRSh0aGlzLmRlZmF1bHRJTUUpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBsb2dnZXIud2FybihgVW5hYmxlIHRvIHJlc2V0IElNRTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHRoaXMuY2Fwcy5hbmRyb2lkQ292ZXJhZ2UpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1NodXR0aW5nIGRvd24gdGhlIGFkYiBwcm9jZXNzIG9mIGluc3RydW1lbnRhdGlvbi4uLicpO1xuICAgICAgICBhd2FpdCB0aGlzLmFkYi5lbmRBbmRyb2lkQ292ZXJhZ2UoKTtcbiAgICAgICAgLy8gVXNlIHRoaXMgYnJvYWRjYXN0IGludGVudCB0byBub3RpZnkgaXQncyB0aW1lIHRvIGR1bXAgY292ZXJhZ2UgdG8gZmlsZVxuICAgICAgICBpZiAodGhpcy5jYXBzLmFuZHJvaWRDb3ZlcmFnZUVuZEludGVudCkge1xuICAgICAgICAgIGxvZ2dlci5pbmZvKGBTZW5kaW5nIGludGVudCBicm9hZGNhc3QgJyR7dGhpcy5jYXBzLmFuZHJvaWRDb3ZlcmFnZUVuZEludGVudH0nIGF0IHRoZSBlbmQgb2YgaW5zdHJ1bWVudGluZy5gKTtcbiAgICAgICAgICBhd2FpdCB0aGlzLmFkYi5icm9hZGNhc3QodGhpcy5jYXBzLmFuZHJvaWRDb3ZlcmFnZUVuZEludGVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oJ05vIGFuZHJvaWRDb3ZlcmFnZUVuZEludGVudCBpcyBjb25maWd1cmVkIGluIGNhcHMuIFBvc3NpYmx5IHlvdSBjYW5ub3QgZ2V0IGNvdmVyYWdlIGZpbGUuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm9wdHMuYXBwUGFja2FnZSkge1xuICAgICAgICBpZiAoIXRoaXMuaXNDaHJvbWVTZXNzaW9uICYmICF0aGlzLm9wdHMuZG9udFN0b3BBcHBPblJlc2V0KSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYWRiLmZvcmNlU3RvcCh0aGlzLm9wdHMuYXBwUGFja2FnZSk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBsb2dnZXIud2FybihgVW5hYmxlIHRvIGZvcmNlIHN0b3AgYXBwOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5vcHRzLmZ1bGxSZXNldCAmJiAhdGhpcy5vcHRzLnNraXBVbmluc3RhbGwpIHtcbiAgICAgICAgICBsb2dnZXIuZGVidWcoYENhcGFiaWxpdHkgJ2Z1bGxSZXNldCcgc2V0IHRvICd0cnVlJywgVW5pbnN0YWxsaW5nICcke3RoaXMub3B0cy5hcHBQYWNrYWdlfSdgKTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5hZGIudW5pbnN0YWxsQXBrKHRoaXMub3B0cy5hcHBQYWNrYWdlKTtcbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGxvZ2dlci53YXJuKGBVbmFibGUgdG8gdW5pbnN0YWxsIGFwcDogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIFRoaXMgdmFsdWUgY2FuIGJlIHRydWUgaWYgdGVzdCB0YXJnZXQgZGV2aWNlIGlzIDw9IDI2XG4gICAgICBpZiAodGhpcy5fd2FzV2luZG93QW5pbWF0aW9uRGlzYWJsZWQpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1Jlc3RvcmluZyB3aW5kb3cgYW5pbWF0aW9uIHN0YXRlJyk7XG4gICAgICAgIGF3YWl0IHRoaXMuYWRiLnNldEFuaW1hdGlvblN0YXRlKHRydWUpO1xuICAgICAgfVxuICAgICAgYXdhaXQgdGhpcy5hZGIuc3RvcExvZ2NhdCgpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy5yZWxlYXNlU3lzdGVtUG9ydCgpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oYFVuYWJsZSB0byByZW1vdmUgcG9ydCBmb3J3YXJkOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gICAgICAgIC8vIElnbm9yZSwgdGhpcyBibG9jayB3aWxsIGFsc28gYmUgY2FsbGVkIHdoZW4gd2UgZmFsbCBpbiBjYXRjaCBibG9ja1xuICAgICAgICAvLyBhbmQgYmVmb3JlIGV2ZW4gcG9ydCBmb3J3YXJkLlxuICAgICAgfVxuXG4gICAgICBpZiAoYXdhaXQgdGhpcy5hZGIuZ2V0QXBpTGV2ZWwoKSA+PSAyOCkgeyAvLyBBbmRyb2lkIFBcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1Jlc3RvcmluZyBoaWRkZW4gYXBpIHBvbGljeSB0byB0aGUgZGV2aWNlIGRlZmF1bHQgY29uZmlndXJhdGlvbicpO1xuICAgICAgICBhd2FpdCB0aGlzLmFkYi5zZXREZWZhdWx0SGlkZGVuQXBpUG9saWN5KCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdHMucmVib290KSB7XG4gICAgICAgIGxldCBhdmROYW1lID0gdGhpcy5vcHRzLmF2ZC5yZXBsYWNlKCdAJywgJycpO1xuICAgICAgICBsb2dnZXIuZGVidWcoYENsb3NpbmcgZW11bGF0b3IgJyR7YXZkTmFtZX0nYCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5hZGIua2lsbEVtdWxhdG9yKGF2ZE5hbWUpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBsb2dnZXIud2FybihgVW5hYmxlIHRvIGNsb3NlIGVtdWxhdG9yOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLm1qcGVnU3RyZWFtKSB7XG4gICAgICBsb2dnZXIuaW5mbygnQ2xvc2luZyBNSlBFRyBzdHJlYW0nKTtcbiAgICAgIHRoaXMubWpwZWdTdHJlYW0uc3RvcCgpO1xuICAgIH1cbiAgICBhd2FpdCBzdXBlci5kZWxldGVTZXNzaW9uKCk7XG4gIH1cblxuICBhc3luYyBjaGVja0FwcFByZXNlbnQgKCkge1xuICAgIGxvZ2dlci5kZWJ1ZygnQ2hlY2tpbmcgd2hldGhlciBhcHAgaXMgYWN0dWFsbHkgcHJlc2VudCcpO1xuICAgIGlmICghKGF3YWl0IGZzLmV4aXN0cyh0aGlzLm9wdHMuYXBwKSkpIHtcbiAgICAgIGxvZ2dlci5lcnJvckFuZFRocm93KGBDb3VsZCBub3QgZmluZCBhcHAgYXBrIGF0ICcke3RoaXMub3B0cy5hcHB9J2ApO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIG9uU2V0dGluZ3NVcGRhdGUgKCkge1xuICAgIC8vIGludGVudGlvbmFsbHkgZG8gbm90aGluZyBoZXJlLCBzaW5jZSBjb21tYW5kcy51cGRhdGVTZXR0aW5ncyBwcm94aWVzXG4gICAgLy8gc2V0dGluZ3MgdG8gdGhlIHVpYXV0bzIgc2VydmVyIGFscmVhZHlcbiAgfVxuXG4gIC8vIE5lZWQgdG8gb3ZlcnJpZGUgYW5kcm9pZC1kcml2ZXIncyB2ZXJzaW9uIG9mIHRoaXMgc2luY2Ugd2UgZG9uJ3QgYWN0dWFsbHlcbiAgLy8gaGF2ZSBhIGJvb3RzdHJhcDsgaW5zdGVhZCB3ZSBqdXN0IHJlc3RhcnQgYWRiIGFuZCByZS1mb3J3YXJkIHRoZSBVaUF1dG9tYXRvcjJcbiAgLy8gcG9ydFxuICBhc3luYyB3cmFwQm9vdHN0cmFwRGlzY29ubmVjdCAod3JhcHBlZCkge1xuICAgIGF3YWl0IHdyYXBwZWQoKTtcbiAgICBhd2FpdCB0aGlzLmFkYi5yZXN0YXJ0KCk7XG4gICAgYXdhaXQgdGhpcy5hbGxvY2F0ZVN5c3RlbVBvcnQoKTtcbiAgfVxuXG4gIHByb3h5QWN0aXZlIChzZXNzaW9uSWQpIHtcbiAgICBzdXBlci5wcm94eUFjdGl2ZShzZXNzaW9uSWQpO1xuXG4gICAgLy8gd2UgYWx3YXlzIGhhdmUgYW4gYWN0aXZlIHByb3h5IHRvIHRoZSBVaUF1dG9tYXRvcjIgc2VydmVyXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBjYW5Qcm94eSAoc2Vzc2lvbklkKSB7XG4gICAgc3VwZXIuY2FuUHJveHkoc2Vzc2lvbklkKTtcblxuICAgIC8vIHdlIGNhbiBhbHdheXMgcHJveHkgdG8gdGhlIHVpYXV0b21hdG9yMiBzZXJ2ZXJcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGdldFByb3h5QXZvaWRMaXN0IChzZXNzaW9uSWQpIHtcbiAgICBzdXBlci5nZXRQcm94eUF2b2lkTGlzdChzZXNzaW9uSWQpO1xuICAgIC8vIHdlIGFyZSBtYWludGFpbmluZyB0d28gc2V0cyBvZiBOT19QUk9YWSBsaXN0cywgb25lIGZvciBjaHJvbWVkcml2ZXIoQ0hST01FX05PX1BST1hZKVxuICAgIC8vIGFuZCBvbmUgZm9yIHVpYXV0b21hdG9yMihOT19QUk9YWSksIGJhc2VkIG9uIGN1cnJlbnQgY29udGV4dCB3aWxsIHJldHVybiByZWxhdGVkIE5PX1BST1hZIGxpc3RcbiAgICBpZiAodXRpbC5oYXNWYWx1ZSh0aGlzLmNocm9tZWRyaXZlcikpIHtcbiAgICAgIC8vIGlmIHRoZSBjdXJyZW50IGNvbnRleHQgaXMgd2VidmlldyhjaHJvbWVkcml2ZXIpLCB0aGVuIHJldHVybiBDSFJPTUVfTk9fUFJPWFkgbGlzdFxuICAgICAgdGhpcy5qd3BQcm94eUF2b2lkID0gQ0hST01FX05PX1BST1hZO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmp3cFByb3h5QXZvaWQgPSBOT19QUk9YWTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0cy5uYXRpdmVXZWJTY3JlZW5zaG90KSB7XG4gICAgICB0aGlzLmp3cFByb3h5QXZvaWQgPSBbLi4udGhpcy5qd3BQcm94eUF2b2lkLCBbJ0dFVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9zY3JlZW5zaG90JyldXTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5qd3BQcm94eUF2b2lkO1xuICB9XG5cbiAgZ2V0IGlzQ2hyb21lU2Vzc2lvbiAoKSB7XG4gICAgcmV0dXJuIGhlbHBlcnMuaXNDaHJvbWVCcm93c2VyKHRoaXMub3B0cy5icm93c2VyTmFtZSk7XG4gIH1cbn1cblxuLy8gZmlyc3QgYWRkIHRoZSBhbmRyb2lkLWRyaXZlciBjb21tYW5kcyB3aGljaCB3ZSB3aWxsIGZhbGwgYmFjayB0b1xuZm9yIChsZXQgW2NtZCwgZm5dIG9mIF8udG9QYWlycyhhbmRyb2lkQ29tbWFuZHMpKSB7XG4gIEFuZHJvaWRVaWF1dG9tYXRvcjJEcml2ZXIucHJvdG90eXBlW2NtZF0gPSBmbjtcbn1cblxuLy8gdGhlbiBvdmVyd3JpdGUgd2l0aCBhbnkgdWlhdXRvbWF0b3IyLXNwZWNpZmljIGNvbW1hbmRzXG5mb3IgKGxldCBbY21kLCBmbl0gb2YgXy50b1BhaXJzKGNvbW1hbmRzKSkge1xuICBBbmRyb2lkVWlhdXRvbWF0b3IyRHJpdmVyLnByb3RvdHlwZVtjbWRdID0gZm47XG59XG5cbmV4cG9ydCB7IEFuZHJvaWRVaWF1dG9tYXRvcjJEcml2ZXIgfTtcbmV4cG9ydCBkZWZhdWx0IEFuZHJvaWRVaWF1dG9tYXRvcjJEcml2ZXI7XG4iXSwiZmlsZSI6ImxpYi9kcml2ZXIuanMiLCJzb3VyY2VSb290IjoiLi4vLi4ifQ==
