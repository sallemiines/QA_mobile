/**
 * Step Definitons are the glue code which drive
 * the feature scenarios, Cucumber helps us provide
 * gherkin language syntax's - Given, When, Then
 */

const {Given, When, Then} = require('cucumber');
import {expect} from 'chai';
import {TestWorldPageObject} from '../pages/worldPage';
const world: TestWorldPageObject = new TestWorldPageObject();

Given(/^I am on my app$/, () => {
    browser.pause(2000);
    const title = browser.getText('android.widget.TextView');
    expect(title[0]).to.equal('Testing World');
});

When(/^I click on what is testing button$/, () => {
    browser.pause(2000);
    browser.click(world.worldSelector("button_wt"));
});

Then(/^the result "(.*?)" should be displayed$/, (result: string) => {
      const pageTitle = browser.getText(world.outputText);
      expect(pageTitle[0]).to.contain(result);
      console.log(pageTitle[0]);
});