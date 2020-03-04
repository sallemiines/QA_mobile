"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAndroidPlatformAndPath = getAndroidPlatformAndPath;
exports.unzipFile = unzipFile;
exports.getIMEListFromOutput = getIMEListFromOutput;
exports.isShowingLockscreen = isShowingLockscreen;
exports.isCurrentFocusOnKeyguard = isCurrentFocusOnKeyguard;
exports.getSurfaceOrientation = getSurfaceOrientation;
exports.isScreenOnFully = isScreenOnFully;
exports.buildStartCmd = buildStartCmd;
exports.getJavaHome = getJavaHome;
exports.getApksignerForOs = getApksignerForOs;
exports.getApkanalyzerForOs = getApkanalyzerForOs;
exports.buildInstallArgs = buildInstallArgs;
exports.parseManifest = parseManifest;
exports.parseAaptStrings = parseAaptStrings;
exports.parseAapt2Strings = parseAapt2Strings;
exports.formatConfigMarker = formatConfigMarker;
exports.DEFAULT_ADB_EXEC_TIMEOUT = exports.APK_EXTENSION = exports.APKS_INSTALL_TIMEOUT = exports.APK_INSTALL_TIMEOUT = exports.APKS_EXTENSION = exports.extractMatchingPermissions = exports.getOpenSslForOs = exports.getBuildToolsDirs = exports.getSdkToolsVersion = exports.rootDir = exports.getJavaForOs = void 0;

require("source-map-support/register");

var _path = _interopRequireDefault(require("path"));

var _appiumSupport = require("appium-support");

var _logger = _interopRequireDefault(require("./logger.js"));

var _lodash = _interopRequireDefault(require("lodash"));

var _bluebird = _interopRequireDefault(require("bluebird"));

var _semver = _interopRequireDefault(require("semver"));

var _os = _interopRequireDefault(require("os"));

const rootDir = _path.default.resolve(__dirname, process.env.NO_PRECOMPILE ? '..' : '../..');

exports.rootDir = rootDir;
const APKS_EXTENSION = '.apks';
exports.APKS_EXTENSION = APKS_EXTENSION;
const APK_EXTENSION = '.apk';
exports.APK_EXTENSION = APK_EXTENSION;
const APK_INSTALL_TIMEOUT = 60000;
exports.APK_INSTALL_TIMEOUT = APK_INSTALL_TIMEOUT;
const APKS_INSTALL_TIMEOUT = APK_INSTALL_TIMEOUT * 2;
exports.APKS_INSTALL_TIMEOUT = APKS_INSTALL_TIMEOUT;
const DEFAULT_ADB_EXEC_TIMEOUT = 20000;
exports.DEFAULT_ADB_EXEC_TIMEOUT = DEFAULT_ADB_EXEC_TIMEOUT;

async function getAndroidPlatformAndPath() {
  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;

  if (_lodash.default.isEmpty(sdkRoot)) {
    throw new Error('Neither ANDROID_HOME nor ANDROID_SDK_ROOT environment variable was exported');
  }

  let propsPaths = await _appiumSupport.fs.glob(_path.default.resolve(sdkRoot, 'platforms', '*', 'build.prop'), {
    absolute: true
  });
  const platformsMapping = {};

  for (const propsPath of propsPaths) {
    const propsContent = await _appiumSupport.fs.readFile(propsPath, 'utf-8');

    const platformPath = _path.default.dirname(propsPath);

    const platform = _path.default.basename(platformPath);

    const match = /ro\.build\.version\.sdk=(\d+)/.exec(propsContent);

    if (!match) {
      _logger.default.warn(`Cannot read the SDK version from '${propsPath}'. Skipping '${platform}'`);

      continue;
    }

    platformsMapping[parseInt(match[1], 10)] = {
      platform,
      platformPath
    };
  }

  if (_lodash.default.isEmpty(platformsMapping)) {
    _logger.default.warn(`Found zero platform folders at '${_path.default.resolve(sdkRoot, 'platforms')}'. ` + `Do you have any Android SDKs installed?`);

    return {
      platform: null,
      platformPath: null
    };
  }

  const recentSdkVersion = _lodash.default.keys(platformsMapping).sort().reverse()[0];

  const result = platformsMapping[recentSdkVersion];

  _logger.default.debug(`Found the most recent Android platform: ${JSON.stringify(result)}`);

  return result;
}

async function unzipFile(zipPath, dstRoot = _path.default.dirname(zipPath)) {
  _logger.default.debug(`Unzipping '${zipPath}' to '${dstRoot}'`);

  await _appiumSupport.zip.assertValidZip(zipPath);
  await _appiumSupport.zip.extractAllTo(zipPath, dstRoot);

  _logger.default.debug('Unzip successful');
}

function getIMEListFromOutput(stdout) {
  let engines = [];

  for (let line of stdout.split('\n')) {
    if (line.length > 0 && line[0] !== ' ') {
      engines.push(line.trim().replace(/:$/, ''));
    }
  }

  return engines;
}

const getJavaForOs = _lodash.default.memoize(() => {
  return _path.default.resolve(getJavaHome(), 'bin', `java${_appiumSupport.system.isWindows() ? '.exe' : ''}`);
});

exports.getJavaForOs = getJavaForOs;

const getOpenSslForOs = async function () {
  const binaryName = `openssl${_appiumSupport.system.isWindows() ? '.exe' : ''}`;

  try {
    return await _appiumSupport.fs.which(binaryName);
  } catch (err) {
    throw new Error('The openssl tool must be installed on the system and available on the path');
  }
};

exports.getOpenSslForOs = getOpenSslForOs;

function getJavaHome() {
  if (process.env.JAVA_HOME) {
    return process.env.JAVA_HOME;
  }

  throw new Error('JAVA_HOME is not set currently. Please set JAVA_HOME.');
}

async function getApksignerForOs(sysHelpers) {
  return await sysHelpers.getBinaryFromSdkRoot('apksigner');
}

async function getApkanalyzerForOs(sysHelpers) {
  return await sysHelpers.getBinaryFromSdkRoot('apkanalyzer');
}

function isShowingLockscreen(dumpsys) {
  return /(mShowingLockscreen=true|mDreamingLockscreen=true)/gi.test(dumpsys);
}

function isCurrentFocusOnKeyguard(dumpsys) {
  let m = /mCurrentFocus.+Keyguard/gi.exec(dumpsys);
  return m && m.length && m[0] ? true : false;
}

function getSurfaceOrientation(dumpsys) {
  let m = /SurfaceOrientation: \d/gi.exec(dumpsys);
  return m && parseInt(m[0].split(':')[1], 10);
}

function isScreenOnFully(dumpsys) {
  let m = /mScreenOnFully=\w+/gi.exec(dumpsys);
  return !m || m && m.length > 0 && m[0].split('=')[1] === 'true' || false;
}

function buildStartCmd(startAppOptions, apiLevel) {
  const {
    user,
    waitForLaunch,
    pkg,
    activity,
    action,
    category,
    stopApp,
    flags
  } = startAppOptions;
  const cmd = ['am', 'start'];

  if (_appiumSupport.util.hasValue(user)) {
    cmd.push('--user', user);
  }

  if (waitForLaunch) {
    cmd.push('-W');
  }

  cmd.push('-n', `${pkg}/${activity}`);

  if (stopApp && apiLevel >= 15) {
    cmd.push('-S');
  }

  if (action) {
    cmd.push('-a', action);
  }

  if (category) {
    cmd.push('-c', category);
  }

  if (flags) {
    cmd.push('-f', flags);
  }

  if (startAppOptions.optionalIntentArguments) {
    let parseKeyValue = function (str) {
      str = str.trim();
      let space = str.indexOf(' ');

      if (space === -1) {
        return str.length ? [str] : [];
      } else {
        return [str.substring(0, space).trim(), str.substring(space + 1).trim()];
      }
    };

    let optionalIntentArguments = ` ${startAppOptions.optionalIntentArguments}`;
    let re = / (-[^\s]+) (.+)/;

    while (true) {
      let args = re.exec(optionalIntentArguments);

      if (!args) {
        if (optionalIntentArguments.length) {
          cmd.push.apply(cmd, parseKeyValue(optionalIntentArguments));
        }

        break;
      }

      let flag = args[1];
      let flagPos = optionalIntentArguments.indexOf(flag);

      if (flagPos !== 0) {
        let prevArgs = optionalIntentArguments.substring(0, flagPos);
        cmd.push.apply(cmd, parseKeyValue(prevArgs));
      }

      cmd.push(flag);
      optionalIntentArguments = args[2];
    }
  }

  return cmd;
}

const getSdkToolsVersion = _lodash.default.memoize(async function getSdkToolsVersion() {
  const androidHome = process.env.ANDROID_HOME;

  if (!androidHome) {
    throw new Error('ANDROID_HOME environment variable is expected to be set');
  }

  const propertiesPath = _path.default.resolve(androidHome, 'tools', 'source.properties');

  if (!(await _appiumSupport.fs.exists(propertiesPath))) {
    _logger.default.warn(`Cannot find ${propertiesPath} file to read SDK version from`);

    return;
  }

  const propertiesContent = await _appiumSupport.fs.readFile(propertiesPath, 'utf8');
  const versionMatcher = new RegExp(/Pkg\.Revision=(\d+)\.?(\d+)?\.?(\d+)?/);
  const match = versionMatcher.exec(propertiesContent);

  if (match) {
    return {
      major: parseInt(match[1], 10),
      minor: match[2] ? parseInt(match[2], 10) : 0,
      build: match[3] ? parseInt(match[3], 10) : 0
    };
  }

  _logger.default.warn(`Cannot parse "Pkg.Revision" value from ${propertiesPath}`);
});

exports.getSdkToolsVersion = getSdkToolsVersion;

const getBuildToolsDirs = _lodash.default.memoize(async function getBuildToolsDirs(sdkRoot) {
  let buildToolsDirs = await _appiumSupport.fs.glob(_path.default.resolve(sdkRoot, 'build-tools', '*'), {
    absolute: true
  });

  try {
    buildToolsDirs = buildToolsDirs.map(dir => [_path.default.basename(dir), dir]).sort((a, b) => _semver.default.rcompare(a[0], b[0])).map(pair => pair[1]);
  } catch (err) {
    _logger.default.warn(`Cannot sort build-tools folders ${JSON.stringify(buildToolsDirs.map(dir => _path.default.basename(dir)))} ` + `by semantic version names.`);

    _logger.default.warn(`Falling back to sorting by modification date. Original error: ${err.message}`);

    const pairs = await _bluebird.default.map(buildToolsDirs, async dir => [(await _appiumSupport.fs.stat(dir)).mtime.valueOf(), dir]);
    buildToolsDirs = pairs.sort((a, b) => a[0] < b[0]).map(pair => pair[1]);
  }

  _logger.default.info(`Found ${buildToolsDirs.length} 'build-tools' folders under '${sdkRoot}' (newest first):`);

  for (let dir of buildToolsDirs) {
    _logger.default.info(`    ${dir}`);
  }

  return buildToolsDirs;
});

exports.getBuildToolsDirs = getBuildToolsDirs;

const extractMatchingPermissions = function (dumpsysOutput, groupNames, grantedState = null) {
  const groupPatternByName = groupName => new RegExp(`^(\\s*${_lodash.default.escapeRegExp(groupName)} permissions:[\\s\\S]+)`, 'm');

  const indentPattern = /\S|$/;
  const permissionNamePattern = /android\.permission\.\w+/;
  const grantedStatePattern = /\bgranted=(\w+)/;
  const result = [];

  for (const groupName of groupNames) {
    const groupMatch = groupPatternByName(groupName).exec(dumpsysOutput);

    if (!groupMatch) {
      continue;
    }

    const lines = groupMatch[1].split('\n');

    if (lines.length < 2) {
      continue;
    }

    const titleIndent = lines[0].search(indentPattern);

    for (const line of lines.slice(1)) {
      const currentIndent = line.search(indentPattern);

      if (currentIndent <= titleIndent) {
        break;
      }

      const permissionNameMatch = permissionNamePattern.exec(line);

      if (!permissionNameMatch) {
        continue;
      }

      const item = {
        permission: permissionNameMatch[0]
      };
      const grantedStateMatch = grantedStatePattern.exec(line);

      if (grantedStateMatch) {
        item.granted = grantedStateMatch[1] === 'true';
      }

      result.push(item);
    }
  }

  const filteredResult = result.filter(item => !_lodash.default.isBoolean(grantedState) || item.granted === grantedState).map(item => item.permission);

  _logger.default.debug(`Retrieved ${filteredResult.length} permission(s) from ${JSON.stringify(groupNames)} group(s)`);

  return filteredResult;
};

exports.extractMatchingPermissions = extractMatchingPermissions;

function buildInstallArgs(apiLevel, options = {}) {
  const result = [];

  if (!_appiumSupport.util.hasValue(options.replace) || options.replace) {
    result.push('-r');
  }

  if (options.allowTestPackages) {
    result.push('-t');
  }

  if (options.useSdcard) {
    result.push('-s');
  }

  if (options.grantPermissions) {
    if (apiLevel < 23) {
      _logger.default.debug(`Skipping permissions grant option, since ` + `the current API level ${apiLevel} does not support applications ` + `permissions customization`);
    } else {
      result.push('-g');
    }
  }

  return result;
}

function parseManifest(manifest) {
  const result = {
    pkg: manifest.package,
    versionCode: parseInt(manifest.versionCode, 10),
    versionName: manifest.versionName || null
  };

  if (!manifest.application) {
    return result;
  }

  for (const activity of [...manifest.application.activities, ...manifest.application.activityAliases]) {
    if (activity.enabled === false || _lodash.default.isEmpty(activity.intentFilters)) {
      continue;
    }

    for (const {
      actions,
      categories
    } of activity.intentFilters) {
      if (_lodash.default.isEmpty(actions) || _lodash.default.isEmpty(categories)) {
        continue;
      }

      const isMainAction = actions.some(({
        name
      }) => name === 'android.intent.action.MAIN');
      const isLauncherCategory = categories.some(({
        name
      }) => name === 'android.intent.category.LAUNCHER');

      if (isMainAction && isLauncherCategory) {
        result.activity = activity.name;
        return result;
      }
    }
  }

  return result;
}

function parseAaptStrings(rawOutput, configMarker) {
  const normalizeStringMatch = function (s) {
    return s.replace(/"$/, '').replace(/^"/, '').replace(/\\"/g, '"');
  };

  const apkStrings = {};
  let isInConfig = false;
  let currentResourceId = null;
  let isInPluralGroup = false;
  const quotedStringPattern = /"[^"\\]*(?:\\.[^"\\]*)*"/;

  for (const line of rawOutput.split(_os.default.EOL)) {
    const trimmedLine = line.trim();

    if (_lodash.default.isEmpty(trimmedLine)) {
      continue;
    }

    if (['config', 'type', 'spec', 'Package'].some(x => trimmedLine.startsWith(x))) {
      isInConfig = trimmedLine.startsWith(`config ${configMarker}:`);
      currentResourceId = null;
      isInPluralGroup = false;
      continue;
    }

    if (!isInConfig) {
      continue;
    }

    if (trimmedLine.startsWith('resource')) {
      isInPluralGroup = false;
      currentResourceId = null;

      if (trimmedLine.includes(':string/')) {
        const match = /:string\/(\S+):/.exec(trimmedLine);

        if (match) {
          currentResourceId = match[1];
        }
      } else if (trimmedLine.includes(':plurals/')) {
        const match = /:plurals\/(\S+):/.exec(trimmedLine);

        if (match) {
          currentResourceId = match[1];
          isInPluralGroup = true;
        }
      }

      continue;
    }

    if (currentResourceId && trimmedLine.startsWith('(string')) {
      const match = quotedStringPattern.exec(trimmedLine);

      if (match) {
        apkStrings[currentResourceId] = normalizeStringMatch(match[0]);
      }

      currentResourceId = null;
      continue;
    }

    if (currentResourceId && isInPluralGroup && trimmedLine.includes(': (string')) {
      const match = quotedStringPattern.exec(trimmedLine);

      if (match) {
        apkStrings[currentResourceId] = [...(apkStrings[currentResourceId] || []), normalizeStringMatch(match[0])];
      }

      continue;
    }
  }

  return apkStrings;
}

function parseAapt2Strings(rawOutput, configMarker) {
  const allLines = rawOutput.split(_os.default.EOL);

  function extractContent(startIdx) {
    let idx = startIdx;
    const startCharPos = allLines[startIdx].indexOf('"');

    if (startCharPos < 0) {
      return [null, idx];
    }

    let result = '';

    while (idx < allLines.length) {
      const terminationCharMatch = /"$/.exec(allLines[idx]);

      if (terminationCharMatch) {
        const terminationCharPos = terminationCharMatch.index;

        if (startIdx === idx) {
          return [allLines[idx].substring(startCharPos + 1, terminationCharPos), idx];
        }

        return [`${result}\\n${_lodash.default.trimStart(allLines[idx].substring(0, terminationCharPos))}`, idx];
      }

      if (idx > startIdx) {
        result += `\\n${_lodash.default.trimStart(allLines[idx])}`;
      } else {
        result += allLines[idx].substring(startCharPos + 1);
      }

      ++idx;
    }

    return [result, idx];
  }

  const apkStrings = {};
  let currentResourceId = null;
  let isInPluralGroup = false;
  let isInCurrentConfig = false;
  let lineIndex = 0;

  while (lineIndex < allLines.length) {
    const trimmedLine = allLines[lineIndex].trim();

    if (_lodash.default.isEmpty(trimmedLine)) {
      ++lineIndex;
      continue;
    }

    if (['type', 'Package'].some(x => trimmedLine.startsWith(x))) {
      currentResourceId = null;
      isInPluralGroup = false;
      isInCurrentConfig = false;
      ++lineIndex;
      continue;
    }

    if (trimmedLine.startsWith('resource')) {
      isInPluralGroup = false;
      currentResourceId = null;
      isInCurrentConfig = false;

      if (trimmedLine.includes('string/')) {
        const match = /string\/(\S+)/.exec(trimmedLine);

        if (match) {
          currentResourceId = match[1];
        }
      } else if (trimmedLine.includes('plurals/')) {
        const match = /plurals\/(\S+)/.exec(trimmedLine);

        if (match) {
          currentResourceId = match[1];
          isInPluralGroup = true;
        }
      }

      ++lineIndex;
      continue;
    }

    if (currentResourceId) {
      if (isInPluralGroup) {
        if (trimmedLine.startsWith('(')) {
          isInCurrentConfig = trimmedLine.startsWith(`(${configMarker})`);
          ++lineIndex;
          continue;
        }

        if (isInCurrentConfig) {
          const [content, idx] = extractContent(lineIndex);
          lineIndex = idx;

          if (_lodash.default.isString(content)) {
            apkStrings[currentResourceId] = [...(apkStrings[currentResourceId] || []), content];
          }
        }
      } else if (trimmedLine.startsWith(`(${configMarker})`)) {
        const [content, idx] = extractContent(lineIndex);
        lineIndex = idx;

        if (_lodash.default.isString(content)) {
          apkStrings[currentResourceId] = content;
        }

        currentResourceId = null;
      }
    }

    ++lineIndex;
  }

  return apkStrings;
}

async function formatConfigMarker(configsGetter, desiredMarker, defaultMarker) {
  let configMarker = desiredMarker || defaultMarker;

  if (configMarker.includes('-') && !configMarker.includes('-r')) {
    configMarker = configMarker.replace('-', '-r');
  }

  if (configMarker.toLowerCase().startsWith('en')) {
    if (!(await configsGetter()).map(x => x.trim()).includes(configMarker)) {
      _logger.default.debug(`There is no '${configMarker}' configuration. ` + `Replacing it with '${defaultMarker || 'default'}'`);

      configMarker = defaultMarker;
    }
  }

  return configMarker;
}require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9oZWxwZXJzLmpzIl0sIm5hbWVzIjpbInJvb3REaXIiLCJwYXRoIiwicmVzb2x2ZSIsIl9fZGlybmFtZSIsInByb2Nlc3MiLCJlbnYiLCJOT19QUkVDT01QSUxFIiwiQVBLU19FWFRFTlNJT04iLCJBUEtfRVhURU5TSU9OIiwiQVBLX0lOU1RBTExfVElNRU9VVCIsIkFQS1NfSU5TVEFMTF9USU1FT1VUIiwiREVGQVVMVF9BREJfRVhFQ19USU1FT1VUIiwiZ2V0QW5kcm9pZFBsYXRmb3JtQW5kUGF0aCIsInNka1Jvb3QiLCJBTkRST0lEX0hPTUUiLCJBTkRST0lEX1NES19ST09UIiwiXyIsImlzRW1wdHkiLCJFcnJvciIsInByb3BzUGF0aHMiLCJmcyIsImdsb2IiLCJhYnNvbHV0ZSIsInBsYXRmb3Jtc01hcHBpbmciLCJwcm9wc1BhdGgiLCJwcm9wc0NvbnRlbnQiLCJyZWFkRmlsZSIsInBsYXRmb3JtUGF0aCIsImRpcm5hbWUiLCJwbGF0Zm9ybSIsImJhc2VuYW1lIiwibWF0Y2giLCJleGVjIiwibG9nIiwid2FybiIsInBhcnNlSW50IiwicmVjZW50U2RrVmVyc2lvbiIsImtleXMiLCJzb3J0IiwicmV2ZXJzZSIsInJlc3VsdCIsImRlYnVnIiwiSlNPTiIsInN0cmluZ2lmeSIsInVuemlwRmlsZSIsInppcFBhdGgiLCJkc3RSb290IiwiemlwIiwiYXNzZXJ0VmFsaWRaaXAiLCJleHRyYWN0QWxsVG8iLCJnZXRJTUVMaXN0RnJvbU91dHB1dCIsInN0ZG91dCIsImVuZ2luZXMiLCJsaW5lIiwic3BsaXQiLCJsZW5ndGgiLCJwdXNoIiwidHJpbSIsInJlcGxhY2UiLCJnZXRKYXZhRm9yT3MiLCJtZW1vaXplIiwiZ2V0SmF2YUhvbWUiLCJzeXN0ZW0iLCJpc1dpbmRvd3MiLCJnZXRPcGVuU3NsRm9yT3MiLCJiaW5hcnlOYW1lIiwid2hpY2giLCJlcnIiLCJKQVZBX0hPTUUiLCJnZXRBcGtzaWduZXJGb3JPcyIsInN5c0hlbHBlcnMiLCJnZXRCaW5hcnlGcm9tU2RrUm9vdCIsImdldEFwa2FuYWx5emVyRm9yT3MiLCJpc1Nob3dpbmdMb2Nrc2NyZWVuIiwiZHVtcHN5cyIsInRlc3QiLCJpc0N1cnJlbnRGb2N1c09uS2V5Z3VhcmQiLCJtIiwiZ2V0U3VyZmFjZU9yaWVudGF0aW9uIiwiaXNTY3JlZW5PbkZ1bGx5IiwiYnVpbGRTdGFydENtZCIsInN0YXJ0QXBwT3B0aW9ucyIsImFwaUxldmVsIiwidXNlciIsIndhaXRGb3JMYXVuY2giLCJwa2ciLCJhY3Rpdml0eSIsImFjdGlvbiIsImNhdGVnb3J5Iiwic3RvcEFwcCIsImZsYWdzIiwiY21kIiwidXRpbCIsImhhc1ZhbHVlIiwib3B0aW9uYWxJbnRlbnRBcmd1bWVudHMiLCJwYXJzZUtleVZhbHVlIiwic3RyIiwic3BhY2UiLCJpbmRleE9mIiwic3Vic3RyaW5nIiwicmUiLCJhcmdzIiwiYXBwbHkiLCJmbGFnIiwiZmxhZ1BvcyIsInByZXZBcmdzIiwiZ2V0U2RrVG9vbHNWZXJzaW9uIiwiYW5kcm9pZEhvbWUiLCJwcm9wZXJ0aWVzUGF0aCIsImV4aXN0cyIsInByb3BlcnRpZXNDb250ZW50IiwidmVyc2lvbk1hdGNoZXIiLCJSZWdFeHAiLCJtYWpvciIsIm1pbm9yIiwiYnVpbGQiLCJnZXRCdWlsZFRvb2xzRGlycyIsImJ1aWxkVG9vbHNEaXJzIiwibWFwIiwiZGlyIiwiYSIsImIiLCJzZW12ZXIiLCJyY29tcGFyZSIsInBhaXIiLCJtZXNzYWdlIiwicGFpcnMiLCJCIiwic3RhdCIsIm10aW1lIiwidmFsdWVPZiIsImluZm8iLCJleHRyYWN0TWF0Y2hpbmdQZXJtaXNzaW9ucyIsImR1bXBzeXNPdXRwdXQiLCJncm91cE5hbWVzIiwiZ3JhbnRlZFN0YXRlIiwiZ3JvdXBQYXR0ZXJuQnlOYW1lIiwiZ3JvdXBOYW1lIiwiZXNjYXBlUmVnRXhwIiwiaW5kZW50UGF0dGVybiIsInBlcm1pc3Npb25OYW1lUGF0dGVybiIsImdyYW50ZWRTdGF0ZVBhdHRlcm4iLCJncm91cE1hdGNoIiwibGluZXMiLCJ0aXRsZUluZGVudCIsInNlYXJjaCIsInNsaWNlIiwiY3VycmVudEluZGVudCIsInBlcm1pc3Npb25OYW1lTWF0Y2giLCJpdGVtIiwicGVybWlzc2lvbiIsImdyYW50ZWRTdGF0ZU1hdGNoIiwiZ3JhbnRlZCIsImZpbHRlcmVkUmVzdWx0IiwiZmlsdGVyIiwiaXNCb29sZWFuIiwiYnVpbGRJbnN0YWxsQXJncyIsIm9wdGlvbnMiLCJhbGxvd1Rlc3RQYWNrYWdlcyIsInVzZVNkY2FyZCIsImdyYW50UGVybWlzc2lvbnMiLCJwYXJzZU1hbmlmZXN0IiwibWFuaWZlc3QiLCJwYWNrYWdlIiwidmVyc2lvbkNvZGUiLCJ2ZXJzaW9uTmFtZSIsImFwcGxpY2F0aW9uIiwiYWN0aXZpdGllcyIsImFjdGl2aXR5QWxpYXNlcyIsImVuYWJsZWQiLCJpbnRlbnRGaWx0ZXJzIiwiYWN0aW9ucyIsImNhdGVnb3JpZXMiLCJpc01haW5BY3Rpb24iLCJzb21lIiwibmFtZSIsImlzTGF1bmNoZXJDYXRlZ29yeSIsInBhcnNlQWFwdFN0cmluZ3MiLCJyYXdPdXRwdXQiLCJjb25maWdNYXJrZXIiLCJub3JtYWxpemVTdHJpbmdNYXRjaCIsInMiLCJhcGtTdHJpbmdzIiwiaXNJbkNvbmZpZyIsImN1cnJlbnRSZXNvdXJjZUlkIiwiaXNJblBsdXJhbEdyb3VwIiwicXVvdGVkU3RyaW5nUGF0dGVybiIsIm9zIiwiRU9MIiwidHJpbW1lZExpbmUiLCJ4Iiwic3RhcnRzV2l0aCIsImluY2x1ZGVzIiwicGFyc2VBYXB0MlN0cmluZ3MiLCJhbGxMaW5lcyIsImV4dHJhY3RDb250ZW50Iiwic3RhcnRJZHgiLCJpZHgiLCJzdGFydENoYXJQb3MiLCJ0ZXJtaW5hdGlvbkNoYXJNYXRjaCIsInRlcm1pbmF0aW9uQ2hhclBvcyIsImluZGV4IiwidHJpbVN0YXJ0IiwiaXNJbkN1cnJlbnRDb25maWciLCJsaW5lSW5kZXgiLCJjb250ZW50IiwiaXNTdHJpbmciLCJmb3JtYXRDb25maWdNYXJrZXIiLCJjb25maWdzR2V0dGVyIiwiZGVzaXJlZE1hcmtlciIs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cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBzeXN0ZW0sIGZzLCB6aXAsIHV0aWwgfSBmcm9tICdhcHBpdW0tc3VwcG9ydCc7XG5pbXBvcnQgbG9nIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgQiBmcm9tICdibHVlYmlyZCc7XG5pbXBvcnQgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuXG5jb25zdCByb290RGlyID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgcHJvY2Vzcy5lbnYuTk9fUFJFQ09NUElMRSA/ICcuLicgOiAnLi4vLi4nKTtcbmNvbnN0IEFQS1NfRVhURU5TSU9OID0gJy5hcGtzJztcbmNvbnN0IEFQS19FWFRFTlNJT04gPSAnLmFwayc7XG5jb25zdCBBUEtfSU5TVEFMTF9USU1FT1VUID0gNjAwMDA7XG5jb25zdCBBUEtTX0lOU1RBTExfVElNRU9VVCA9IEFQS19JTlNUQUxMX1RJTUVPVVQgKiAyO1xuY29uc3QgREVGQVVMVF9BREJfRVhFQ19USU1FT1VUID0gMjAwMDA7IC8vIGluIG1pbGxpc2Vjb25kc1xuXG4vKipcbiAqIEB0eXBlZGVmIHtPYmplY3R9IFBsYXRmb3JtSW5mb1xuICogQHByb3BlcnR5IHs/c3RyaW5nfSBwbGF0Zm9ybSAtIFRoZSBwbGF0Zm9ybSBuYW1lLCBmb3IgZXhhbXBsZSBgYW5kcm9pZC0yNGBcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvciBgbnVsbGAgaWYgaXQgY2Fubm90IGJlIGZvdW5kXG4gKiBAcHJvcGVydHkgez9zdHJpbmd9IHBsYXRmb3JtUGF0aCAtIEZ1bGwgcGF0aCB0byB0aGUgcGxhdGZvcm0gU0RLIGZvbGRlclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvciBgbnVsbGAgaWYgaXQgY2Fubm90IGJlIGZvdW5kXG4gKi9cblxuLyoqXG4gKiBSZXRyaWV2ZSB0aGUgcGF0aCB0byB0aGUgcmVjZW50IGluc3RhbGxlZCBBbmRyb2lkIHBsYXRmb3JtLlxuICpcbiAqIEByZXR1cm4ge1BsYXRmb3JtSW5mb30gVGhlIHJlc3VsdGluZyBwYXRoIHRvIHRoZSBuZXdlc3QgaW5zdGFsbGVkIHBsYXRmb3JtLlxuICovXG5hc3luYyBmdW5jdGlvbiBnZXRBbmRyb2lkUGxhdGZvcm1BbmRQYXRoICgpIHtcbiAgY29uc3Qgc2RrUm9vdCA9IHByb2Nlc3MuZW52LkFORFJPSURfSE9NRSB8fCBwcm9jZXNzLmVudi5BTkRST0lEX1NES19ST09UO1xuICBpZiAoXy5pc0VtcHR5KHNka1Jvb3QpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdOZWl0aGVyIEFORFJPSURfSE9NRSBub3IgQU5EUk9JRF9TREtfUk9PVCBlbnZpcm9ubWVudCB2YXJpYWJsZSB3YXMgZXhwb3J0ZWQnKTtcbiAgfVxuXG4gIGxldCBwcm9wc1BhdGhzID0gYXdhaXQgZnMuZ2xvYihwYXRoLnJlc29sdmUoc2RrUm9vdCwgJ3BsYXRmb3JtcycsICcqJywgJ2J1aWxkLnByb3AnKSwge1xuICAgIGFic29sdXRlOiB0cnVlXG4gIH0pO1xuICBjb25zdCBwbGF0Zm9ybXNNYXBwaW5nID0ge307XG4gIGZvciAoY29uc3QgcHJvcHNQYXRoIG9mIHByb3BzUGF0aHMpIHtcbiAgICBjb25zdCBwcm9wc0NvbnRlbnQgPSBhd2FpdCBmcy5yZWFkRmlsZShwcm9wc1BhdGgsICd1dGYtOCcpO1xuICAgIGNvbnN0IHBsYXRmb3JtUGF0aCA9IHBhdGguZGlybmFtZShwcm9wc1BhdGgpO1xuICAgIGNvbnN0IHBsYXRmb3JtID0gcGF0aC5iYXNlbmFtZShwbGF0Zm9ybVBhdGgpO1xuICAgIGNvbnN0IG1hdGNoID0gL3JvXFwuYnVpbGRcXC52ZXJzaW9uXFwuc2RrPShcXGQrKS8uZXhlYyhwcm9wc0NvbnRlbnQpO1xuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIGxvZy53YXJuKGBDYW5ub3QgcmVhZCB0aGUgU0RLIHZlcnNpb24gZnJvbSAnJHtwcm9wc1BhdGh9Jy4gU2tpcHBpbmcgJyR7cGxhdGZvcm19J2ApO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHBsYXRmb3Jtc01hcHBpbmdbcGFyc2VJbnQobWF0Y2hbMV0sIDEwKV0gPSB7XG4gICAgICBwbGF0Zm9ybSxcbiAgICAgIHBsYXRmb3JtUGF0aCxcbiAgICB9O1xuICB9XG4gIGlmIChfLmlzRW1wdHkocGxhdGZvcm1zTWFwcGluZykpIHtcbiAgICBsb2cud2FybihgRm91bmQgemVybyBwbGF0Zm9ybSBmb2xkZXJzIGF0ICcke3BhdGgucmVzb2x2ZShzZGtSb290LCAncGxhdGZvcm1zJyl9Jy4gYCArXG4gICAgICBgRG8geW91IGhhdmUgYW55IEFuZHJvaWQgU0RLcyBpbnN0YWxsZWQ/YCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHBsYXRmb3JtOiBudWxsLFxuICAgICAgcGxhdGZvcm1QYXRoOiBudWxsLFxuICAgIH07XG4gIH1cblxuICBjb25zdCByZWNlbnRTZGtWZXJzaW9uID0gXy5rZXlzKHBsYXRmb3Jtc01hcHBpbmcpLnNvcnQoKS5yZXZlcnNlKClbMF07XG4gIGNvbnN0IHJlc3VsdCA9IHBsYXRmb3Jtc01hcHBpbmdbcmVjZW50U2RrVmVyc2lvbl07XG4gIGxvZy5kZWJ1ZyhgRm91bmQgdGhlIG1vc3QgcmVjZW50IEFuZHJvaWQgcGxhdGZvcm06ICR7SlNPTi5zdHJpbmdpZnkocmVzdWx0KX1gKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gdW56aXBGaWxlICh6aXBQYXRoLCBkc3RSb290ID0gcGF0aC5kaXJuYW1lKHppcFBhdGgpKSB7XG4gIGxvZy5kZWJ1ZyhgVW56aXBwaW5nICcke3ppcFBhdGh9JyB0byAnJHtkc3RSb290fSdgKTtcbiAgYXdhaXQgemlwLmFzc2VydFZhbGlkWmlwKHppcFBhdGgpO1xuICBhd2FpdCB6aXAuZXh0cmFjdEFsbFRvKHppcFBhdGgsIGRzdFJvb3QpO1xuICBsb2cuZGVidWcoJ1VuemlwIHN1Y2Nlc3NmdWwnKTtcbn1cblxuZnVuY3Rpb24gZ2V0SU1FTGlzdEZyb21PdXRwdXQgKHN0ZG91dCkge1xuICBsZXQgZW5naW5lcyA9IFtdO1xuICBmb3IgKGxldCBsaW5lIG9mIHN0ZG91dC5zcGxpdCgnXFxuJykpIHtcbiAgICBpZiAobGluZS5sZW5ndGggPiAwICYmIGxpbmVbMF0gIT09ICcgJykge1xuICAgICAgLy8gcmVtb3ZlIG5ld2xpbmUgYW5kIHRyYWlsaW5nIGNvbG9uLCBhbmQgYWRkIHRvIHRoZSBsaXN0XG4gICAgICBlbmdpbmVzLnB1c2gobGluZS50cmltKCkucmVwbGFjZSgvOiQvLCAnJykpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZW5naW5lcztcbn1cblxuY29uc3QgZ2V0SmF2YUZvck9zID0gXy5tZW1vaXplKCgpID0+IHtcbiAgcmV0dXJuIHBhdGgucmVzb2x2ZShnZXRKYXZhSG9tZSgpLCAnYmluJywgYGphdmEke3N5c3RlbS5pc1dpbmRvd3MoKSA/ICcuZXhlJyA6ICcnfWApO1xufSk7XG5cbmNvbnN0IGdldE9wZW5Tc2xGb3JPcyA9IGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgY29uc3QgYmluYXJ5TmFtZSA9IGBvcGVuc3NsJHtzeXN0ZW0uaXNXaW5kb3dzKCkgPyAnLmV4ZScgOiAnJ31gO1xuICB0cnkge1xuICAgIHJldHVybiBhd2FpdCBmcy53aGljaChiaW5hcnlOYW1lKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgb3BlbnNzbCB0b29sIG11c3QgYmUgaW5zdGFsbGVkIG9uIHRoZSBzeXN0ZW0gYW5kIGF2YWlsYWJsZSBvbiB0aGUgcGF0aCcpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBnZXRKYXZhSG9tZSAoKSB7XG4gIGlmIChwcm9jZXNzLmVudi5KQVZBX0hPTUUpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnYuSkFWQV9IT01FO1xuICB9XG4gIHRocm93IG5ldyBFcnJvcignSkFWQV9IT01FIGlzIG5vdCBzZXQgY3VycmVudGx5LiBQbGVhc2Ugc2V0IEpBVkFfSE9NRS4nKTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGFic29sdXRlIHBhdGggdG8gYXBrc2lnbmVyIHRvb2xcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gc3lzSGVscGVycyAtIEFuIGluc3RhbmNlIGNvbnRhaW5pbmcgc3lzdGVtQ2FsbE1ldGhvZHMgaGVscGVyIG1ldGhvZHNcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEFuIGFic29sdXRlIHBhdGggdG8gYXBrc2lnbmVyIHRvb2wuXG4gKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHRvb2wgaXMgbm90IHByZXNlbnQgb24gdGhlIGxvY2FsIGZpbGUgc3lzdGVtLlxuICovXG5hc3luYyBmdW5jdGlvbiBnZXRBcGtzaWduZXJGb3JPcyAoc3lzSGVscGVycykge1xuICByZXR1cm4gYXdhaXQgc3lzSGVscGVycy5nZXRCaW5hcnlGcm9tU2RrUm9vdCgnYXBrc2lnbmVyJyk7XG59XG5cbi8qKlxuICogR2V0IHRoZSBhYnNvbHV0ZSBwYXRoIHRvIGFwa2FuYWx5emVyIHRvb2wuXG4gKiBodHRwczovL2RldmVsb3Blci5hbmRyb2lkLmNvbS9zdHVkaW8vY29tbWFuZC1saW5lL2Fwa2FuYWx5emVyLmh0bWxcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gc3lzSGVscGVycyAtIEFuIGluc3RhbmNlIGNvbnRhaW5pbmcgc3lzdGVtQ2FsbE1ldGhvZHMgaGVscGVyIG1ldGhvZHNcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEFuIGFic29sdXRlIHBhdGggdG8gYXBrYW5hbHl6ZXIgdG9vbC5cbiAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgdG9vbCBpcyBub3QgcHJlc2VudCBvbiB0aGUgbG9jYWwgZmlsZSBzeXN0ZW0uXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldEFwa2FuYWx5emVyRm9yT3MgKHN5c0hlbHBlcnMpIHtcbiAgcmV0dXJuIGF3YWl0IHN5c0hlbHBlcnMuZ2V0QmluYXJ5RnJvbVNka1Jvb3QoJ2Fwa2FuYWx5emVyJyk7XG59XG5cbi8qKlxuICogQ2hlY2tzIG1TaG93aW5nTG9ja3NjcmVlbiBvciBtRHJlYW1pbmdMb2Nrc2NyZWVuIGluIGR1bXBzeXMgb3V0cHV0IHRvIGRldGVybWluZVxuICogaWYgbG9jayBzY3JlZW4gaXMgc2hvd2luZ1xuICpcbiAqIEEgbm90ZTogYGFkYiBzaGVsbCBkdW1wc3lzIHRydXN0YCBwZXJmb3JtcyBiZXR0ZXIgd2hpbGUgZGV0ZWN0aW5nIHRoZSBsb2NrZWQgc2NyZWVuIHN0YXRlXG4gKiBpbiBjb21wYXJpc29uIHRvIGBhZGIgZHVtcHN5cyB3aW5kb3dgIG91dHB1dCBwYXJzaW5nLlxuICogQnV0IHRoZSB0cnVzdCBjb21tYW5kIGRvZXMgbm90IHdvcmsgZm9yIGBTd2lwZWAgdW5sb2NrIHBhdHRlcm4uXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGR1bXBzeXMgLSBUaGUgb3V0cHV0IG9mIGR1bXBzeXMgd2luZG93IGNvbW1hbmQuXG4gKiBAcmV0dXJuIHtib29sZWFufSBUcnVlIGlmIGxvY2sgc2NyZWVuIGlzIHNob3dpbmcuXG4gKi9cbmZ1bmN0aW9uIGlzU2hvd2luZ0xvY2tzY3JlZW4gKGR1bXBzeXMpIHtcbiAgcmV0dXJuIC8obVNob3dpbmdMb2Nrc2NyZWVuPXRydWV8bURyZWFtaW5nTG9ja3NjcmVlbj10cnVlKS9naS50ZXN0KGR1bXBzeXMpO1xufVxuXG4vKlxuICogQ2hlY2tzIG1DdXJyZW50Rm9jdXMgaW4gZHVtcHN5cyBvdXRwdXQgdG8gZGV0ZXJtaW5lIGlmIEtleWd1YXJkIGlzIGFjdGl2YXRlZFxuICovXG5mdW5jdGlvbiBpc0N1cnJlbnRGb2N1c09uS2V5Z3VhcmQgKGR1bXBzeXMpIHtcbiAgbGV0IG0gPSAvbUN1cnJlbnRGb2N1cy4rS2V5Z3VhcmQvZ2kuZXhlYyhkdW1wc3lzKTtcbiAgcmV0dXJuIChtICYmIG0ubGVuZ3RoICYmIG1bMF0pID8gdHJ1ZSA6IGZhbHNlO1xufVxuXG4vKlxuICogUmVhZHMgU3VyZmFjZU9yaWVudGF0aW9uIGluIGR1bXBzeXMgb3V0cHV0XG4gKi9cbmZ1bmN0aW9uIGdldFN1cmZhY2VPcmllbnRhdGlvbiAoZHVtcHN5cykge1xuICBsZXQgbSA9IC9TdXJmYWNlT3JpZW50YXRpb246IFxcZC9naS5leGVjKGR1bXBzeXMpO1xuICByZXR1cm4gbSAmJiBwYXJzZUludChtWzBdLnNwbGl0KCc6JylbMV0sIDEwKTtcbn1cblxuLypcbiAqIENoZWNrcyBtU2NyZWVuT25GdWxseSBpbiBkdW1wc3lzIG91dHB1dCB0byBkZXRlcm1pbmUgaWYgc2NyZWVuIGlzIHNob3dpbmdcbiAqIERlZmF1bHQgaXMgdHJ1ZVxuICovXG5mdW5jdGlvbiBpc1NjcmVlbk9uRnVsbHkgKGR1bXBzeXMpIHtcbiAgbGV0IG0gPSAvbVNjcmVlbk9uRnVsbHk9XFx3Ky9naS5leGVjKGR1bXBzeXMpO1xuICByZXR1cm4gIW0gfHwgLy8gaWYgaW5mb3JtYXRpb24gaXMgbWlzc2luZyB3ZSBhc3N1bWUgc2NyZWVuIGlzIGZ1bGx5IG9uXG4gICAgICAgICAobSAmJiBtLmxlbmd0aCA+IDAgJiYgbVswXS5zcGxpdCgnPScpWzFdID09PSAndHJ1ZScpIHx8IGZhbHNlO1xufVxuXG4vKipcbiAqIEJ1aWxkcyBjb21tYW5kIGxpbmUgcmVwcmVzZW50YXRpb24gZm9yIHRoZSBnaXZlblxuICogYXBwbGljYXRpb24gc3RhcnR1cCBvcHRpb25zXG4gKlxuICogQHBhcmFtIHtTdGFydEFwcE9wdGlvbnN9IHN0YXJ0QXBwT3B0aW9ucyAtIEFwcGxpY2F0aW9uIG9wdGlvbnMgbWFwcGluZ1xuICogQHBhcmFtIHtudW1iZXJ9IGFwaUxldmVsIC0gVGhlIGFjdHVhbCBPUyBBUEkgbGV2ZWxcbiAqIEByZXR1cm5zIHtBcnJheTxTdHJpbmc+fSBUaGUgYWN0dWFsIGNvbW1hbmQgbGluZSBhcnJheVxuICovXG5mdW5jdGlvbiBidWlsZFN0YXJ0Q21kIChzdGFydEFwcE9wdGlvbnMsIGFwaUxldmVsKSB7XG4gIGNvbnN0IHtcbiAgICB1c2VyLFxuICAgIHdhaXRGb3JMYXVuY2gsXG4gICAgcGtnLFxuICAgIGFjdGl2aXR5LFxuICAgIGFjdGlvbixcbiAgICBjYXRlZ29yeSxcbiAgICBzdG9wQXBwLFxuICAgIGZsYWdzLFxuICB9ID0gc3RhcnRBcHBPcHRpb25zO1xuICBjb25zdCBjbWQgPSBbJ2FtJywgJ3N0YXJ0J107XG4gIGlmICh1dGlsLmhhc1ZhbHVlKHVzZXIpKSB7XG4gICAgY21kLnB1c2goJy0tdXNlcicsIHVzZXIpO1xuICB9XG4gIGlmICh3YWl0Rm9yTGF1bmNoKSB7XG4gICAgY21kLnB1c2goJy1XJyk7XG4gIH1cbiAgY21kLnB1c2goJy1uJywgYCR7cGtnfS8ke2FjdGl2aXR5fWApO1xuICBpZiAoc3RvcEFwcCAmJiBhcGlMZXZlbCA+PSAxNSkge1xuICAgIGNtZC5wdXNoKCctUycpO1xuICB9XG4gIGlmIChhY3Rpb24pIHtcbiAgICBjbWQucHVzaCgnLWEnLCBhY3Rpb24pO1xuICB9XG4gIGlmIChjYXRlZ29yeSkge1xuICAgIGNtZC5wdXNoKCctYycsIGNhdGVnb3J5KTtcbiAgfVxuICBpZiAoZmxhZ3MpIHtcbiAgICBjbWQucHVzaCgnLWYnLCBmbGFncyk7XG4gIH1cbiAgaWYgKHN0YXJ0QXBwT3B0aW9ucy5vcHRpb25hbEludGVudEFyZ3VtZW50cykge1xuICAgIC8vIGV4cGVjdCBvcHRpb25hbEludGVudEFyZ3VtZW50cyB0byBiZSBhIHNpbmdsZSBzdHJpbmcgb2YgdGhlIGZvcm06XG4gICAgLy8gICAgIFwiLWZsYWcga2V5XCJcbiAgICAvLyAgICAgXCItZmxhZyBrZXkgdmFsdWVcIlxuICAgIC8vIG9yIGEgY29tYmluYXRpb24gb2YgdGhlc2UgKGUuZy4sIFwiLWZsYWcxIGtleTEgLWZsYWcyIGtleTIgdmFsdWUyXCIpXG5cbiAgICAvLyB0YWtlIGEgc3RyaW5nIGFuZCBwYXJzZSBvdXQgdGhlIHBhcnQgYmVmb3JlIGFueSBzcGFjZXMsIGFuZCBhbnl0aGluZyBhZnRlclxuICAgIC8vIHRoZSBmaXJzdCBzcGFjZVxuICAgIGxldCBwYXJzZUtleVZhbHVlID0gZnVuY3Rpb24gKHN0cikge1xuICAgICAgc3RyID0gc3RyLnRyaW0oKTtcbiAgICAgIGxldCBzcGFjZSA9IHN0ci5pbmRleE9mKCcgJyk7XG4gICAgICBpZiAoc3BhY2UgPT09IC0xKSB7XG4gICAgICAgIHJldHVybiBzdHIubGVuZ3RoID8gW3N0cl0gOiBbXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBbc3RyLnN1YnN0cmluZygwLCBzcGFjZSkudHJpbSgpLCBzdHIuc3Vic3RyaW5nKHNwYWNlICsgMSkudHJpbSgpXTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gY3ljbGUgdGhyb3VnaCB0aGUgb3B0aW9uYWxJbnRlbnRBcmd1bWVudHMgYW5kIHB1bGwgb3V0IHRoZSBhcmd1bWVudHNcbiAgICAvLyBhZGQgYSBzcGFjZSBpbml0aWFsbHkgc28gZmxhZ3MgY2FuIGJlIGRpc3Rpbmd1aXNoZWQgZnJvbSBhcmd1bWVudHMgdGhhdFxuICAgIC8vIGhhdmUgaW50ZXJuYWwgaHlwaGVuc1xuICAgIGxldCBvcHRpb25hbEludGVudEFyZ3VtZW50cyA9IGAgJHtzdGFydEFwcE9wdGlvbnMub3B0aW9uYWxJbnRlbnRBcmd1bWVudHN9YDtcbiAgICBsZXQgcmUgPSAvICgtW15cXHNdKykgKC4rKS87XG4gICAgd2hpbGUgKHRydWUpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25zdGFudC1jb25kaXRpb25cbiAgICAgIGxldCBhcmdzID0gcmUuZXhlYyhvcHRpb25hbEludGVudEFyZ3VtZW50cyk7XG4gICAgICBpZiAoIWFyZ3MpIHtcbiAgICAgICAgaWYgKG9wdGlvbmFsSW50ZW50QXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgIC8vIG5vIG1vcmUgZmxhZ3MsIHNvIHRoZSByZW1haW5kZXIgY2FuIGJlIHRyZWF0ZWQgYXMgJ2tleScgb3IgJ2tleSB2YWx1ZSdcbiAgICAgICAgICBjbWQucHVzaC5hcHBseShjbWQsIHBhcnNlS2V5VmFsdWUob3B0aW9uYWxJbnRlbnRBcmd1bWVudHMpKTtcbiAgICAgICAgfVxuICAgICAgICAvLyB3ZSBhcmUgZG9uZVxuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgLy8gdGFrZSB0aGUgZmxhZyBhbmQgc2VlIGlmIGl0IGlzIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmluZ1xuICAgICAgLy8gaWYgaXQgaXMgbm90LCB0aGVuIGl0IG1lYW5zIHdlIGhhdmUgYmVlbiB0aHJvdWdoIGFscmVhZHksIGFuZFxuICAgICAgLy8gd2hhdCBpcyBiZWZvcmUgdGhlIGZsYWcgaXMgdGhlIGFyZ3VtZW50IGZvciB0aGUgcHJldmlvdXMgZmxhZ1xuICAgICAgbGV0IGZsYWcgPSBhcmdzWzFdO1xuICAgICAgbGV0IGZsYWdQb3MgPSBvcHRpb25hbEludGVudEFyZ3VtZW50cy5pbmRleE9mKGZsYWcpO1xuICAgICAgaWYgKGZsYWdQb3MgIT09IDApIHtcbiAgICAgICAgbGV0IHByZXZBcmdzID0gb3B0aW9uYWxJbnRlbnRBcmd1bWVudHMuc3Vic3RyaW5nKDAsIGZsYWdQb3MpO1xuICAgICAgICBjbWQucHVzaC5hcHBseShjbWQsIHBhcnNlS2V5VmFsdWUocHJldkFyZ3MpKTtcbiAgICAgIH1cblxuICAgICAgLy8gYWRkIHRoZSBmbGFnLCBhcyB0aGVyZSBhcmUgbm8gbW9yZSBlYXJsaWVyIGFyZ3VtZW50c1xuICAgICAgY21kLnB1c2goZmxhZyk7XG5cbiAgICAgIC8vIG1ha2Ugb3B0aW9uYWxJbnRlbnRBcmd1bWVudHMgaG9sZCB0aGUgcmVtYWluZGVyXG4gICAgICBvcHRpb25hbEludGVudEFyZ3VtZW50cyA9IGFyZ3NbMl07XG4gICAgfVxuICB9XG4gIHJldHVybiBjbWQ7XG59XG5cbmNvbnN0IGdldFNka1Rvb2xzVmVyc2lvbiA9IF8ubWVtb2l6ZShhc3luYyBmdW5jdGlvbiBnZXRTZGtUb29sc1ZlcnNpb24gKCkge1xuICBjb25zdCBhbmRyb2lkSG9tZSA9IHByb2Nlc3MuZW52LkFORFJPSURfSE9NRTtcbiAgaWYgKCFhbmRyb2lkSG9tZSkge1xuICAgIHRocm93IG5ldyBFcnJvcignQU5EUk9JRF9IT01FIGVudmlyb25tZW50IHZhcmlhYmxlIGlzIGV4cGVjdGVkIHRvIGJlIHNldCcpO1xuICB9XG4gIGNvbnN0IHByb3BlcnRpZXNQYXRoID0gcGF0aC5yZXNvbHZlKGFuZHJvaWRIb21lLCAndG9vbHMnLCAnc291cmNlLnByb3BlcnRpZXMnKTtcbiAgaWYgKCFhd2FpdCBmcy5leGlzdHMocHJvcGVydGllc1BhdGgpKSB7XG4gICAgbG9nLndhcm4oYENhbm5vdCBmaW5kICR7cHJvcGVydGllc1BhdGh9IGZpbGUgdG8gcmVhZCBTREsgdmVyc2lvbiBmcm9tYCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHByb3BlcnRpZXNDb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUocHJvcGVydGllc1BhdGgsICd1dGY4Jyk7XG4gIGNvbnN0IHZlcnNpb25NYXRjaGVyID0gbmV3IFJlZ0V4cCgvUGtnXFwuUmV2aXNpb249KFxcZCspXFwuPyhcXGQrKT9cXC4/KFxcZCspPy8pO1xuICBjb25zdCBtYXRjaCA9IHZlcnNpb25NYXRjaGVyLmV4ZWMocHJvcGVydGllc0NvbnRlbnQpO1xuICBpZiAobWF0Y2gpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbWFqb3I6IHBhcnNlSW50KG1hdGNoWzFdLCAxMCksXG4gICAgICBtaW5vcjogbWF0Y2hbMl0gPyBwYXJzZUludChtYXRjaFsyXSwgMTApIDogMCxcbiAgICAgIGJ1aWxkOiBtYXRjaFszXSA/IHBhcnNlSW50KG1hdGNoWzNdLCAxMCkgOiAwXG4gICAgfTtcbiAgfVxuICBsb2cud2FybihgQ2Fubm90IHBhcnNlIFwiUGtnLlJldmlzaW9uXCIgdmFsdWUgZnJvbSAke3Byb3BlcnRpZXNQYXRofWApO1xufSk7XG5cbi8qKlxuICogUmV0cmlldmVzIGZ1bGwgcGF0aHMgdG8gYWxsICdidWlsZC10b29scycgc3ViZm9sZGVycyB1bmRlciB0aGUgcGFydGljdWxhclxuICogU0RLIHJvb3QgZm9sZGVyXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHNka1Jvb3QgLSBUaGUgZnVsbCBwYXRoIHRvIHRoZSBBbmRyb2lkIFNESyByb290IGZvbGRlclxuICogQHJldHVybnMge0FycmF5PHN0cmluZz59IFRoZSBmdWxsIHBhdGhzIHRvIHRoZSByZXN1bHRpbmcgZm9sZGVycyBzb3J0ZWQgYnlcbiAqIG1vZGlmaWNhdGlvbiBkYXRlICh0aGUgbmV3ZXN0IGNvbWVzIGZpcnN0KSBvciBhbiBlbXB0eSBsaXN0IGlmIG5vIG1hY3RoZXMgd2VyZSBmb3VuZFxuICovXG5jb25zdCBnZXRCdWlsZFRvb2xzRGlycyA9IF8ubWVtb2l6ZShhc3luYyBmdW5jdGlvbiBnZXRCdWlsZFRvb2xzRGlycyAoc2RrUm9vdCkge1xuICBsZXQgYnVpbGRUb29sc0RpcnMgPSBhd2FpdCBmcy5nbG9iKHBhdGgucmVzb2x2ZShzZGtSb290LCAnYnVpbGQtdG9vbHMnLCAnKicpLCB7YWJzb2x1dGU6IHRydWV9KTtcbiAgdHJ5IHtcbiAgICBidWlsZFRvb2xzRGlycyA9IGJ1aWxkVG9vbHNEaXJzXG4gICAgICAubWFwKChkaXIpID0+IFtwYXRoLmJhc2VuYW1lKGRpciksIGRpcl0pXG4gICAgICAuc29ydCgoYSwgYikgPT4gc2VtdmVyLnJjb21wYXJlKGFbMF0sIGJbMF0pKVxuICAgICAgLm1hcCgocGFpcikgPT4gcGFpclsxXSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGxvZy53YXJuKGBDYW5ub3Qgc29ydCBidWlsZC10b29scyBmb2xkZXJzICR7SlNPTi5zdHJpbmdpZnkoYnVpbGRUb29sc0RpcnMubWFwKChkaXIpID0+IHBhdGguYmFzZW5hbWUoZGlyKSkpfSBgICtcbiAgICAgIGBieSBzZW1hbnRpYyB2ZXJzaW9uIG5hbWVzLmApO1xuICAgIGxvZy53YXJuKGBGYWxsaW5nIGJhY2sgdG8gc29ydGluZyBieSBtb2RpZmljYXRpb24gZGF0ZS4gT3JpZ2luYWwgZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgY29uc3QgcGFpcnMgPSBhd2FpdCBCLm1hcChidWlsZFRvb2xzRGlycywgYXN5bmMgKGRpcikgPT4gWyhhd2FpdCBmcy5zdGF0KGRpcikpLm10aW1lLnZhbHVlT2YoKSwgZGlyXSk7XG4gICAgYnVpbGRUb29sc0RpcnMgPSBwYWlyc1xuICAgICAgLnNvcnQoKGEsIGIpID0+IGFbMF0gPCBiWzBdKVxuICAgICAgLm1hcCgocGFpcikgPT4gcGFpclsxXSk7XG4gIH1cbiAgbG9nLmluZm8oYEZvdW5kICR7YnVpbGRUb29sc0RpcnMubGVuZ3RofSAnYnVpbGQtdG9vbHMnIGZvbGRlcnMgdW5kZXIgJyR7c2RrUm9vdH0nIChuZXdlc3QgZmlyc3QpOmApO1xuICBmb3IgKGxldCBkaXIgb2YgYnVpbGRUb29sc0RpcnMpIHtcbiAgICBsb2cuaW5mbyhgICAgICR7ZGlyfWApO1xuICB9XG4gIHJldHVybiBidWlsZFRvb2xzRGlycztcbn0pO1xuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgbGlzdCBvZiBwZXJtaXNzaW9uIG5hbWVzIGVuY29kZWQgaW4gYGR1bXBzeXMgcGFja2FnZWAgY29tbWFuZCBvdXRwdXQuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGR1bXBzeXNPdXRwdXQgLSBUaGUgYWN0dWFsIGNvbW1hbmQgb3V0cHV0LlxuICogQHBhcmFtIHtBcnJheTxzdHJpbmc+fSBncm91cE5hbWVzIC0gVGhlIGxpc3Qgb2YgZ3JvdXAgbmFtZXMgdG8gbGlzdCBwZXJtaXNzaW9ucyBmb3IuXG4gKiBAcGFyYW0gez9ib29sZWFufSBncmFudGVkU3RhdGUgLSBUaGUgZXhwZWN0ZWQgc3RhdGUgb2YgYGdyYW50ZWRgIGF0dHJpYnV0ZSB0byBmaWx0ZXIgd2l0aC5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE5vIGZpbHRlcmluZyBpcyBkb25lIGlmIHRoZSBwYXJhbWV0ZXIgaXMgbm90IHNldC5cbiAqIEByZXR1cm5zIHtBcnJheTxzdHJpbmc+fSBUaGUgbGlzdCBvZiBtYXRjaGVkIHBlcm1pc3Npb24gbmFtZXMgb3IgYW4gZW1wdHkgbGlzdCBpZiBubyBtYXRjaGVzIHdlcmUgZm91bmQuXG4gKi9cbmNvbnN0IGV4dHJhY3RNYXRjaGluZ1Blcm1pc3Npb25zID0gZnVuY3Rpb24gKGR1bXBzeXNPdXRwdXQsIGdyb3VwTmFtZXMsIGdyYW50ZWRTdGF0ZSA9IG51bGwpIHtcbiAgY29uc3QgZ3JvdXBQYXR0ZXJuQnlOYW1lID0gKGdyb3VwTmFtZSkgPT4gbmV3IFJlZ0V4cChgXihcXFxccyoke18uZXNjYXBlUmVnRXhwKGdyb3VwTmFtZSl9IHBlcm1pc3Npb25zOltcXFxcc1xcXFxTXSspYCwgJ20nKTtcbiAgY29uc3QgaW5kZW50UGF0dGVybiA9IC9cXFN8JC87XG4gIGNvbnN0IHBlcm1pc3Npb25OYW1lUGF0dGVybiA9IC9hbmRyb2lkXFwucGVybWlzc2lvblxcLlxcdysvO1xuICBjb25zdCBncmFudGVkU3RhdGVQYXR0ZXJuID0gL1xcYmdyYW50ZWQ9KFxcdyspLztcbiAgY29uc3QgcmVzdWx0ID0gW107XG4gIGZvciAoY29uc3QgZ3JvdXBOYW1lIG9mIGdyb3VwTmFtZXMpIHtcbiAgICBjb25zdCBncm91cE1hdGNoID0gZ3JvdXBQYXR0ZXJuQnlOYW1lKGdyb3VwTmFtZSkuZXhlYyhkdW1wc3lzT3V0cHV0KTtcbiAgICBpZiAoIWdyb3VwTWF0Y2gpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGxpbmVzID0gZ3JvdXBNYXRjaFsxXS5zcGxpdCgnXFxuJyk7XG4gICAgaWYgKGxpbmVzLmxlbmd0aCA8IDIpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IHRpdGxlSW5kZW50ID0gbGluZXNbMF0uc2VhcmNoKGluZGVudFBhdHRlcm4pO1xuICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcy5zbGljZSgxKSkge1xuICAgICAgY29uc3QgY3VycmVudEluZGVudCA9IGxpbmUuc2VhcmNoKGluZGVudFBhdHRlcm4pO1xuICAgICAgaWYgKGN1cnJlbnRJbmRlbnQgPD0gdGl0bGVJbmRlbnQpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHBlcm1pc3Npb25OYW1lTWF0Y2ggPSBwZXJtaXNzaW9uTmFtZVBhdHRlcm4uZXhlYyhsaW5lKTtcbiAgICAgIGlmICghcGVybWlzc2lvbk5hbWVNYXRjaCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGl0ZW0gPSB7XG4gICAgICAgIHBlcm1pc3Npb246IHBlcm1pc3Npb25OYW1lTWF0Y2hbMF0sXG4gICAgICB9O1xuICAgICAgY29uc3QgZ3JhbnRlZFN0YXRlTWF0Y2ggPSBncmFudGVkU3RhdGVQYXR0ZXJuLmV4ZWMobGluZSk7XG4gICAgICBpZiAoZ3JhbnRlZFN0YXRlTWF0Y2gpIHtcbiAgICAgICAgaXRlbS5ncmFudGVkID0gZ3JhbnRlZFN0YXRlTWF0Y2hbMV0gPT09ICd0cnVlJztcbiAgICAgIH1cbiAgICAgIHJlc3VsdC5wdXNoKGl0ZW0pO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGZpbHRlcmVkUmVzdWx0ID0gcmVzdWx0XG4gICAgLmZpbHRlcigoaXRlbSkgPT4gIV8uaXNCb29sZWFuKGdyYW50ZWRTdGF0ZSkgfHwgaXRlbS5ncmFudGVkID09PSBncmFudGVkU3RhdGUpXG4gICAgLm1hcCgoaXRlbSkgPT4gaXRlbS5wZXJtaXNzaW9uKTtcbiAgbG9nLmRlYnVnKGBSZXRyaWV2ZWQgJHtmaWx0ZXJlZFJlc3VsdC5sZW5ndGh9IHBlcm1pc3Npb24ocykgZnJvbSAke0pTT04uc3RyaW5naWZ5KGdyb3VwTmFtZXMpfSBncm91cChzKWApO1xuICByZXR1cm4gZmlsdGVyZWRSZXN1bHQ7XG59O1xuXG4vKipcbiAqIEB0eXBlZGVmIHtPYmplY3R9IEluc3RhbGxPcHRpb25zXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IGFsbG93VGVzdFBhY2thZ2VzIFtmYWxzZV0gLSBTZXQgdG8gdHJ1ZSBpbiBvcmRlciB0byBhbGxvdyB0ZXN0XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrYWdlcyBpbnN0YWxsYXRpb24uXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IHVzZVNkY2FyZCBbZmFsc2VdIC0gU2V0IHRvIHRydWUgdG8gaW5zdGFsbCB0aGUgYXBwIG9uIHNkY2FyZFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluc3RlYWQgb2YgdGhlIGRldmljZSBtZW1vcnkuXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IGdyYW50UGVybWlzc2lvbnMgW2ZhbHNlXSAtIFNldCB0byB0cnVlIGluIG9yZGVyIHRvIGdyYW50IGFsbCB0aGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVybWlzc2lvbnMgcmVxdWVzdGVkIGluIHRoZSBhcHBsaWNhdGlvbidzIG1hbmlmZXN0XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9tYXRpY2FsbHkgYWZ0ZXIgdGhlIGluc3RhbGxhdGlvbiBpcyBjb21wbGV0ZWRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZXIgQW5kcm9pZCA2Ky5cbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gcmVwbGFjZSBbdHJ1ZV0gLSBTZXQgaXQgdG8gZmFsc2UgaWYgeW91IGRvbid0IHdhbnRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgYXBwbGljYXRpb24gdG8gYmUgdXBncmFkZWQvcmVpbnN0YWxsZWRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiBpdCBpcyBhbHJlYWR5IHByZXNlbnQgb24gdGhlIGRldmljZS5cbiAqL1xuXG4vKipcbiAqIFRyYW5zZm9ybXMgZ2l2ZW4gb3B0aW9ucyBpbnRvIHRoZSBsaXN0IG9mIGBhZGIgaW5zdGFsbC5pbnN0YWxsLW11bHRpcGxlYCBjb21tYW5kIGFyZ3VtZW50c1xuICpcbiAqIEBwYXJhbSB7bnVtYmVyfSBhcGlMZXZlbCAtIFRoZSBjdXJyZW50IEFQSSBsZXZlbFxuICogQHBhcmFtIHs/SW5zdGFsbE9wdGlvbnN9IG9wdGlvbnMgLSBUaGUgb3B0aW9ucyBtYXBwaW5nIHRvIHRyYW5zZm9ybVxuICogQHJldHVybnMge0FycmF5PFN0cmluZz59IFRoZSBhcnJheSBvZiBhcmd1bWVudHNcbiAqL1xuZnVuY3Rpb24gYnVpbGRJbnN0YWxsQXJncyAoYXBpTGV2ZWwsIG9wdGlvbnMgPSB7fSkge1xuICBjb25zdCByZXN1bHQgPSBbXTtcblxuICBpZiAoIXV0aWwuaGFzVmFsdWUob3B0aW9ucy5yZXBsYWNlKSB8fCBvcHRpb25zLnJlcGxhY2UpIHtcbiAgICByZXN1bHQucHVzaCgnLXInKTtcbiAgfVxuICBpZiAob3B0aW9ucy5hbGxvd1Rlc3RQYWNrYWdlcykge1xuICAgIHJlc3VsdC5wdXNoKCctdCcpO1xuICB9XG4gIGlmIChvcHRpb25zLnVzZVNkY2FyZCkge1xuICAgIHJlc3VsdC5wdXNoKCctcycpO1xuICB9XG4gIGlmIChvcHRpb25zLmdyYW50UGVybWlzc2lvbnMpIHtcbiAgICBpZiAoYXBpTGV2ZWwgPCAyMykge1xuICAgICAgbG9nLmRlYnVnKGBTa2lwcGluZyBwZXJtaXNzaW9ucyBncmFudCBvcHRpb24sIHNpbmNlIGAgK1xuICAgICAgICAgICAgICAgIGB0aGUgY3VycmVudCBBUEkgbGV2ZWwgJHthcGlMZXZlbH0gZG9lcyBub3Qgc3VwcG9ydCBhcHBsaWNhdGlvbnMgYCArXG4gICAgICAgICAgICAgICAgYHBlcm1pc3Npb25zIGN1c3RvbWl6YXRpb25gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0LnB1c2goJy1nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBAdHlwZWRlZiB7T2JqZWN0fSBNYW5pZmVzdEluZm9cbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBwa2cgLSBUaGUgYXBwbGljYXRpb24gaWRlbnRpZmllclxuICogQHByb3BlcnR5IHtzdHJpbmd9IGFjdGl2aXR5IC0gVGhlIG5hbWUgb2YgdGhlIG1haW4gcGFja2FnZSBhY3Rpdml0eVxuICogQHByb3BlcnR5IHs/bnVtYmVyfSB2ZXJzaW9uQ29kZSAtIFRoZSB2ZXJzaW9uIGNvZGUgbnVtYmVyIChtaWdodCBiZSBgTmFOYClcbiAqIEBwcm9wZXJ0eSB7P3N0cmluZ30gdmVyc2lvbk5hbWUgLSBUaGUgdmVyc2lvbiBuYW1lIChtaWdodCBiZSBgbnVsbGApXG4gKi9cblxuLyoqXG4gKiBQZXJmb3JtIHBhcnNpbmcgb2YgdGhlIG1hbmlmZXN0IG9iamVjdCBpbiBvcmRlclxuICogdG8gZXh0cmFjdCBzb21lIHZpdGFsIHZhbHVlcyBmcm9tIGl0XG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG1hbmlmZXN0IFRoZSBtYW5pZmVzdCBjb250ZW50IGZvcm1hdHRlZCBhcyBKU09OXG4gKiBTZWUgaHR0cHM6Ly93d3cubnBtanMuY29tL3BhY2thZ2UvYWRia2l0LWFwa3JlYWRlciBmb3IgZGV0YWlsZWQgZm9ybWF0IGRlc2NyaXB0aW9uXG4gKiBAcmV0dXJucyB7TWFuaWZlc3RJbmZvfVxuICovXG5mdW5jdGlvbiBwYXJzZU1hbmlmZXN0IChtYW5pZmVzdCkge1xuICBjb25zdCByZXN1bHQgPSB7XG4gICAgcGtnOiBtYW5pZmVzdC5wYWNrYWdlLFxuICAgIHZlcnNpb25Db2RlOiBwYXJzZUludChtYW5pZmVzdC52ZXJzaW9uQ29kZSwgMTApLFxuICAgIHZlcnNpb25OYW1lOiBtYW5pZmVzdC52ZXJzaW9uTmFtZSB8fCBudWxsLFxuICB9O1xuICBpZiAoIW1hbmlmZXN0LmFwcGxpY2F0aW9uKSB7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIExvb2sgZm9yIGVuYWJsZWQgYWN0aXZpdHkgb3IgYWN0aXZpdHktYWxpYXMgd2l0aFxuICAvLyBhY3Rpb24gPT0gYW5kcm9pZC5pbnRlbnQuYWN0aW9uLk1BSU4gYW5kXG4gIC8vIGNhdGVnb3J5ID09IGFuZHJvaWQuaW50ZW50LmNhdGVnb3J5LkxBVU5DSEVSXG4gIGZvciAoY29uc3QgYWN0aXZpdHkgb2YgW1xuICAgIC4uLm1hbmlmZXN0LmFwcGxpY2F0aW9uLmFjdGl2aXRpZXMsXG4gICAgLi4ubWFuaWZlc3QuYXBwbGljYXRpb24uYWN0aXZpdHlBbGlhc2VzLFxuICBdKSB7XG4gICAgaWYgKGFjdGl2aXR5LmVuYWJsZWQgPT09IGZhbHNlIHx8IF8uaXNFbXB0eShhY3Rpdml0eS5pbnRlbnRGaWx0ZXJzKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCB7YWN0aW9ucywgY2F0ZWdvcmllc30gb2YgYWN0aXZpdHkuaW50ZW50RmlsdGVycykge1xuICAgICAgaWYgKF8uaXNFbXB0eShhY3Rpb25zKSB8fCBfLmlzRW1wdHkoY2F0ZWdvcmllcykpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGlzTWFpbkFjdGlvbiA9IGFjdGlvbnNcbiAgICAgICAgLnNvbWUoKHtuYW1lfSkgPT4gbmFtZSA9PT0gJ2FuZHJvaWQuaW50ZW50LmFjdGlvbi5NQUlOJyk7XG4gICAgICBjb25zdCBpc0xhdW5jaGVyQ2F0ZWdvcnkgPSBjYXRlZ29yaWVzXG4gICAgICAgIC5zb21lKCh7bmFtZX0pID0+IG5hbWUgPT09ICdhbmRyb2lkLmludGVudC5jYXRlZ29yeS5MQVVOQ0hFUicpO1xuICAgICAgaWYgKGlzTWFpbkFjdGlvbiAmJiBpc0xhdW5jaGVyQ2F0ZWdvcnkpIHtcbiAgICAgICAgcmVzdWx0LmFjdGl2aXR5ID0gYWN0aXZpdHkubmFtZTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBQYXJzZXMgYXBrIHN0cmluZ3MgZnJvbSBhYXB0IHRvb2wgb3V0cHV0XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHJhd091dHB1dCBUaGUgYWN0dWFsIHRvb2wgb3V0cHV0XG4gKiBAcGFyYW0ge3N0cmluZ30gY29uZmlnTWFya2VyIFRoZSBjb25maWcgbWFya2VyLiBVc3VhbGx5XG4gKiBhIGxhbmd1YWdlIGFiYnJldmlhdGlvbiBvciBgKGRlZmF1bHQpYFxuICogQHJldHVybnMge09iamVjdH0gU3RyaW5ncyBpZHMgdG8gdmFsdWVzIG1hcHBpbmcuIFBsdXJhbFxuICogdmFsdWVzIGFyZSByZXByZXNlbnRlZCBhcyBhcnJheXMuIElmIG5vIGNvbmZpZyBmb3VuZCBmb3IgdGhlXG4gKiBnaXZlbiBtYXJrZXIgdGhlbiBhbiBlbXB0eSBtYXBwaW5nIGlzIHJldHVybmVkLlxuICovXG5mdW5jdGlvbiBwYXJzZUFhcHRTdHJpbmdzIChyYXdPdXRwdXQsIGNvbmZpZ01hcmtlcikge1xuICBjb25zdCBub3JtYWxpemVTdHJpbmdNYXRjaCA9IGZ1bmN0aW9uIChzKSB7XG4gICAgcmV0dXJuIHMucmVwbGFjZSgvXCIkLywgJycpLnJlcGxhY2UoL15cIi8sICcnKS5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJyk7XG4gIH07XG5cbiAgY29uc3QgYXBrU3RyaW5ncyA9IHt9O1xuICBsZXQgaXNJbkNvbmZpZyA9IGZhbHNlO1xuICBsZXQgY3VycmVudFJlc291cmNlSWQgPSBudWxsO1xuICBsZXQgaXNJblBsdXJhbEdyb3VwID0gZmFsc2U7XG4gIC8vIFRoZSBwYXR0ZXJuIG1hdGNoZXMgYW55IHF1b3RlZCBjb250ZW50IGluY2x1ZGluZyBlc2NhcGVkIHF1b3Rlc1xuICBjb25zdCBxdW90ZWRTdHJpbmdQYXR0ZXJuID0gL1wiW15cIlxcXFxdKig/OlxcXFwuW15cIlxcXFxdKikqXCIvO1xuICBmb3IgKGNvbnN0IGxpbmUgb2YgcmF3T3V0cHV0LnNwbGl0KG9zLkVPTCkpIHtcbiAgICBjb25zdCB0cmltbWVkTGluZSA9IGxpbmUudHJpbSgpO1xuICAgIGlmIChfLmlzRW1wdHkodHJpbW1lZExpbmUpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoWydjb25maWcnLCAndHlwZScsICdzcGVjJywgJ1BhY2thZ2UnXS5zb21lKCh4KSA9PiB0cmltbWVkTGluZS5zdGFydHNXaXRoKHgpKSkge1xuICAgICAgaXNJbkNvbmZpZyA9IHRyaW1tZWRMaW5lLnN0YXJ0c1dpdGgoYGNvbmZpZyAke2NvbmZpZ01hcmtlcn06YCk7XG4gICAgICBjdXJyZW50UmVzb3VyY2VJZCA9IG51bGw7XG4gICAgICBpc0luUGx1cmFsR3JvdXAgPSBmYWxzZTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICghaXNJbkNvbmZpZykge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHRyaW1tZWRMaW5lLnN0YXJ0c1dpdGgoJ3Jlc291cmNlJykpIHtcbiAgICAgIGlzSW5QbHVyYWxHcm91cCA9IGZhbHNlO1xuICAgICAgY3VycmVudFJlc291cmNlSWQgPSBudWxsO1xuXG4gICAgICBpZiAodHJpbW1lZExpbmUuaW5jbHVkZXMoJzpzdHJpbmcvJykpIHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSAvOnN0cmluZ1xcLyhcXFMrKTovLmV4ZWModHJpbW1lZExpbmUpO1xuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICBjdXJyZW50UmVzb3VyY2VJZCA9IG1hdGNoWzFdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHRyaW1tZWRMaW5lLmluY2x1ZGVzKCc6cGx1cmFscy8nKSkge1xuICAgICAgICBjb25zdCBtYXRjaCA9IC86cGx1cmFsc1xcLyhcXFMrKTovLmV4ZWModHJpbW1lZExpbmUpO1xuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICBjdXJyZW50UmVzb3VyY2VJZCA9IG1hdGNoWzFdO1xuICAgICAgICAgIGlzSW5QbHVyYWxHcm91cCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjdXJyZW50UmVzb3VyY2VJZCAmJiB0cmltbWVkTGluZS5zdGFydHNXaXRoKCcoc3RyaW5nJykpIHtcbiAgICAgIGNvbnN0IG1hdGNoID0gcXVvdGVkU3RyaW5nUGF0dGVybi5leGVjKHRyaW1tZWRMaW5lKTtcbiAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICBhcGtTdHJpbmdzW2N1cnJlbnRSZXNvdXJjZUlkXSA9IG5vcm1hbGl6ZVN0cmluZ01hdGNoKG1hdGNoWzBdKTtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnRSZXNvdXJjZUlkID0gbnVsbDtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjdXJyZW50UmVzb3VyY2VJZCAmJiBpc0luUGx1cmFsR3JvdXAgJiYgdHJpbW1lZExpbmUuaW5jbHVkZXMoJzogKHN0cmluZycpKSB7XG4gICAgICBjb25zdCBtYXRjaCA9IHF1b3RlZFN0cmluZ1BhdHRlcm4uZXhlYyh0cmltbWVkTGluZSk7XG4gICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgYXBrU3RyaW5nc1tjdXJyZW50UmVzb3VyY2VJZF0gPSBbXG4gICAgICAgICAgLi4uKGFwa1N0cmluZ3NbY3VycmVudFJlc291cmNlSWRdIHx8IFtdKSxcbiAgICAgICAgICBub3JtYWxpemVTdHJpbmdNYXRjaChtYXRjaFswXSksXG4gICAgICAgIF07XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFwa1N0cmluZ3M7XG59XG5cbi8qKlxuICogUGFyc2VzIGFwayBzdHJpbmdzIGZyb20gYWFwdDIgdG9vbCBvdXRwdXRcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gcmF3T3V0cHV0IFRoZSBhY3R1YWwgdG9vbCBvdXRwdXRcbiAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWdNYXJrZXIgVGhlIGNvbmZpZyBtYXJrZXIuIFVzdWFsbHlcbiAqIGEgbGFuZ3VhZ2UgYWJicmV2aWF0aW9uIG9yIGFuIGVtcHR5IHN0cmluZyBmb3IgdGhlIGRlZmF1bHQgb25lXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBTdHJpbmdzIGlkcyB0byB2YWx1ZXMgbWFwcGluZy4gUGx1cmFsXG4gKiB2YWx1ZXMgYXJlIHJlcHJlc2VudGVkIGFzIGFycmF5cy4gSWYgbm8gY29uZmlnIGZvdW5kIGZvciB0aGVcbiAqIGdpdmVuIG1hcmtlciB0aGVuIGFuIGVtcHR5IG1hcHBpbmcgaXMgcmV0dXJuZWQuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQWFwdDJTdHJpbmdzIChyYXdPdXRwdXQsIGNvbmZpZ01hcmtlcikge1xuICBjb25zdCBhbGxMaW5lcyA9IHJhd091dHB1dC5zcGxpdChvcy5FT0wpO1xuICBmdW5jdGlvbiBleHRyYWN0Q29udGVudCAoc3RhcnRJZHgpIHtcbiAgICBsZXQgaWR4ID0gc3RhcnRJZHg7XG4gICAgY29uc3Qgc3RhcnRDaGFyUG9zID0gYWxsTGluZXNbc3RhcnRJZHhdLmluZGV4T2YoJ1wiJyk7XG4gICAgaWYgKHN0YXJ0Q2hhclBvcyA8IDApIHtcbiAgICAgIHJldHVybiBbbnVsbCwgaWR4XTtcbiAgICB9XG4gICAgbGV0IHJlc3VsdCA9ICcnO1xuICAgIHdoaWxlIChpZHggPCBhbGxMaW5lcy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IHRlcm1pbmF0aW9uQ2hhck1hdGNoID0gL1wiJC8uZXhlYyhhbGxMaW5lc1tpZHhdKTtcbiAgICAgIGlmICh0ZXJtaW5hdGlvbkNoYXJNYXRjaCkge1xuICAgICAgICBjb25zdCB0ZXJtaW5hdGlvbkNoYXJQb3MgPSB0ZXJtaW5hdGlvbkNoYXJNYXRjaC5pbmRleDtcbiAgICAgICAgaWYgKHN0YXJ0SWR4ID09PSBpZHgpIHtcbiAgICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgYWxsTGluZXNbaWR4XS5zdWJzdHJpbmcoc3RhcnRDaGFyUG9zICsgMSwgdGVybWluYXRpb25DaGFyUG9zKSxcbiAgICAgICAgICAgIGlkeFxuICAgICAgICAgIF07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICBgJHtyZXN1bHR9XFxcXG4ke18udHJpbVN0YXJ0KGFsbExpbmVzW2lkeF0uc3Vic3RyaW5nKDAsIHRlcm1pbmF0aW9uQ2hhclBvcykpfWAsXG4gICAgICAgICAgaWR4LFxuICAgICAgICBdO1xuICAgICAgfVxuICAgICAgaWYgKGlkeCA+IHN0YXJ0SWR4KSB7XG4gICAgICAgIHJlc3VsdCArPSBgXFxcXG4ke18udHJpbVN0YXJ0KGFsbExpbmVzW2lkeF0pfWA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgKz0gYWxsTGluZXNbaWR4XS5zdWJzdHJpbmcoc3RhcnRDaGFyUG9zICsgMSk7XG4gICAgICB9XG4gICAgICArK2lkeDtcbiAgICB9XG4gICAgcmV0dXJuIFtyZXN1bHQsIGlkeF07XG4gIH1cblxuICBjb25zdCBhcGtTdHJpbmdzID0ge307XG4gIGxldCBjdXJyZW50UmVzb3VyY2VJZCA9IG51bGw7XG4gIGxldCBpc0luUGx1cmFsR3JvdXAgPSBmYWxzZTtcbiAgbGV0IGlzSW5DdXJyZW50Q29uZmlnID0gZmFsc2U7XG4gIGxldCBsaW5lSW5kZXggPSAwO1xuICB3aGlsZSAobGluZUluZGV4IDwgYWxsTGluZXMubGVuZ3RoKSB7XG4gICAgY29uc3QgdHJpbW1lZExpbmUgPSBhbGxMaW5lc1tsaW5lSW5kZXhdLnRyaW0oKTtcbiAgICBpZiAoXy5pc0VtcHR5KHRyaW1tZWRMaW5lKSkge1xuICAgICAgKytsaW5lSW5kZXg7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoWyd0eXBlJywgJ1BhY2thZ2UnXS5zb21lKCh4KSA9PiB0cmltbWVkTGluZS5zdGFydHNXaXRoKHgpKSkge1xuICAgICAgY3VycmVudFJlc291cmNlSWQgPSBudWxsO1xuICAgICAgaXNJblBsdXJhbEdyb3VwID0gZmFsc2U7XG4gICAgICBpc0luQ3VycmVudENvbmZpZyA9IGZhbHNlO1xuICAgICAgKytsaW5lSW5kZXg7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAodHJpbW1lZExpbmUuc3RhcnRzV2l0aCgncmVzb3VyY2UnKSkge1xuICAgICAgaXNJblBsdXJhbEdyb3VwID0gZmFsc2U7XG4gICAgICBjdXJyZW50UmVzb3VyY2VJZCA9IG51bGw7XG4gICAgICBpc0luQ3VycmVudENvbmZpZyA9IGZhbHNlO1xuXG4gICAgICBpZiAodHJpbW1lZExpbmUuaW5jbHVkZXMoJ3N0cmluZy8nKSkge1xuICAgICAgICBjb25zdCBtYXRjaCA9IC9zdHJpbmdcXC8oXFxTKykvLmV4ZWModHJpbW1lZExpbmUpO1xuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICBjdXJyZW50UmVzb3VyY2VJZCA9IG1hdGNoWzFdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHRyaW1tZWRMaW5lLmluY2x1ZGVzKCdwbHVyYWxzLycpKSB7XG4gICAgICAgIGNvbnN0IG1hdGNoID0gL3BsdXJhbHNcXC8oXFxTKykvLmV4ZWModHJpbW1lZExpbmUpO1xuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICBjdXJyZW50UmVzb3VyY2VJZCA9IG1hdGNoWzFdO1xuICAgICAgICAgIGlzSW5QbHVyYWxHcm91cCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgICsrbGluZUluZGV4O1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGN1cnJlbnRSZXNvdXJjZUlkKSB7XG4gICAgICBpZiAoaXNJblBsdXJhbEdyb3VwKSB7XG4gICAgICAgIGlmICh0cmltbWVkTGluZS5zdGFydHNXaXRoKCcoJykpIHtcbiAgICAgICAgICBpc0luQ3VycmVudENvbmZpZyA9IHRyaW1tZWRMaW5lLnN0YXJ0c1dpdGgoYCgke2NvbmZpZ01hcmtlcn0pYCk7XG4gICAgICAgICAgKytsaW5lSW5kZXg7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzSW5DdXJyZW50Q29uZmlnKSB7XG4gICAgICAgICAgY29uc3QgW2NvbnRlbnQsIGlkeF0gPSBleHRyYWN0Q29udGVudChsaW5lSW5kZXgpO1xuICAgICAgICAgIGxpbmVJbmRleCA9IGlkeDtcbiAgICAgICAgICBpZiAoXy5pc1N0cmluZyhjb250ZW50KSkge1xuICAgICAgICAgICAgYXBrU3RyaW5nc1tjdXJyZW50UmVzb3VyY2VJZF0gPSBbXG4gICAgICAgICAgICAgIC4uLihhcGtTdHJpbmdzW2N1cnJlbnRSZXNvdXJjZUlkXSB8fCBbXSksXG4gICAgICAgICAgICAgIGNvbnRlbnQsXG4gICAgICAgICAgICBdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0cmltbWVkTGluZS5zdGFydHNXaXRoKGAoJHtjb25maWdNYXJrZXJ9KWApKSB7XG4gICAgICAgIGNvbnN0IFtjb250ZW50LCBpZHhdID0gZXh0cmFjdENvbnRlbnQobGluZUluZGV4KTtcbiAgICAgICAgbGluZUluZGV4ID0gaWR4O1xuICAgICAgICBpZiAoXy5pc1N0cmluZyhjb250ZW50KSkge1xuICAgICAgICAgIGFwa1N0cmluZ3NbY3VycmVudFJlc291cmNlSWRdID0gY29udGVudDtcbiAgICAgICAgfVxuICAgICAgICBjdXJyZW50UmVzb3VyY2VJZCA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgICsrbGluZUluZGV4O1xuICB9XG4gIHJldHVybiBhcGtTdHJpbmdzO1xufVxuXG4vKipcbiAqIEZvcm1hdHMgdGhlIGNvbmZpZyBtYXJrZXIsIHdoaWNoIGlzIHRoZW4gcGFzc2VkIHRvIHBhcnNlLi4gbWV0aG9kc1xuICogdG8gbWFrZSBpdCBjb21wYXRpYmxlIHdpdGggcmVzb3VyY2UgZm9ybWF0cyBnZW5lcmF0ZWQgYnkgYWFwdCgyKSB0b29sXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY29uZmlnc0dldHRlciBUaGUgZnVuY3Rpb24gd2hvc2UgcmVzdWx0IGlzIGEgbGlzdFxuICogb2YgYXBrIGNvbmZpZ3NcbiAqIEBwYXJhbSB7c3RyaW5nfSBkZXNpcmVkTWFya2VyIFRoZSBkZXNpcmVkIGNvbmZpZyBtYXJrZXIgdmFsdWVcbiAqIEBwYXJhbSB7c3RyaW5nfSBkZWZhdWx0TWFya2VyIFRoZSBkZWZhdWx0IGNvbmZpZyBtYXJrZXIgdmFsdWVcbiAqIEByZXR1cm4ge3N0cmluZ30gVGhlIGZvcm1hdHRlZCBjb25maWcgbWFya2VyXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGZvcm1hdENvbmZpZ01hcmtlciAoY29uZmlnc0dldHRlciwgZGVzaXJlZE1hcmtlciwgZGVmYXVsdE1hcmtlcikge1xuICBsZXQgY29uZmlnTWFya2VyID0gZGVzaXJlZE1hcmtlciB8fCBkZWZhdWx0TWFya2VyO1xuICBpZiAoY29uZmlnTWFya2VyLmluY2x1ZGVzKCctJykgJiYgIWNvbmZpZ01hcmtlci5pbmNsdWRlcygnLXInKSkge1xuICAgIGNvbmZpZ01hcmtlciA9IGNvbmZpZ01hcmtlci5yZXBsYWNlKCctJywgJy1yJyk7XG4gIH1cbiAgaWYgKGNvbmZpZ01hcmtlci50b0xvd2VyQ2FzZSgpLnN0YXJ0c1dpdGgoJ2VuJykpIHtcbiAgICAvLyBBc3N1bWUgdGhlICdlbicgY29uZmlndXJhdGlvbiBpcyB0aGUgZGVmYXVsdCBvbmVcbiAgICBpZiAoIShhd2FpdCBjb25maWdzR2V0dGVyKCkpLm1hcCgoeCkgPT4geC50cmltKCkpLmluY2x1ZGVzKGNvbmZpZ01hcmtlcikpIHtcbiAgICAgIGxvZy5kZWJ1ZyhgVGhlcmUgaXMgbm8gJyR7Y29uZmlnTWFya2VyfScgY29uZmlndXJhdGlvbi4gYCArXG4gICAgICAgIGBSZXBsYWNpbmcgaXQgd2l0aCAnJHtkZWZhdWx0TWFya2VyIHx8ICdkZWZhdWx0J30nYCk7XG4gICAgICBjb25maWdNYXJrZXIgPSBkZWZhdWx0TWFya2VyO1xuICAgIH1cbiAgfVxuICByZXR1cm4gY29uZmlnTWFya2VyO1xufVxuXG5leHBvcnQge1xuICBnZXRBbmRyb2lkUGxhdGZvcm1BbmRQYXRoLCB1bnppcEZpbGUsXG4gIGdldElNRUxpc3RGcm9tT3V0cHV0LCBnZXRKYXZhRm9yT3MsIGlzU2hvd2luZ0xvY2tzY3JlZW4sIGlzQ3VycmVudEZvY3VzT25LZXlndWFyZCxcbiAgZ2V0U3VyZmFjZU9yaWVudGF0aW9uLCBpc1NjcmVlbk9uRnVsbHksIGJ1aWxkU3RhcnRDbWQsIGdldEphdmFIb21lLFxuICByb290RGlyLCBnZXRTZGtUb29sc1ZlcnNpb24sIGdldEFwa3NpZ25lckZvck9zLCBnZXRCdWlsZFRvb2xzRGlycyxcbiAgZ2V0QXBrYW5hbHl6ZXJGb3JPcywgZ2V0T3BlblNzbEZvck9zLCBleHRyYWN0TWF0Y2hpbmdQZXJtaXNzaW9ucywgQVBLU19FWFRFTlNJT04sXG4gIEFQS19JTlNUQUxMX1RJTUVPVVQsIEFQS1NfSU5TVEFMTF9USU1FT1VULCBidWlsZEluc3RhbGxBcmdzLCBBUEtfRVhURU5TSU9OLFxuICBERUZBVUxUX0FEQl9FWEVDX1RJTUVPVVQsIHBhcnNlTWFuaWZlc3QsIHBhcnNlQWFwdFN0cmluZ3MsIHBhcnNlQWFwdDJTdHJpbmdzLFxuICBmb3JtYXRDb25maWdNYXJrZXIsXG59O1xuIl0sImZpbGUiOiJsaWIvaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiIuLi8uLiJ9
