"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.EspressoDriver = void 0;

require("source-map-support/register");

var _lodash = _interopRequireDefault(require("lodash"));

var _appiumBaseDriver = require("appium-base-driver");

var _espressoRunner = require("./espresso-runner");

var _appiumSupport = require("appium-support");

var _logger = _interopRequireDefault(require("./logger"));

var _commands = _interopRequireDefault(require("./commands"));

var _appiumAdb = require("appium-adb");

var _appiumAndroidDriver = require("appium-android-driver");

var _desiredCaps = _interopRequireDefault(require("./desired-caps"));

var _package = require("../../package.json");

var _portscanner = require("portscanner");

var _asyncbox = require("asyncbox");

var _utils = require("./utils");

const helpers = _appiumAndroidDriver.androidHelpers;
const SYSTEM_PORT_RANGE = [8300, 8399];
const DEVICE_PORT = 6791;
const NO_PROXY = [['GET', new RegExp('^/session/(?!.*/)')], ['GET', new RegExp('^/session/[^/]+/appium/device/current_activity')], ['GET', new RegExp('^/session/[^/]+/appium/device/current_package')], ['GET', new RegExp('^/session/[^/]+/appium/device/display_density')], ['GET', new RegExp('^/session/[^/]+/appium/device/is_keyboard_shown')], ['GET', new RegExp('^/session/[^/]+/appium/device/system_bars')], ['GET', new RegExp('^/session/[^/]+/appium/device/system_time')], ['GET', new RegExp('^/session/[^/]+/appium/settings')], ['GET', new RegExp('^/session/[^/]+/context')], ['GET', new RegExp('^/session/[^/]+/contexts')], ['GET', new RegExp('^/session/[^/]+/ime/[^/]+')], ['GET', new RegExp('^/session/[^/]+/log/types')], ['GET', new RegExp('^/session/[^/]+/network_connection')], ['GET', new RegExp('^/session/[^/]+/timeouts')], ['GET', new RegExp('^/session/[^/]+/url')], ['POST', new RegExp('^/session/[^/]+/appium/app/background')], ['POST', new RegExp('^/session/[^/]+/appium/app/close')], ['POST', new RegExp('^/session/[^/]+/appium/app/launch')], ['POST', new RegExp('^/session/[^/]+/appium/app/reset')], ['POST', new RegExp('^/session/[^/]+/appium/app/strings')], ['POST', new RegExp('^/session/[^/]+/appium/compare_images')], ['POST', new RegExp('^/session/[^/]+/appium/device/activate_app')], ['POST', new RegExp('^/session/[^/]+/appium/device/app_installed')], ['POST', new RegExp('^/session/[^/]+/appium/device/app_state')], ['POST', new RegExp('^/session/[^/]+/appium/device/get_clipboard')], ['POST', new RegExp('^/session/[^/]+/appium/device/install_app')], ['POST', new RegExp('^/session/[^/]+/appium/device/is_locked')], ['POST', new RegExp('^/session/[^/]+/appium/device/lock')], ['POST', new RegExp('^/session/[^/]+/appium/device/pull_file')], ['POST', new RegExp('^/session/[^/]+/appium/device/pull_folder')], ['POST', new RegExp('^/session/[^/]+/appium/device/push_file')], ['POST', new RegExp('^/session/[^/]+/appium/device/remove_app')], ['POST', new RegExp('^/session/[^/]+/appium/device/start_activity')], ['POST', new RegExp('^/session/[^/]+/appium/device/terminate_app')], ['POST', new RegExp('^/session/[^/]+/appium/device/unlock')], ['POST', new RegExp('^/session/[^/]+/appium/getPerformanceData')], ['POST', new RegExp('^/session/[^/]+/appium/performanceData/types')], ['POST', new RegExp('^/session/[^/]+/appium/settings')], ['POST', new RegExp('^/session/[^/]+/appium/execute_driver')], ['POST', new RegExp('^/session/[^/]+/appium/start_recording_screen')], ['POST', new RegExp('^/session/[^/]+/appium/stop_recording_screen')], ['POST', new RegExp('^/session/[^/]+/context')], ['POST', new RegExp('^/session/[^/]+/execute')], ['POST', new RegExp('^/session/[^/]+/execute/async')], ['POST', new RegExp('^/session/[^/]+/execute/sync')], ['POST', new RegExp('^/session/[^/]+/execute_async')], ['POST', new RegExp('^/session/[^/]+/ime/[^/]+')], ['POST', new RegExp('^/session/[^/]+/location')], ['POST', new RegExp('^/session/[^/]+/log')], ['POST', new RegExp('^/session/[^/]+/network_connection')], ['POST', new RegExp('^/session/[^/]+/timeouts')], ['POST', new RegExp('^/session/[^/]+/url')]];
const APP_EXTENSION = '.apk';

class EspressoDriver extends _appiumBaseDriver.BaseDriver {
  constructor(opts = {}, shouldValidateCaps = true) {
    delete opts.shell;
    super(opts, shouldValidateCaps);
    this.locatorStrategies = ['id', 'class name', 'accessibility id'];
    this.desiredCapConstraints = _desiredCaps.default;
    this.espresso = null;
    this.jwpProxyActive = false;
    this.defaultIME = null;
    this.jwpProxyAvoid = NO_PROXY;
    this.apkStrings = {};
    this.chromedriver = null;
    this.sessionChromedrivers = {};
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
        desired: Object.assign({}, this.caps)
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
        if (this.opts.app) {
          _logger.default.warn(`
            'browserName' capability will be ignored.
            Chrome browser cannot be run in Espresso sessions because Espresso automation doesn't have permission to access Chrome.
          `);
        } else {
          _logger.default.errorAndThrow(`Chrome browser sessions cannot be run in Espresso because Espresso automation doesn't have permission to access Chrome`);
        }
      }

      if (this.opts.reboot) {
        this.setAvdFromCapabilities(caps);
        this.addWipeDataToAvdArgs();
      }

      if (this.opts.app) {
        this.opts.app = await this.helpers.configureApp(this.opts.app, APP_EXTENSION);
        await this.checkAppPresent();
      } else if (this.appOnDevice) {
        _logger.default.info(`App file was not listed, instead we're going to run ` + `${this.opts.appPackage} directly on the device`);

        await this.checkPackagePresent();
      }

      this.opts.systemPort = this.opts.systemPort || (await (0, _portscanner.findAPortNotInUse)(SYSTEM_PORT_RANGE[0], SYSTEM_PORT_RANGE[1]));
      this.opts.adbPort = this.opts.adbPort || _appiumAdb.DEFAULT_ADB_PORT;
      await this.startEspressoSession();
      return [sessionId, caps];
    } catch (e) {
      await this.deleteSession();
      e.message += '. Check https://github.com/appium/appium-espresso-driver#troubleshooting regarding advanced session startup troubleshooting.';

      if ((0, _appiumBaseDriver.isErrorType)(e, _appiumBaseDriver.errors.SessionNotCreatedError)) {
        throw e;
      }

      const err = new _appiumBaseDriver.errors.SessionNotCreatedError(e.message);
      err.stack = e.stack;
      throw err;
    }
  }

  get driverData() {
    return {};
  }

  isEmulator() {
    return !!this.opts.avd;
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

  addWipeDataToAvdArgs() {
    if (!this.opts.avdArgs) {
      this.opts.avdArgs = '-wipe-data';
    } else if (!this.opts.avdArgs.toLowerCase().includes('-wipe-data')) {
      this.opts.avdArgs += ' -wipe-data';
    }
  }

  async startEspressoSession() {
    _logger.default.info(`EspressoDriver version: ${_package.version}`);

    let {
      udid,
      emPort
    } = await helpers.getDeviceInfoFromCaps(this.opts);
    this.opts.udid = udid;
    this.opts.emPort = emPort;
    this.adb = await _appiumAndroidDriver.androidHelpers.createADB(this.opts);

    if ((await this.adb.getApiLevel()) >= 28) {
      _logger.default.warn('Relaxing hidden api policy');

      await this.adb.setHiddenApiPolicy('1');
    }

    let appInfo = await helpers.getLaunchInfo(this.adb, this.opts);

    if (appInfo) {
      Object.assign(this.opts, appInfo);
    } else {
      appInfo = this.opts;
    }

    await helpers.initDevice(this.adb, this.opts);

    if (await this.adb.isAnimationOn()) {
      try {
        await this.adb.setAnimationState(false);
        this.wasAnimationEnabled = true;
      } catch (err) {
        _logger.default.warn(`Unable to turn off animations: ${err.message}`);
      }
    }

    this.caps.deviceName = this.adb.curDeviceId;
    this.caps.deviceUDID = this.opts.udid;
    this.initEspressoServer();

    _logger.default.debug(`Forwarding Espresso Server port ${DEVICE_PORT} to ${this.opts.systemPort}`);

    await this.adb.forwardPort(this.opts.systemPort, DEVICE_PORT);

    if (!this.opts.skipUnlock) {
      await helpers.unlock(this, this.adb, this.caps);
    } else {
      _logger.default.debug(`'skipUnlock' capability set, so skipping device unlock`);
    }

    if (this.opts.autoLaunch) {
      await this.initAUT();
    }

    if (!this.caps.appPackage) {
      this.caps.appPackage = appInfo.appPackage;
    }

    if (!this.caps.appWaitPackage) {
      this.caps.appWaitPackage = appInfo.appWaitPackage || appInfo.appPackage || this.caps.appPackage;
    }

    if (this.caps.appActivity) {
      this.caps.appActivity = (0, _utils.qualifyActivityName)(this.caps.appActivity, this.caps.appPackage);
    } else {
      this.caps.appActivity = (0, _utils.qualifyActivityName)(appInfo.appActivity, this.caps.appPackage);
    }

    if (this.caps.appWaitActivity) {
      this.caps.appWaitActivity = (0, _utils.qualifyActivityName)(this.caps.appWaitActivity, this.caps.appWaitPackage);
    } else {
      this.caps.appWaitActivity = (0, _utils.qualifyActivityName)(appInfo.appWaitActivity || appInfo.appActivity || this.caps.appActivity, this.caps.appWaitPackage);
    }

    await this.espresso.startSession(this.caps);
    await this.adb.waitForActivity(this.caps.appWaitPackage, this.caps.appWaitActivity, this.opts.appWaitDuration);

    if (this.opts.autoWebview) {
      await this.initWebview();
    }

    this.jwpProxyActive = true;
    await this.addDeviceInfoToCaps();
  }

  async initWebview() {
    const viewName = _appiumAndroidDriver.androidCommands.defaultWebviewName.call(this);

    const timeout = this.opts.autoWebviewTimeout || 2000;

    _logger.default.info(`Setting webview to context '${viewName}' with timeout ${timeout}ms`);

    await (0, _asyncbox.retryInterval)(timeout / 500, 500, this.setContext.bind(this), viewName);
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

  initEspressoServer() {
    this.espresso = new _espressoRunner.EspressoRunner({
      host: this.opts.remoteAdbHost || this.opts.host || 'localhost',
      systemPort: this.opts.systemPort,
      devicePort: DEVICE_PORT,
      adb: this.adb,
      apk: this.opts.app,
      tmpDir: this.opts.tmpDir,
      appPackage: this.opts.appPackage,
      appActivity: this.opts.appActivity,
      forceEspressoRebuild: !!this.opts.forceEspressoRebuild,
      espressoBuildConfig: this.opts.espressoBuildConfig,
      showGradleLog: !!this.opts.showGradleLog,
      serverLaunchTimeout: this.opts.espressoServerLaunchTimeout,
      androidInstallTimeout: this.opts.androidInstallTimeout
    });
    this.proxyReqRes = this.espresso.proxyReqRes.bind(this.espresso);
  }

  async initAUT() {
    if (this.opts.uninstallOtherPackages) {
      await helpers.uninstallOtherPackages(this.adb, helpers.parseArray(this.opts.uninstallOtherPackages), [_appiumAndroidDriver.SETTINGS_HELPER_PKG_ID, _espressoRunner.TEST_APK_PKG]);
    }

    if (!this.opts.app) {
      if (this.opts.fullReset) {
        _logger.default.errorAndThrow('Full reset requires an app capability, use fastReset if app is not provided');
      }

      _logger.default.debug('No app capability. Assuming it is already on the device');

      if (this.opts.fastReset) {
        await helpers.resetApp(this.adb, this.opts);
      }
    }

    if (!this.opts.skipUninstall) {
      await this.adb.uninstallApk(this.opts.appPackage);
    }

    if (this.opts.app) {
      if (this.opts.noSign) {
        _logger.default.info('Skipping application signing because noSign capability is set to true. ' + 'Having the application under test with improper signature/non-signed will cause ' + 'Espresso automation startup failure.');
      } else if (!(await this.adb.checkApkCert(this.opts.app, this.opts.appPackage))) {
        await this.adb.sign(this.opts.app, this.opts.appPackage);
      }

      await helpers.installApk(this.adb, this.opts);
    }

    await this.espresso.installTestApk();
  }

  async deleteSession() {
    _logger.default.debug('Deleting espresso session');

    if (this.espresso) {
      if (this.jwpProxyActive) {
        await this.espresso.deleteSession();
      }

      this.espresso = null;
    }

    this.jwpProxyActive = false;

    if (this.adb) {
      if (this.wasAnimationEnabled) {
        try {
          await this.adb.setAnimationState(true);
        } catch (err) {
          _logger.default.warn(`Unable to reset animation: ${err.message}`);
        }
      }

      if (this.opts.unicodeKeyboard && this.opts.resetKeyboard && this.defaultIME) {
        _logger.default.debug(`Resetting IME to '${this.defaultIME}'`);

        await this.adb.setIME(this.defaultIME);
      }

      if (!this.isChromeSession && this.opts.appPackage && !this.opts.dontStopAppOnReset) {
        await this.adb.forceStop(this.opts.appPackage);
      }

      if (this.opts.fullReset && !this.opts.skipUninstall && !this.appOnDevice) {
        _logger.default.debug(`FULL_RESET set to 'true', Uninstalling '${this.opts.appPackage}'`);

        await this.adb.uninstallApk(this.opts.appPackage);
      }

      await this.adb.stopLogcat();

      if (this.opts.reboot) {
        let avdName = this.opts.avd.replace('@', '');

        _logger.default.debug(`closing emulator '${avdName}'`);

        await this.adb.killEmulator(avdName);
      }

      if ((await this.adb.getApiLevel()) >= 28) {
        _logger.default.info('Restoring hidden api policy to the device default configuration');

        await this.adb.setDefaultHiddenApiPolicy();
      }
    }

    await super.deleteSession();

    if (this.opts.systemPort !== undefined) {
      try {
        await this.adb.removePortForward(this.opts.systemPort);
      } catch (error) {
        _logger.default.warn(`Unable to remove port forward '${error.message}'`);
      }
    }
  }

  async checkAppPresent() {
    _logger.default.debug('Checking whether app is actually present');

    if (!(await _appiumSupport.fs.exists(this.opts.app))) {
      _logger.default.errorAndThrow(`Could not find app apk at '${this.opts.app}'`);
    }
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
    this.jwpProxyAvoid = NO_PROXY;

    if (this.opts.nativeWebScreenshot) {
      this.jwpProxyAvoid = [...this.jwpProxyAvoid, ['GET', new RegExp('^/session/[^/]+/screenshot')]];
    }

    return this.jwpProxyAvoid;
  }

  get isChromeSession() {
    return helpers.isChromeBrowser(this.opts.browserName);
  }

}

exports.EspressoDriver = EspressoDriver;

for (let [cmd, fn] of _lodash.default.toPairs(_appiumAndroidDriver.androidCommands)) {
  if (!_lodash.default.includes(['defaultWebviewName'], cmd)) {
    EspressoDriver.prototype[cmd] = fn;
  }
}

for (let [cmd, fn] of _lodash.default.toPairs(_commands.default)) {
  EspressoDriver.prototype[cmd] = fn;
}

var _default = EspressoDriver;
exports.default = _default;require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9kcml2ZXIuanMiXSwibmFtZXMiOlsiaGVscGVycyIsImFuZHJvaWRIZWxwZXJzIiwiU1lTVEVNX1BPUlRfUkFOR0UiLCJERVZJQ0VfUE9SVCIsIk5PX1BST1hZIiwiUmVnRXhwIiwiQVBQX0VYVEVOU0lPTiIsIkVzcHJlc3NvRHJpdmVyIiwiQmFzZURyaXZlciIsImNvbnN0cnVjdG9yIiwib3B0cyIsInNob3VsZFZhbGlkYXRlQ2FwcyIsInNoZWxsIiwibG9jYXRvclN0cmF0ZWdpZXMiLCJkZXNpcmVkQ2FwQ29uc3RyYWludHMiLCJlc3ByZXNzbyIsImp3cFByb3h5QWN0aXZlIiwiZGVmYXVsdElNRSIsImp3cFByb3h5QXZvaWQiLCJhcGtTdHJpbmdzIiwiY2hyb21lZHJpdmVyIiwic2Vzc2lvbkNocm9tZWRyaXZlcnMiLCJjcmVhdGVTZXNzaW9uIiwiYXJncyIsInNlc3Npb25JZCIsImNhcHMiLCJzZXJ2ZXJEZXRhaWxzIiwicGxhdGZvcm0iLCJ3ZWJTdG9yYWdlRW5hYmxlZCIsInRha2VzU2NyZWVuc2hvdCIsImphdmFzY3JpcHRFbmFibGVkIiwiZGF0YWJhc2VFbmFibGVkIiwibmV0d29ya0Nvbm5lY3Rpb25FbmFibGVkIiwibG9jYXRpb25Db250ZXh0RW5hYmxlZCIsIndhcm5pbmdzIiwiZGVzaXJlZCIsIk9iamVjdCIsImFzc2lnbiIsImN1ckNvbnRleHQiLCJkZWZhdWx0Q29udGV4dE5hbWUiLCJkZWZhdWx0T3B0cyIsImZ1bGxSZXNldCIsImF1dG9MYXVuY2giLCJhZGJQb3J0IiwiREVGQVVMVF9BREJfUE9SVCIsImFuZHJvaWRJbnN0YWxsVGltZW91dCIsIl8iLCJkZWZhdWx0cyIsImlzQ2hyb21lU2Vzc2lvbiIsImFwcCIsImxvZ2dlciIsIndhcm4iLCJlcnJvckFuZFRocm93IiwicmVib290Iiwic2V0QXZkRnJvbUNhcGFiaWxpdGllcyIsImFkZFdpcGVEYXRhVG9BdmRBcmdzIiwiY29uZmlndXJlQXBwIiwiY2hlY2tBcHBQcmVzZW50IiwiYXBwT25EZXZpY2UiLCJpbmZvIiwiYXBwUGFja2FnZSIsImNoZWNrUGFja2FnZVByZXNlbnQiLCJzeXN0ZW1Qb3J0Iiwic3RhcnRFc3ByZXNzb1Nlc3Npb24iLCJlIiwiZGVsZXRlU2Vzc2lvbiIsIm1lc3NhZ2UiLCJlcnJvcnMiLCJTZXNzaW9uTm90Q3JlYXRlZEVycm9yIiwiZXJyIiwic3RhY2siLCJkcml2ZXJEYXRhIiwiaXNFbXVsYXRvciIsImF2ZCIsImRldmljZU5hbWUiLCJwbGF0Zm9ybVZlcnNpb24iLCJhdmREZXZpY2UiLCJyZXBsYWNlIiwiYXZkQXJncyIsInRvTG93ZXJDYXNlIiwiaW5jbHVkZXMiLCJ2ZXJzaW9uIiwidWRpZCIsImVtUG9ydCIsImdldERldmljZUluZm9Gcm9tQ2FwcyIsImFkYiIsImNyZWF0ZUFEQiIsImdldEFwaUxldmVsIiwic2V0SGlkZGVuQXBpUG9saWN5IiwiYXBwSW5mbyIsImdldExhdW5jaEluZm8iLCJpbml0RGV2aWNlIiwiaXNBbmltYXRpb25PbiIsInNldEFuaW1hdGlvblN0YXRlIiwid2FzQW5pbWF0aW9uRW5hYmxlZCIsImN1ckRldmljZUlkIiwiZGV2aWNlVURJRCIsImluaXRFc3ByZXNzb1NlcnZlciIsImRlYnVnIiwiZm9yd2FyZFBvcnQiLCJza2lwVW5sb2NrIiwidW5sb2NrIiwiaW5pdEFVVCIsImFwcFdhaXRQYWNrYWdlIiwiYXBwQWN0aXZpdHkiLCJhcHBXYWl0QWN0aXZpdHkiLCJzdGFydFNlc3Npb24iLCJ3YWl0Rm9yQWN0aXZpdHkiLCJhcHBXYWl0RHVyYXRpb24iLCJhdXRvV2VidmlldyIsImluaXRXZWJ2aWV3IiwiYWRkRGV2aWNlSW5mb1RvQ2FwcyIsInZpZXdOYW1lIiwiYW5kcm9pZENvbW1hbmRzIiwiZGVmYXVsdFdlYnZpZXdOYW1lIiwiY2FsbCIsInRpbWVvdXQiLCJhdXRvV2Vidmlld1RpbWVvdXQiLCJzZXRDb250ZXh0IiwiYmluZCIsImFwaVZlcnNpb24iLCJtYW51ZmFjdHVyZXIiLCJtb2RlbCIsInJlYWxEaXNwbGF5U2l6ZSIsImRpc3BsYXlEZW5zaXR5IiwibW9iaWxlR2V0RGV2aWNlSW5mbyIsImRldmljZUFwaUxldmVsIiwicGFyc2VJbnQiLCJkZXZpY2VTY3JlZW5TaXplIiwiZGV2aWNlU2NyZWVuRGVuc2l0eSIsImRldmljZU1vZGVsIiwiZGV2aWNlTWFudWZhY3R1cmVyIiwiRXNwcmVzc29SdW5uZXIiLCJob3N0IiwicmVtb3RlQWRiSG9zdCIsImRldmljZVBvcnQiLCJhcGsiLCJ0bXBEaXIiLCJmb3JjZUVzcHJlc3NvUmVidWlsZCIsImVzcHJlc3NvQnVpbGRDb25maWciLCJzaG93R3JhZGxlTG9nIiwic2VydmVyTGF1bmNoVGltZW91dCIsImVzcHJlc3NvU2VydmVyTGF1bmNoVGltZW91dCIsInByb3h5UmVxUmVzIiwidW5pbnN0YWxsT3RoZXJQYWNrYWdlcyIsInBhcnNlQXJyYXkiLCJTRVRUSU5HU19IRUxQRVJfUEtHX0lEIiwiVEVTVF9BUEtfUEtHIiwiZmFzdFJlc2V0IiwicmVzZXRBcHAiLCJza2lwVW5pbnN0YWxsIiwidW5pbnN0YWxsQXBrIiwibm9TaWduIiwiY2hlY2tBcGtDZXJ0Iiwic2lnbiIsImluc3RhbGxBcGsiLCJpbnN0YWxsVGVzdEFwayIsInVuaWNvZGVLZXlib2FyZCIsInJlc2V0S2V5Ym9hcmQiLCJzZXRJTUUiLCJkb250U3RvcEFwcE9uUmVzZXQiLCJmb3JjZVN0b3AiLCJzdG9wTG9nY2F0IiwiYXZkTmFtZSIsImtpbGxFbXVsYXRvciIsInNldERlZmF1bHRIaWRkZW5BcGlQb2xpY3kiLCJ1bmRlZmluZWQiLCJyZW1vdmVQb3J0Rm9yd2FyZCIsImVycm9yIiwiZnMiLCJleGlzdHMiLCJwcm94eUFjdGl2ZSIsImNhblByb3h5IiwiZ2V0UHJveHlBdm9pZExpc3QiLCJuYXRpdmVXZWJTY3JlZW5zaG90IiwiaXNDaHJvbWVCcm93c2VyIiwiYnJvd3Nlck5hbWUiLCJjbWQiLCJmbiIsInRvUGFpcnMiLCJwcm90b3R5cGUiLCJjb21tYW5kcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7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QUEsY0FBYyxDQUFDNkssU0FBZixDQUF5QkgsR0FBekIsSUFBZ0NDLEVBQWhDO0FBQ0Q7QUFDRjs7QUFHRCxLQUFLLElBQUksQ0FBQ0QsR0FBRCxFQUFNQyxFQUFOLENBQVQsSUFBc0JwSSxnQkFBRXFJLE9BQUYsQ0FBVUUsaUJBQVYsQ0FBdEIsRUFBMkM7QUFDekM5SyxFQUFBQSxjQUFjLENBQUM2SyxTQUFmLENBQXlCSCxHQUF6QixJQUFnQ0MsRUFBaEM7QUFDRDs7ZUFHYzNLLGMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHsgQmFzZURyaXZlciwgZXJyb3JzLCBpc0Vycm9yVHlwZSB9IGZyb20gJ2FwcGl1bS1iYXNlLWRyaXZlcic7XG5pbXBvcnQgeyBFc3ByZXNzb1J1bm5lciwgVEVTVF9BUEtfUEtHIH0gZnJvbSAnLi9lc3ByZXNzby1ydW5uZXInO1xuaW1wb3J0IHsgZnMgfSBmcm9tICdhcHBpdW0tc3VwcG9ydCc7XG5pbXBvcnQgbG9nZ2VyIGZyb20gJy4vbG9nZ2VyJztcbmltcG9ydCBjb21tYW5kcyBmcm9tICcuL2NvbW1hbmRzJztcbmltcG9ydCB7IERFRkFVTFRfQURCX1BPUlQgfSBmcm9tICdhcHBpdW0tYWRiJztcbmltcG9ydCB7IGFuZHJvaWRIZWxwZXJzLCBhbmRyb2lkQ29tbWFuZHMsIFNFVFRJTkdTX0hFTFBFUl9QS0dfSUQgfSBmcm9tICdhcHBpdW0tYW5kcm9pZC1kcml2ZXInO1xuaW1wb3J0IGRlc2lyZWRDYXBDb25zdHJhaW50cyBmcm9tICcuL2Rlc2lyZWQtY2Fwcyc7XG5pbXBvcnQgeyB2ZXJzaW9uIH0gZnJvbSAnLi4vLi4vcGFja2FnZS5qc29uJzsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBpbXBvcnQvbm8tdW5yZXNvbHZlZFxuaW1wb3J0IHsgZmluZEFQb3J0Tm90SW5Vc2UgfSBmcm9tICdwb3J0c2Nhbm5lcic7XG5pbXBvcnQgeyByZXRyeUludGVydmFsIH0gZnJvbSAnYXN5bmNib3gnO1xuaW1wb3J0IHsgcXVhbGlmeUFjdGl2aXR5TmFtZSB9IGZyb20gJy4vdXRpbHMnO1xuXG5cbi8vIFRPRE8gbWVyZ2Ugb3VyIG93biBoZWxwZXJzIG9udG8gdGhpcyBsYXRlclxuY29uc3QgaGVscGVycyA9IGFuZHJvaWRIZWxwZXJzO1xuXG4vLyBUaGUgcmFuZ2Ugb2YgcG9ydHMgd2UgY2FuIHVzZSBvbiB0aGUgc3lzdGVtIGZvciBjb21tdW5pY2F0aW5nIHRvIHRoZVxuLy8gRXNwcmVzc28gSFRUUCBzZXJ2ZXIgb24gdGhlIGRldmljZVxuY29uc3QgU1lTVEVNX1BPUlRfUkFOR0UgPSBbODMwMCwgODM5OV07XG5cbi8vIFRoaXMgaXMgdGhlIHBvcnQgdGhhdCB0aGUgZXNwcmVzc28gc2VydmVyIGxpc3RlbnMgdG8gb24gdGhlIGRldmljZS4gV2Ugd2lsbFxuLy8gZm9yd2FyZCBvbmUgb2YgdGhlIHBvcnRzIGFib3ZlIG9uIHRoZSBzeXN0ZW0gdG8gdGhpcyBwb3J0IG9uIHRoZSBkZXZpY2UuXG5jb25zdCBERVZJQ0VfUE9SVCA9IDY3OTE7XG5cbi8vIE5PX1BST1hZIGNvbnRhaW5zIHRoZSBwYXRocyB0aGF0IHdlIG5ldmVyIHdhbnQgdG8gcHJveHkgdG8gZXNwcmVzc28gc2VydmVyLlxuLy8gVE9ETzogIEFkZCB0aGUgbGlzdCBvZiBwYXRocyB0aGF0IHdlIG5ldmVyIHdhbnQgdG8gcHJveHkgdG8gZXNwcmVzc28gc2VydmVyLlxuLy8gVE9ETzogTmVlZCB0byBzZWdyZWdhdGUgdGhlIHBhdGhzIGJldHRlciB3YXkgdXNpbmcgcmVndWxhciBleHByZXNzaW9ucyB3aGVyZXZlciBhcHBsaWNhYmxlLlxuLy8gKE5vdCBzZWdyZWdhdGluZyByaWdodCBhd2F5IGJlY2F1c2UgbW9yZSBwYXRocyB0byBiZSBhZGRlZCBpbiB0aGUgTk9fUFJPWFkgbGlzdClcbmNvbnN0IE5PX1BST1hZID0gW1xuICBbJ0dFVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi8oPyEuKi8pJyldLFxuICBbJ0dFVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9hcHBpdW0vZGV2aWNlL2N1cnJlbnRfYWN0aXZpdHknKV0sXG4gIFsnR0VUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2FwcGl1bS9kZXZpY2UvY3VycmVudF9wYWNrYWdlJyldLFxuICBbJ0dFVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9hcHBpdW0vZGV2aWNlL2Rpc3BsYXlfZGVuc2l0eScpXSxcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL2RldmljZS9pc19rZXlib2FyZF9zaG93bicpXSxcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL2RldmljZS9zeXN0ZW1fYmFycycpXSxcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL2RldmljZS9zeXN0ZW1fdGltZScpXSxcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL3NldHRpbmdzJyldLFxuICBbJ0dFVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9jb250ZXh0JyldLFxuICBbJ0dFVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9jb250ZXh0cycpXSxcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvaW1lL1teL10rJyldLFxuICBbJ0dFVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9sb2cvdHlwZXMnKV0sXG4gIFsnR0VUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL25ldHdvcmtfY29ubmVjdGlvbicpXSxcbiAgWydHRVQnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvdGltZW91dHMnKV0sXG4gIFsnR0VUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL3VybCcpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2FwcGl1bS9hcHAvYmFja2dyb3VuZCcpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2FwcGl1bS9hcHAvY2xvc2UnKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9hcHBpdW0vYXBwL2xhdW5jaCcpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2FwcGl1bS9hcHAvcmVzZXQnKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9hcHBpdW0vYXBwL3N0cmluZ3MnKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9hcHBpdW0vY29tcGFyZV9pbWFnZXMnKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9hcHBpdW0vZGV2aWNlL2FjdGl2YXRlX2FwcCcpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2FwcGl1bS9kZXZpY2UvYXBwX2luc3RhbGxlZCcpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2FwcGl1bS9kZXZpY2UvYXBwX3N0YXRlJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL2RldmljZS9nZXRfY2xpcGJvYXJkJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL2RldmljZS9pbnN0YWxsX2FwcCcpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2FwcGl1bS9kZXZpY2UvaXNfbG9ja2VkJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL2RldmljZS9sb2NrJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL2RldmljZS9wdWxsX2ZpbGUnKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9hcHBpdW0vZGV2aWNlL3B1bGxfZm9sZGVyJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL2RldmljZS9wdXNoX2ZpbGUnKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9hcHBpdW0vZGV2aWNlL3JlbW92ZV9hcHAnKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9hcHBpdW0vZGV2aWNlL3N0YXJ0X2FjdGl2aXR5JyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL2RldmljZS90ZXJtaW5hdGVfYXBwJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL2RldmljZS91bmxvY2snKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9hcHBpdW0vZ2V0UGVyZm9ybWFuY2VEYXRhJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL3BlcmZvcm1hbmNlRGF0YS90eXBlcycpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2FwcGl1bS9zZXR0aW5ncycpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2FwcGl1bS9leGVjdXRlX2RyaXZlcicpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2FwcGl1bS9zdGFydF9yZWNvcmRpbmdfc2NyZWVuJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvYXBwaXVtL3N0b3BfcmVjb3JkaW5nX3NjcmVlbicpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2NvbnRleHQnKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9leGVjdXRlJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvZXhlY3V0ZS9hc3luYycpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2V4ZWN1dGUvc3luYycpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2V4ZWN1dGVfYXN5bmMnKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9pbWUvW14vXSsnKV0sXG4gIFsnUE9TVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9sb2NhdGlvbicpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL2xvZycpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL25ldHdvcmtfY29ubmVjdGlvbicpXSxcbiAgWydQT1NUJywgbmV3IFJlZ0V4cCgnXi9zZXNzaW9uL1teL10rL3RpbWVvdXRzJyldLFxuICBbJ1BPU1QnLCBuZXcgUmVnRXhwKCdeL3Nlc3Npb24vW14vXSsvdXJsJyldLFxuXTtcblxuY29uc3QgQVBQX0VYVEVOU0lPTiA9ICcuYXBrJztcblxuXG5jbGFzcyBFc3ByZXNzb0RyaXZlciBleHRlbmRzIEJhc2VEcml2ZXIge1xuICBjb25zdHJ1Y3RvciAob3B0cyA9IHt9LCBzaG91bGRWYWxpZGF0ZUNhcHMgPSB0cnVlKSB7XG4gICAgLy8gYHNoZWxsYCBvdmVyd3JpdGVzIGFkYi5zaGVsbCwgc28gcmVtb3ZlXG4gICAgZGVsZXRlIG9wdHMuc2hlbGw7XG5cbiAgICBzdXBlcihvcHRzLCBzaG91bGRWYWxpZGF0ZUNhcHMpO1xuICAgIHRoaXMubG9jYXRvclN0cmF0ZWdpZXMgPSBbXG4gICAgICAnaWQnLFxuICAgICAgJ2NsYXNzIG5hbWUnLFxuICAgICAgJ2FjY2Vzc2liaWxpdHkgaWQnLFxuICAgIF07XG4gICAgdGhpcy5kZXNpcmVkQ2FwQ29uc3RyYWludHMgPSBkZXNpcmVkQ2FwQ29uc3RyYWludHM7XG4gICAgdGhpcy5lc3ByZXNzbyA9IG51bGw7XG4gICAgdGhpcy5qd3BQcm94eUFjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMuZGVmYXVsdElNRSA9IG51bGw7XG4gICAgdGhpcy5qd3BQcm94eUF2b2lkID0gTk9fUFJPWFk7XG5cbiAgICB0aGlzLmFwa1N0cmluZ3MgPSB7fTsgLy8gbWFwIG9mIGxhbmd1YWdlIC0+IHN0cmluZ3Mgb2JqXG5cbiAgICB0aGlzLmNocm9tZWRyaXZlciA9IG51bGw7XG4gICAgdGhpcy5zZXNzaW9uQ2hyb21lZHJpdmVycyA9IHt9O1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlU2Vzc2lvbiAoLi4uYXJncykge1xuICAgIHRyeSB7XG4gICAgICAvLyBUT0RPIGhhbmRsZSBvdGhlclNlc3Npb25EYXRhIGZvciBtdWx0aXBsZSBzZXNzaW9uc1xuICAgICAgbGV0IFtzZXNzaW9uSWQsIGNhcHNdID0gYXdhaXQgc3VwZXIuY3JlYXRlU2Vzc2lvbiguLi5hcmdzKTtcblxuICAgICAgbGV0IHNlcnZlckRldGFpbHMgPSB7XG4gICAgICAgIHBsYXRmb3JtOiAnTElOVVgnLFxuICAgICAgICB3ZWJTdG9yYWdlRW5hYmxlZDogZmFsc2UsXG4gICAgICAgIHRha2VzU2NyZWVuc2hvdDogdHJ1ZSxcbiAgICAgICAgamF2YXNjcmlwdEVuYWJsZWQ6IHRydWUsXG4gICAgICAgIGRhdGFiYXNlRW5hYmxlZDogZmFsc2UsXG4gICAgICAgIG5ldHdvcmtDb25uZWN0aW9uRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgbG9jYXRpb25Db250ZXh0RW5hYmxlZDogZmFsc2UsXG4gICAgICAgIHdhcm5pbmdzOiB7fSxcbiAgICAgICAgZGVzaXJlZDogT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5jYXBzKVxuICAgICAgfTtcblxuICAgICAgdGhpcy5jYXBzID0gT2JqZWN0LmFzc2lnbihzZXJ2ZXJEZXRhaWxzLCB0aGlzLmNhcHMpO1xuXG4gICAgICB0aGlzLmN1ckNvbnRleHQgPSB0aGlzLmRlZmF1bHRDb250ZXh0TmFtZSgpO1xuXG4gICAgICBsZXQgZGVmYXVsdE9wdHMgPSB7XG4gICAgICAgIGZ1bGxSZXNldDogZmFsc2UsXG4gICAgICAgIGF1dG9MYXVuY2g6IHRydWUsXG4gICAgICAgIGFkYlBvcnQ6IERFRkFVTFRfQURCX1BPUlQsXG4gICAgICAgIGFuZHJvaWRJbnN0YWxsVGltZW91dDogOTAwMDBcbiAgICAgIH07XG4gICAgICBfLmRlZmF1bHRzKHRoaXMub3B0cywgZGVmYXVsdE9wdHMpO1xuXG4gICAgICBpZiAodGhpcy5pc0Nocm9tZVNlc3Npb24pIHtcbiAgICAgICAgaWYgKHRoaXMub3B0cy5hcHApIHtcbiAgICAgICAgICBsb2dnZXIud2FybihgXG4gICAgICAgICAgICAnYnJvd3Nlck5hbWUnIGNhcGFiaWxpdHkgd2lsbCBiZSBpZ25vcmVkLlxuICAgICAgICAgICAgQ2hyb21lIGJyb3dzZXIgY2Fubm90IGJlIHJ1biBpbiBFc3ByZXNzbyBzZXNzaW9ucyBiZWNhdXNlIEVzcHJlc3NvIGF1dG9tYXRpb24gZG9lc24ndCBoYXZlIHBlcm1pc3Npb24gdG8gYWNjZXNzIENocm9tZS5cbiAgICAgICAgICBgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3JBbmRUaHJvdyhgQ2hyb21lIGJyb3dzZXIgc2Vzc2lvbnMgY2Fubm90IGJlIHJ1biBpbiBFc3ByZXNzbyBiZWNhdXNlIEVzcHJlc3NvIGF1dG9tYXRpb24gZG9lc24ndCBoYXZlIHBlcm1pc3Npb24gdG8gYWNjZXNzIENocm9tZWApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdHMucmVib290KSB7XG4gICAgICAgIHRoaXMuc2V0QXZkRnJvbUNhcGFiaWxpdGllcyhjYXBzKTtcbiAgICAgICAgdGhpcy5hZGRXaXBlRGF0YVRvQXZkQXJncygpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRzLmFwcCkge1xuICAgICAgICAvLyBmaW5kIGFuZCBjb3B5LCBvciBkb3dubG9hZCBhbmQgdW56aXAgYW4gYXBwIHVybCBvciBwYXRoXG4gICAgICAgIHRoaXMub3B0cy5hcHAgPSBhd2FpdCB0aGlzLmhlbHBlcnMuY29uZmlndXJlQXBwKHRoaXMub3B0cy5hcHAsIEFQUF9FWFRFTlNJT04pO1xuICAgICAgICBhd2FpdCB0aGlzLmNoZWNrQXBwUHJlc2VudCgpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmFwcE9uRGV2aWNlKSB7XG4gICAgICAgIC8vIHRoZSBhcHAgaXNuJ3QgYW4gYWN0dWFsIGFwcCBmaWxlIGJ1dCByYXRoZXIgc29tZXRoaW5nIHdlIHdhbnQgdG9cbiAgICAgICAgLy8gYXNzdW1lIGlzIG9uIHRoZSBkZXZpY2UgYW5kIGp1c3QgbGF1bmNoIHZpYSB0aGUgYXBwUGFja2FnZVxuICAgICAgICBsb2dnZXIuaW5mbyhgQXBwIGZpbGUgd2FzIG5vdCBsaXN0ZWQsIGluc3RlYWQgd2UncmUgZ29pbmcgdG8gcnVuIGAgK1xuICAgICAgICAgICAgYCR7dGhpcy5vcHRzLmFwcFBhY2thZ2V9IGRpcmVjdGx5IG9uIHRoZSBkZXZpY2VgKTtcbiAgICAgICAgYXdhaXQgdGhpcy5jaGVja1BhY2thZ2VQcmVzZW50KCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMub3B0cy5zeXN0ZW1Qb3J0ID0gdGhpcy5vcHRzLnN5c3RlbVBvcnQgfHwgYXdhaXQgZmluZEFQb3J0Tm90SW5Vc2UoU1lTVEVNX1BPUlRfUkFOR0VbMF0sIFNZU1RFTV9QT1JUX1JBTkdFWzFdKTtcbiAgICAgIHRoaXMub3B0cy5hZGJQb3J0ID0gdGhpcy5vcHRzLmFkYlBvcnQgfHwgREVGQVVMVF9BREJfUE9SVDtcbiAgICAgIGF3YWl0IHRoaXMuc3RhcnRFc3ByZXNzb1Nlc3Npb24oKTtcbiAgICAgIHJldHVybiBbc2Vzc2lvbklkLCBjYXBzXTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBhd2FpdCB0aGlzLmRlbGV0ZVNlc3Npb24oKTtcbiAgICAgIGUubWVzc2FnZSArPSAnLiBDaGVjayBodHRwczovL2dpdGh1Yi5jb20vYXBwaXVtL2FwcGl1bS1lc3ByZXNzby1kcml2ZXIjdHJvdWJsZXNob290aW5nIHJlZ2FyZGluZyBhZHZhbmNlZCBzZXNzaW9uIHN0YXJ0dXAgdHJvdWJsZXNob290aW5nLic7XG4gICAgICBpZiAoaXNFcnJvclR5cGUoZSwgZXJyb3JzLlNlc3Npb25Ob3RDcmVhdGVkRXJyb3IpKSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgICBjb25zdCBlcnIgPSBuZXcgZXJyb3JzLlNlc3Npb25Ob3RDcmVhdGVkRXJyb3IoZS5tZXNzYWdlKTtcbiAgICAgIGVyci5zdGFjayA9IGUuc3RhY2s7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9XG5cbiAgZ2V0IGRyaXZlckRhdGEgKCkge1xuICAgIC8vIFRPRE8gZmlsbGUgb3V0IHJlc291cmNlIGluZm8gaGVyZVxuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIGlzRW11bGF0b3IgKCkge1xuICAgIHJldHVybiAhIXRoaXMub3B0cy5hdmQ7XG4gIH1cblxuICAvLyBUT0RPIHRoaXMgbWV0aG9kIGlzIGR1cGxpY2F0ZWQgZnJvbSB1aWF1dG9tYXRvcjItZHJpdmVyOyBjb25zb2xpZGF0ZVxuICBzZXRBdmRGcm9tQ2FwYWJpbGl0aWVzIChjYXBzKSB7XG4gICAgaWYgKHRoaXMub3B0cy5hdmQpIHtcbiAgICAgIGxvZ2dlci5pbmZvKCdhdmQgbmFtZSBkZWZpbmVkLCBpZ25vcmluZyBkZXZpY2UgbmFtZSBhbmQgcGxhdGZvcm0gdmVyc2lvbicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWNhcHMuZGV2aWNlTmFtZSkge1xuICAgICAgICBsb2dnZXIuZXJyb3JBbmRUaHJvdygnYXZkIG9yIGRldmljZU5hbWUgc2hvdWxkIGJlIHNwZWNpZmllZCB3aGVuIHJlYm9vdCBvcHRpb24gaXMgZW5hYmxlcycpO1xuICAgICAgfVxuICAgICAgaWYgKCFjYXBzLnBsYXRmb3JtVmVyc2lvbikge1xuICAgICAgICBsb2dnZXIuZXJyb3JBbmRUaHJvdygnYXZkIG9yIHBsYXRmb3JtVmVyc2lvbiBzaG91bGQgYmUgc3BlY2lmaWVkIHdoZW4gcmVib290IG9wdGlvbiBpcyBlbmFibGVkJyk7XG4gICAgICB9XG4gICAgICBsZXQgYXZkRGV2aWNlID0gY2Fwcy5kZXZpY2VOYW1lLnJlcGxhY2UoL1teYS16QS1aMC05Xy5dL2csICctJyk7XG4gICAgICB0aGlzLm9wdHMuYXZkID0gYCR7YXZkRGV2aWNlfV9fJHtjYXBzLnBsYXRmb3JtVmVyc2lvbn1gO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRPRE8gdGhpcyBtZXRob2QgaXMgZHVwbGljYXRlZCBmcm9tIHVpYXV0b21hdG9yMi1kcml2ZXI7IGNvbnNvbGlkYXRlXG4gIGFkZFdpcGVEYXRhVG9BdmRBcmdzICgpIHtcbiAgICBpZiAoIXRoaXMub3B0cy5hdmRBcmdzKSB7XG4gICAgICB0aGlzLm9wdHMuYXZkQXJncyA9ICctd2lwZS1kYXRhJztcbiAgICB9IGVsc2UgaWYgKCF0aGlzLm9wdHMuYXZkQXJncy50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCctd2lwZS1kYXRhJykpIHtcbiAgICAgIHRoaXMub3B0cy5hdmRBcmdzICs9ICcgLXdpcGUtZGF0YSc7XG4gICAgfVxuICB9XG5cbiAgLy8gVE9ETyBtdWNoIG9mIHRoaXMgbG9naWMgaXMgZHVwbGljYXRlZCBmcm9tIHVpYXV0b21hdG9yMlxuICBhc3luYyBzdGFydEVzcHJlc3NvU2Vzc2lvbiAoKSB7XG4gICAgbG9nZ2VyLmluZm8oYEVzcHJlc3NvRHJpdmVyIHZlcnNpb246ICR7dmVyc2lvbn1gKTtcblxuICAgIC8vIGdldCBkZXZpY2UgdWRpZCBmb3IgdGhpcyBzZXNzaW9uXG4gICAgbGV0IHt1ZGlkLCBlbVBvcnR9ID0gYXdhaXQgaGVscGVycy5nZXREZXZpY2VJbmZvRnJvbUNhcHModGhpcy5vcHRzKTtcbiAgICB0aGlzLm9wdHMudWRpZCA9IHVkaWQ7XG4gICAgdGhpcy5vcHRzLmVtUG9ydCA9IGVtUG9ydDtcblxuICAgIC8vIG5vdyB0aGF0IHdlIGtub3cgb3VyIGphdmEgdmVyc2lvbiBhbmQgZGV2aWNlIGluZm8sIHdlIGNhbiBjcmVhdGUgb3VyXG4gICAgLy8gQURCIGluc3RhbmNlXG4gICAgdGhpcy5hZGIgPSBhd2FpdCBhbmRyb2lkSGVscGVycy5jcmVhdGVBREIodGhpcy5vcHRzKTtcblxuICAgIC8vIFJlYWQgaHR0cHM6Ly9naXRodWIuY29tL2FwcGl1bS9hcHBpdW0tYW5kcm9pZC1kcml2ZXIvcHVsbC80NjEgd2hhdCBoYXBwZW5zIGlmIHRoZXIgaXMgbm8gc2V0SGlkZGVuQXBpUG9saWN5IGZvciBBbmRyb2lkIFArXG4gICAgaWYgKGF3YWl0IHRoaXMuYWRiLmdldEFwaUxldmVsKCkgPj0gMjgpIHsgLy8gQW5kcm9pZCBQXG4gICAgICBsb2dnZXIud2FybignUmVsYXhpbmcgaGlkZGVuIGFwaSBwb2xpY3knKTtcbiAgICAgIGF3YWl0IHRoaXMuYWRiLnNldEhpZGRlbkFwaVBvbGljeSgnMScpO1xuICAgIH1cblxuICAgIC8vIGdldCBhcHBQYWNrYWdlIGV0IGFsIGZyb20gbWFuaWZlc3QgaWYgbmVjZXNzYXJ5XG4gICAgbGV0IGFwcEluZm8gPSBhd2FpdCBoZWxwZXJzLmdldExhdW5jaEluZm8odGhpcy5hZGIsIHRoaXMub3B0cyk7XG4gICAgaWYgKGFwcEluZm8pIHtcbiAgICAgIC8vIGFuZCBnZXQgaXQgb250byBvdXIgJ29wdHMnIG9iamVjdCBzbyB3ZSB1c2UgaXQgZnJvbSBub3cgb25cbiAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5vcHRzLCBhcHBJbmZvKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBwSW5mbyA9IHRoaXMub3B0cztcbiAgICB9XG5cbiAgICAvLyBzdGFydCBhbiBhdmQsIHNldCB0aGUgbGFuZ3VhZ2UvbG9jYWxlLCBwaWNrIGFuIGVtdWxhdG9yLCBldGMuLi5cbiAgICAvLyBUT0RPIHdpdGggbXVsdGlwbGUgZGV2aWNlcyB3ZSdsbCBuZWVkIHRvIHBhcmFtZXRlcml6ZSB0aGlzXG4gICAgYXdhaXQgaGVscGVycy5pbml0RGV2aWNlKHRoaXMuYWRiLCB0aGlzLm9wdHMpO1xuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hcHBpdW0vYXBwaXVtLWVzcHJlc3NvLWRyaXZlci9pc3N1ZXMvNzJcbiAgICBpZiAoYXdhaXQgdGhpcy5hZGIuaXNBbmltYXRpb25PbigpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLmFkYi5zZXRBbmltYXRpb25TdGF0ZShmYWxzZSk7XG4gICAgICAgIHRoaXMud2FzQW5pbWF0aW9uRW5hYmxlZCA9IHRydWU7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oYFVuYWJsZSB0byB0dXJuIG9mZiBhbmltYXRpb25zOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHNldCBhY3R1YWwgZGV2aWNlIG5hbWUsIHVkaWRcbiAgICB0aGlzLmNhcHMuZGV2aWNlTmFtZSA9IHRoaXMuYWRiLmN1ckRldmljZUlkO1xuICAgIHRoaXMuY2Fwcy5kZXZpY2VVRElEID0gdGhpcy5vcHRzLnVkaWQ7XG5cbiAgICAvLyBzZXQgdXAgdGhlIG1vZGlmaWVkIGVzcHJlc3NvIHNlcnZlciBldGNcbiAgICB0aGlzLmluaXRFc3ByZXNzb1NlcnZlcigpO1xuICAgIC8vIEZ1cnRoZXIgcHJlcGFyZSB0aGUgZGV2aWNlIGJ5IGZvcndhcmRpbmcgdGhlIGVzcHJlc3NvIHBvcnRcbiAgICBsb2dnZXIuZGVidWcoYEZvcndhcmRpbmcgRXNwcmVzc28gU2VydmVyIHBvcnQgJHtERVZJQ0VfUE9SVH0gdG8gJHt0aGlzLm9wdHMuc3lzdGVtUG9ydH1gKTtcbiAgICBhd2FpdCB0aGlzLmFkYi5mb3J3YXJkUG9ydCh0aGlzLm9wdHMuc3lzdGVtUG9ydCwgREVWSUNFX1BPUlQpO1xuXG4gICAgaWYgKCF0aGlzLm9wdHMuc2tpcFVubG9jaykge1xuICAgICAgLy8gdW5sb2NrIHRoZSBkZXZpY2UgdG8gcHJlcGFyZSBpdCBmb3IgdGVzdGluZ1xuICAgICAgYXdhaXQgaGVscGVycy51bmxvY2sodGhpcywgdGhpcy5hZGIsIHRoaXMuY2Fwcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZ2dlci5kZWJ1ZyhgJ3NraXBVbmxvY2snIGNhcGFiaWxpdHkgc2V0LCBzbyBza2lwcGluZyBkZXZpY2UgdW5sb2NrYCk7XG4gICAgfVxuICAgIC8vIElmIHRoZSB1c2VyIHNldHMgYXV0b0xhdW5jaCB0byBmYWxzZSwgdGhleSBhcmUgcmVzcG9uc2libGUgZm9yIGluaXRBVVQoKSBhbmQgc3RhcnRBVVQoKVxuICAgIGlmICh0aGlzLm9wdHMuYXV0b0xhdW5jaCkge1xuICAgICAgLy8gc2V0IHVwIGFwcCB1bmRlciB0ZXN0XG4gICAgICAvLyBwcmVwYXJlIG91ciBhY3R1YWwgQVVULCBnZXQgaXQgb24gdGhlIGRldmljZSwgZXRjLi4uXG4gICAgICBhd2FpdCB0aGlzLmluaXRBVVQoKTtcbiAgICB9XG4gICAgLy9BZGRpbmcgQVVUIHBhY2thZ2UgbmFtZSBpbiB0aGUgY2FwYWJpbGl0aWVzIGlmIHBhY2thZ2UgbmFtZSBub3QgZXhpc3QgaW4gY2Fwc1xuICAgIGlmICghdGhpcy5jYXBzLmFwcFBhY2thZ2UpIHtcbiAgICAgIHRoaXMuY2Fwcy5hcHBQYWNrYWdlID0gYXBwSW5mby5hcHBQYWNrYWdlO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuY2Fwcy5hcHBXYWl0UGFja2FnZSkge1xuICAgICAgdGhpcy5jYXBzLmFwcFdhaXRQYWNrYWdlID0gYXBwSW5mby5hcHBXYWl0UGFja2FnZSB8fCBhcHBJbmZvLmFwcFBhY2thZ2UgfHwgdGhpcy5jYXBzLmFwcFBhY2thZ2U7XG4gICAgfVxuICAgIGlmICh0aGlzLmNhcHMuYXBwQWN0aXZpdHkpIHtcbiAgICAgIHRoaXMuY2Fwcy5hcHBBY3Rpdml0eSA9IHF1YWxpZnlBY3Rpdml0eU5hbWUodGhpcy5jYXBzLmFwcEFjdGl2aXR5LCB0aGlzLmNhcHMuYXBwUGFja2FnZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY2Fwcy5hcHBBY3Rpdml0eSA9IHF1YWxpZnlBY3Rpdml0eU5hbWUoYXBwSW5mby5hcHBBY3Rpdml0eSwgdGhpcy5jYXBzLmFwcFBhY2thZ2UpO1xuICAgIH1cbiAgICBpZiAodGhpcy5jYXBzLmFwcFdhaXRBY3Rpdml0eSkge1xuICAgICAgdGhpcy5jYXBzLmFwcFdhaXRBY3Rpdml0eSA9IHF1YWxpZnlBY3Rpdml0eU5hbWUodGhpcy5jYXBzLmFwcFdhaXRBY3Rpdml0eSwgdGhpcy5jYXBzLmFwcFdhaXRQYWNrYWdlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jYXBzLmFwcFdhaXRBY3Rpdml0eSA9IHF1YWxpZnlBY3Rpdml0eU5hbWUoYXBwSW5mby5hcHBXYWl0QWN0aXZpdHkgfHwgYXBwSW5mby5hcHBBY3Rpdml0eSB8fCB0aGlzLmNhcHMuYXBwQWN0aXZpdHksXG4gICAgICAgIHRoaXMuY2Fwcy5hcHBXYWl0UGFja2FnZSk7XG4gICAgfVxuXG4gICAgLy8gbGF1bmNoIGVzcHJlc3NvIGFuZCB3YWl0IHRpbGwgaXRzIG9ubGluZSBhbmQgd2UgaGF2ZSBhIHNlc3Npb25cbiAgICBhd2FpdCB0aGlzLmVzcHJlc3NvLnN0YXJ0U2Vzc2lvbih0aGlzLmNhcHMpO1xuICAgIGF3YWl0IHRoaXMuYWRiLndhaXRGb3JBY3Rpdml0eSh0aGlzLmNhcHMuYXBwV2FpdFBhY2thZ2UsIHRoaXMuY2Fwcy5hcHBXYWl0QWN0aXZpdHksIHRoaXMub3B0cy5hcHBXYWl0RHVyYXRpb24pO1xuXG4gICAgLy8gaWYgd2Ugd2FudCB0byBpbW1lZGlhdGVseSBnZXQgaW50byBhIHdlYnZpZXcsIHNldCBvdXIgY29udGV4dFxuICAgIC8vIGFwcHJvcHJpYXRlbHlcbiAgICBpZiAodGhpcy5vcHRzLmF1dG9XZWJ2aWV3KSB7XG4gICAgICBhd2FpdCB0aGlzLmluaXRXZWJ2aWV3KCk7XG4gICAgfVxuXG4gICAgLy8gbm93IHRoYXQgZXZlcnl0aGluZyBoYXMgc3RhcnRlZCBzdWNjZXNzZnVsbHksIHR1cm4gb24gcHJveHlpbmcgc28gYWxsXG4gICAgLy8gc3Vic2VxdWVudCBzZXNzaW9uIHJlcXVlc3RzIGdvIHN0cmFpZ2h0IHRvL2Zyb20gZXNwcmVzc29cbiAgICB0aGlzLmp3cFByb3h5QWN0aXZlID0gdHJ1ZTtcblxuICAgIGF3YWl0IHRoaXMuYWRkRGV2aWNlSW5mb1RvQ2FwcygpO1xuICB9XG5cbiAgYXN5bmMgaW5pdFdlYnZpZXcgKCkge1xuICAgIGNvbnN0IHZpZXdOYW1lID0gYW5kcm9pZENvbW1hbmRzLmRlZmF1bHRXZWJ2aWV3TmFtZS5jYWxsKHRoaXMpO1xuICAgIGNvbnN0IHRpbWVvdXQgPSB0aGlzLm9wdHMuYXV0b1dlYnZpZXdUaW1lb3V0IHx8IDIwMDA7XG4gICAgbG9nZ2VyLmluZm8oYFNldHRpbmcgd2VidmlldyB0byBjb250ZXh0ICcke3ZpZXdOYW1lfScgd2l0aCB0aW1lb3V0ICR7dGltZW91dH1tc2ApO1xuICAgIGF3YWl0IHJldHJ5SW50ZXJ2YWwodGltZW91dCAvIDUwMCwgNTAwLCB0aGlzLnNldENvbnRleHQuYmluZCh0aGlzKSwgdmlld05hbWUpO1xuICB9XG5cbiAgYXN5bmMgYWRkRGV2aWNlSW5mb1RvQ2FwcyAoKSB7XG4gICAgY29uc3Qge1xuICAgICAgYXBpVmVyc2lvbixcbiAgICAgIHBsYXRmb3JtVmVyc2lvbixcbiAgICAgIG1hbnVmYWN0dXJlcixcbiAgICAgIG1vZGVsLFxuICAgICAgcmVhbERpc3BsYXlTaXplLFxuICAgICAgZGlzcGxheURlbnNpdHksXG4gICAgfSA9IGF3YWl0IHRoaXMubW9iaWxlR2V0RGV2aWNlSW5mbygpO1xuICAgIHRoaXMuY2Fwcy5kZXZpY2VBcGlMZXZlbCA9IHBhcnNlSW50KGFwaVZlcnNpb24sIDEwKTtcbiAgICB0aGlzLmNhcHMucGxhdGZvcm1WZXJzaW9uID0gcGxhdGZvcm1WZXJzaW9uO1xuICAgIHRoaXMuY2Fwcy5kZXZpY2VTY3JlZW5TaXplID0gcmVhbERpc3BsYXlTaXplO1xuICAgIHRoaXMuY2Fwcy5kZXZpY2VTY3JlZW5EZW5zaXR5ID0gZGlzcGxheURlbnNpdHk7XG4gICAgdGhpcy5jYXBzLmRldmljZU1vZGVsID0gbW9kZWw7XG4gICAgdGhpcy5jYXBzLmRldmljZU1hbnVmYWN0dXJlciA9IG1hbnVmYWN0dXJlcjtcbiAgfVxuXG4gIGluaXRFc3ByZXNzb1NlcnZlciAoKSB7XG4gICAgLy8gbm93IHRoYXQgd2UgaGF2ZSBwYWNrYWdlIGFuZCBhY3Rpdml0eSwgd2UgY2FuIGNyZWF0ZSBhbiBpbnN0YW5jZSBvZlxuICAgIC8vIGVzcHJlc3NvIHdpdGggdGhlIGFwcHJvcHJpYXRlIGRhdGFcbiAgICB0aGlzLmVzcHJlc3NvID0gbmV3IEVzcHJlc3NvUnVubmVyKHtcbiAgICAgIGhvc3Q6IHRoaXMub3B0cy5yZW1vdGVBZGJIb3N0IHx8IHRoaXMub3B0cy5ob3N0IHx8ICdsb2NhbGhvc3QnLFxuICAgICAgc3lzdGVtUG9ydDogdGhpcy5vcHRzLnN5c3RlbVBvcnQsXG4gICAgICBkZXZpY2VQb3J0OiBERVZJQ0VfUE9SVCxcbiAgICAgIGFkYjogdGhpcy5hZGIsXG4gICAgICBhcGs6IHRoaXMub3B0cy5hcHAsXG4gICAgICB0bXBEaXI6IHRoaXMub3B0cy50bXBEaXIsXG4gICAgICBhcHBQYWNrYWdlOiB0aGlzLm9wdHMuYXBwUGFja2FnZSxcbiAgICAgIGFwcEFjdGl2aXR5OiB0aGlzLm9wdHMuYXBwQWN0aXZpdHksXG4gICAgICBmb3JjZUVzcHJlc3NvUmVidWlsZDogISF0aGlzLm9wdHMuZm9yY2VFc3ByZXNzb1JlYnVpbGQsXG4gICAgICBlc3ByZXNzb0J1aWxkQ29uZmlnOiB0aGlzLm9wdHMuZXNwcmVzc29CdWlsZENvbmZpZyxcbiAgICAgIHNob3dHcmFkbGVMb2c6ICEhdGhpcy5vcHRzLnNob3dHcmFkbGVMb2csXG4gICAgICBzZXJ2ZXJMYXVuY2hUaW1lb3V0OiB0aGlzLm9wdHMuZXNwcmVzc29TZXJ2ZXJMYXVuY2hUaW1lb3V0LFxuICAgICAgYW5kcm9pZEluc3RhbGxUaW1lb3V0OiB0aGlzLm9wdHMuYW5kcm9pZEluc3RhbGxUaW1lb3V0LFxuICAgIH0pO1xuICAgIHRoaXMucHJveHlSZXFSZXMgPSB0aGlzLmVzcHJlc3NvLnByb3h5UmVxUmVzLmJpbmQodGhpcy5lc3ByZXNzbyk7XG4gIH1cblxuICAvLyBUT0RPIHRoaXMgbWV0aG9kIGlzIG1vc3RseSBkdXBsaWNhdGVkIGZyb20gdWlhdXRvbWF0b3IyXG4gIGFzeW5jIGluaXRBVVQgKCkge1xuICAgIC8vIHNldCB0aGUgbG9jYWxpemVkIHN0cmluZ3MgZm9yIHRoZSBjdXJyZW50IGxhbmd1YWdlIGZyb20gdGhlIGFwa1xuICAgIC8vIFRPRE86IGluY29ycG9yYXRlIGNoYW5nZXMgZnJvbSBhcHBpdW0jNTMwOCB3aGljaCBmaXggYSByYWNlIGNvbmQtXG4gICAgLy8gaXRpb24gYnVnIGluIG9sZCBhcHBpdW0gYW5kIG5lZWQgdG8gYmUgcmVwbGljYXRlZCBoZXJlXG4gICAgLy8gdGhpcy5hcGtTdHJpbmdzW3RoaXMub3B0cy5sYW5ndWFnZV0gPSBhd2FpdCBhbmRyb2lkSGVscGVycy5wdXNoU3RyaW5ncyhcbiAgICAvLyAgICAgdGhpcy5vcHRzLmxhbmd1YWdlLCB0aGlzLmFkYiwgdGhpcy5vcHRzKTtcblxuICAgIC8vIFVuaW5zdGFsbCBhbnkgdW5pbnN0YWxsT3RoZXJQYWNrYWdlcyB3aGljaCB3ZXJlIHNwZWNpZmllZCBpbiBjYXBzXG4gICAgaWYgKHRoaXMub3B0cy51bmluc3RhbGxPdGhlclBhY2thZ2VzKSB7XG4gICAgICBhd2FpdCBoZWxwZXJzLnVuaW5zdGFsbE90aGVyUGFja2FnZXMoXG4gICAgICAgIHRoaXMuYWRiLFxuICAgICAgICBoZWxwZXJzLnBhcnNlQXJyYXkodGhpcy5vcHRzLnVuaW5zdGFsbE90aGVyUGFja2FnZXMpLFxuICAgICAgICBbU0VUVElOR1NfSEVMUEVSX1BLR19JRCwgVEVTVF9BUEtfUEtHXVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0cy5hcHApIHtcbiAgICAgIGlmICh0aGlzLm9wdHMuZnVsbFJlc2V0KSB7XG4gICAgICAgIGxvZ2dlci5lcnJvckFuZFRocm93KCdGdWxsIHJlc2V0IHJlcXVpcmVzIGFuIGFwcCBjYXBhYmlsaXR5LCB1c2UgZmFzdFJlc2V0IGlmIGFwcCBpcyBub3QgcHJvdmlkZWQnKTtcbiAgICAgIH1cbiAgICAgIGxvZ2dlci5kZWJ1ZygnTm8gYXBwIGNhcGFiaWxpdHkuIEFzc3VtaW5nIGl0IGlzIGFscmVhZHkgb24gdGhlIGRldmljZScpO1xuICAgICAgaWYgKHRoaXMub3B0cy5mYXN0UmVzZXQpIHtcbiAgICAgICAgYXdhaXQgaGVscGVycy5yZXNldEFwcCh0aGlzLmFkYiwgdGhpcy5vcHRzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0cy5za2lwVW5pbnN0YWxsKSB7XG4gICAgICBhd2FpdCB0aGlzLmFkYi51bmluc3RhbGxBcGsodGhpcy5vcHRzLmFwcFBhY2thZ2UpO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRzLmFwcCkge1xuICAgICAgaWYgKHRoaXMub3B0cy5ub1NpZ24pIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1NraXBwaW5nIGFwcGxpY2F0aW9uIHNpZ25pbmcgYmVjYXVzZSBub1NpZ24gY2FwYWJpbGl0eSBpcyBzZXQgdG8gdHJ1ZS4gJyArXG4gICAgICAgICAgJ0hhdmluZyB0aGUgYXBwbGljYXRpb24gdW5kZXIgdGVzdCB3aXRoIGltcHJvcGVyIHNpZ25hdHVyZS9ub24tc2lnbmVkIHdpbGwgY2F1c2UgJyArXG4gICAgICAgICAgJ0VzcHJlc3NvIGF1dG9tYXRpb24gc3RhcnR1cCBmYWlsdXJlLicpO1xuICAgICAgfSBlbHNlIGlmICghYXdhaXQgdGhpcy5hZGIuY2hlY2tBcGtDZXJ0KHRoaXMub3B0cy5hcHAsIHRoaXMub3B0cy5hcHBQYWNrYWdlKSkge1xuICAgICAgICBhd2FpdCB0aGlzLmFkYi5zaWduKHRoaXMub3B0cy5hcHAsIHRoaXMub3B0cy5hcHBQYWNrYWdlKTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IGhlbHBlcnMuaW5zdGFsbEFwayh0aGlzLmFkYiwgdGhpcy5vcHRzKTtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5lc3ByZXNzby5pbnN0YWxsVGVzdEFwaygpO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlU2Vzc2lvbiAoKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdEZWxldGluZyBlc3ByZXNzbyBzZXNzaW9uJyk7XG4gICAgaWYgKHRoaXMuZXNwcmVzc28pIHtcbiAgICAgIGlmICh0aGlzLmp3cFByb3h5QWN0aXZlKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuZXNwcmVzc28uZGVsZXRlU2Vzc2lvbigpO1xuICAgICAgfVxuICAgICAgdGhpcy5lc3ByZXNzbyA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuandwUHJveHlBY3RpdmUgPSBmYWxzZTtcblxuICAgIC8vIFRPRE8gYmVsb3cgbG9naWMgaXMgZHVwbGljYXRlZCBmcm9tIHVpYXV0b21hdG9yMlxuICAgIGlmICh0aGlzLmFkYikge1xuICAgICAgaWYgKHRoaXMud2FzQW5pbWF0aW9uRW5hYmxlZCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHRoaXMuYWRiLnNldEFuaW1hdGlvblN0YXRlKHRydWUpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBsb2dnZXIud2FybihgVW5hYmxlIHRvIHJlc2V0IGFuaW1hdGlvbjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHRoaXMub3B0cy51bmljb2RlS2V5Ym9hcmQgJiYgdGhpcy5vcHRzLnJlc2V0S2V5Ym9hcmQgJiZcbiAgICAgICAgICB0aGlzLmRlZmF1bHRJTUUpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKGBSZXNldHRpbmcgSU1FIHRvICcke3RoaXMuZGVmYXVsdElNRX0nYCk7XG4gICAgICAgIGF3YWl0IHRoaXMuYWRiLnNldElNRSh0aGlzLmRlZmF1bHRJTUUpO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLmlzQ2hyb21lU2Vzc2lvbiAmJiB0aGlzLm9wdHMuYXBwUGFja2FnZSAmJiAhdGhpcy5vcHRzLmRvbnRTdG9wQXBwT25SZXNldCkge1xuICAgICAgICBhd2FpdCB0aGlzLmFkYi5mb3JjZVN0b3AodGhpcy5vcHRzLmFwcFBhY2thZ2UpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMub3B0cy5mdWxsUmVzZXQgJiYgIXRoaXMub3B0cy5za2lwVW5pbnN0YWxsICYmICF0aGlzLmFwcE9uRGV2aWNlKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgRlVMTF9SRVNFVCBzZXQgdG8gJ3RydWUnLCBVbmluc3RhbGxpbmcgJyR7dGhpcy5vcHRzLmFwcFBhY2thZ2V9J2ApO1xuICAgICAgICBhd2FpdCB0aGlzLmFkYi51bmluc3RhbGxBcGsodGhpcy5vcHRzLmFwcFBhY2thZ2UpO1xuICAgICAgfVxuICAgICAgYXdhaXQgdGhpcy5hZGIuc3RvcExvZ2NhdCgpO1xuICAgICAgaWYgKHRoaXMub3B0cy5yZWJvb3QpIHtcbiAgICAgICAgbGV0IGF2ZE5hbWUgPSB0aGlzLm9wdHMuYXZkLnJlcGxhY2UoJ0AnLCAnJyk7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgY2xvc2luZyBlbXVsYXRvciAnJHthdmROYW1lfSdgKTtcbiAgICAgICAgYXdhaXQgdGhpcy5hZGIua2lsbEVtdWxhdG9yKGF2ZE5hbWUpO1xuICAgICAgfVxuICAgICAgaWYgKGF3YWl0IHRoaXMuYWRiLmdldEFwaUxldmVsKCkgPj0gMjgpIHsgLy8gQW5kcm9pZCBQXG4gICAgICAgIGxvZ2dlci5pbmZvKCdSZXN0b3JpbmcgaGlkZGVuIGFwaSBwb2xpY3kgdG8gdGhlIGRldmljZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24nKTtcbiAgICAgICAgYXdhaXQgdGhpcy5hZGIuc2V0RGVmYXVsdEhpZGRlbkFwaVBvbGljeSgpO1xuICAgICAgfVxuICAgIH1cbiAgICBhd2FpdCBzdXBlci5kZWxldGVTZXNzaW9uKCk7XG4gICAgaWYgKHRoaXMub3B0cy5zeXN0ZW1Qb3J0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuYWRiLnJlbW92ZVBvcnRGb3J3YXJkKHRoaXMub3B0cy5zeXN0ZW1Qb3J0KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGxvZ2dlci53YXJuKGBVbmFibGUgdG8gcmVtb3ZlIHBvcnQgZm9yd2FyZCAnJHtlcnJvci5tZXNzYWdlfSdgKTtcbiAgICAgICAgLy9JZ25vcmUsIHRoaXMgYmxvY2sgd2lsbCBhbHNvIGJlIGNhbGxlZCB3aGVuIHdlIGZhbGwgaW4gY2F0Y2ggYmxvY2tcbiAgICAgICAgLy8gYW5kIGJlZm9yZSBldmVuIHBvcnQgZm9yd2FyZC5cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBUT0RPIG1ldGhvZCBpcyBkdXBsaWNhdGVkIGZyb20gdWlhdXRvbWF0b3IyXG4gIGFzeW5jIGNoZWNrQXBwUHJlc2VudCAoKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdDaGVja2luZyB3aGV0aGVyIGFwcCBpcyBhY3R1YWxseSBwcmVzZW50Jyk7XG4gICAgaWYgKCEoYXdhaXQgZnMuZXhpc3RzKHRoaXMub3B0cy5hcHApKSkge1xuICAgICAgbG9nZ2VyLmVycm9yQW5kVGhyb3coYENvdWxkIG5vdCBmaW5kIGFwcCBhcGsgYXQgJyR7dGhpcy5vcHRzLmFwcH0nYCk7XG4gICAgfVxuICB9XG5cbiAgcHJveHlBY3RpdmUgKHNlc3Npb25JZCkge1xuICAgIHN1cGVyLnByb3h5QWN0aXZlKHNlc3Npb25JZCk7XG5cbiAgICAvLyB3ZSBhbHdheXMgaGF2ZSBhbiBhY3RpdmUgcHJveHkgdG8gdGhlIGVzcHJlc3NvIHNlcnZlclxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgY2FuUHJveHkgKHNlc3Npb25JZCkge1xuICAgIHN1cGVyLmNhblByb3h5KHNlc3Npb25JZCk7XG5cbiAgICAvLyB3ZSBjYW4gYWx3YXlzIHByb3h5IHRvIHRoZSBlc3ByZXNzbyBzZXJ2ZXJcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGdldFByb3h5QXZvaWRMaXN0IChzZXNzaW9uSWQpIHtcbiAgICBzdXBlci5nZXRQcm94eUF2b2lkTGlzdChzZXNzaW9uSWQpO1xuICAgIHRoaXMuandwUHJveHlBdm9pZCA9IE5PX1BST1hZO1xuXG4gICAgaWYgKHRoaXMub3B0cy5uYXRpdmVXZWJTY3JlZW5zaG90KSB7XG4gICAgICB0aGlzLmp3cFByb3h5QXZvaWQgPSBbLi4udGhpcy5qd3BQcm94eUF2b2lkLCBbJ0dFVCcsIG5ldyBSZWdFeHAoJ14vc2Vzc2lvbi9bXi9dKy9zY3JlZW5zaG90JyldXTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5qd3BQcm94eUF2b2lkO1xuICB9XG5cbiAgZ2V0IGlzQ2hyb21lU2Vzc2lvbiAoKSB7XG4gICAgcmV0dXJuIGhlbHBlcnMuaXNDaHJvbWVCcm93c2VyKHRoaXMub3B0cy5icm93c2VyTmFtZSk7XG4gIH1cbn1cblxuLy8gZmlyc3QgYWRkIHRoZSBhbmRyb2lkLWRyaXZlciBjb21tYW5kcyB3aGljaCB3ZSB3aWxsIGZhbGwgYmFjayB0b1xuZm9yIChsZXQgW2NtZCwgZm5dIG9mIF8udG9QYWlycyhhbmRyb2lkQ29tbWFuZHMpKSB7XG4gIC8vIHdlIGRvIHNvbWUgZGlmZmVyZW50L3NwZWNpYWwgdGhpbmdzIHdpdGggdGhlc2UgbWV0aG9kc1xuICBpZiAoIV8uaW5jbHVkZXMoWydkZWZhdWx0V2Vidmlld05hbWUnXSwgY21kKSkge1xuICAgIEVzcHJlc3NvRHJpdmVyLnByb3RvdHlwZVtjbWRdID0gZm47XG4gIH1cbn1cblxuLy8gdGhlbiBvdmVyd3JpdGUgd2l0aCBhbnkgZXNwcmVzc28tc3BlY2lmaWMgY29tbWFuZHNcbmZvciAobGV0IFtjbWQsIGZuXSBvZiBfLnRvUGFpcnMoY29tbWFuZHMpKSB7XG4gIEVzcHJlc3NvRHJpdmVyLnByb3RvdHlwZVtjbWRdID0gZm47XG59XG5cbmV4cG9ydCB7IEVzcHJlc3NvRHJpdmVyIH07XG5leHBvcnQgZGVmYXVsdCBFc3ByZXNzb0RyaXZlcjtcbiJdLCJmaWxlIjoibGliL2RyaXZlci5qcyIsInNvdXJjZVJvb3QiOiIuLi8uLiJ9
