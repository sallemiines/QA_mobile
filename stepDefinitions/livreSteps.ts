/**
 * Step Definitons are the glue code which drive
 * the feature scenarios, Cucumber helps us provide
 * gherkin language syntax's - Given, When, Then
 */

const {Given, When, Then} = require('cucumber');
import {expect} from 'chai';
import {LivrePageObject} from '../pages/livrePage';
const livre: LivrePageObject = new LivrePageObject();

Given(/^I am on my app$/, () => {
    browser.pause(2000);
    const title = browser.getText('android.widget.TextView');
    expect(title[0]).to.equal('FLASH LIVRE');
});
When(/^I click on menu button$/, () => {
    browser.pause(2000);
    browser.click('android.widget.ImageButton');
});

Then(/^I click on Ma selection button$/, () => {
    browser.pause(2000);
    browser.click(livre.livreSelector('scanButton'));
    browser.pause(10000);
});

Then(/^the result "(.*?)" should be displayed$/, (result: string) => {
      const pageTitle = browser.getText(livre.outputText);
      expect(pageTitle[0]).to.contain(result);
});