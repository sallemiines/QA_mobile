
Currently this framework has been developed to run scripts in **ANDROID** platform with real device.

The tests run both on **Android Native App**

### Tech Stack

* [Appium]() - This is the node server which interacts with the mobile devices
* [WebdriverIO](http://webdriver.io/) - It is the selenium webdriver api bindings for node.js, It has a very simple api which could be used to automate web & browser apps in a fast and scalable way.
* [Typescript(Javascript)](https://www.typescriptlang.org/) - It is the superset of javascript which has additional static typings and features like JAVA and other languaes. Now you could write your code which compiles to pure javascript.
* [Cucumber](https://cucumber.io/) - The popular BDD test framework which helps us write automated tests.

## Getting Started

### Pre-requisites

1. NodeJS installed globally in the system.
https://nodejs.org/en/download/

2.  JAVA(jdk) installed in the system.

3. Andriod(sdk) installed in the system.

4. Set **JAVA_HOME** & **ANDROID_HOME** paths correctly in the system.


**** Install `npm install -g appium-doctor` and run it from the command-line which checks if your java jdk and android sdk paths are set correctly or not.

## Installation

### Setup Scripts

* Clone the repository into a folder
* Go inside the folder and run following command from terminal/command prompt
```
npm install
```
* All the dependencies from package.json and typescript typings would be installed in node_modules folder.

**Tip:** Use [**Yarn**](https://yarnpkg.com/en/docs/installing-dependencies)  to install your modules `npm install -g yarn` as it caches & locks them which would help us install correct versions of modules across various platforms without any issues. This project is configured with `yarn.lock` file. So you could make use of it.

### Run Tests

* First step is to start the `appium` server, This project includes the appium node module so you don't have to download it externally. You can run the appium server by the following npm command.

```
npm run appium
```
* Next you have to transpile/compile your typescript files to javascript files, you could do this by running the command -

```

To know your device name you could run the  `adb devices` command which comes out of the box from Android SDK.

### Run Test Suite
```
npm run app-test
```
