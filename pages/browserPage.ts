/**
 * Page Objects help in better re-usablitity and maintenance of element locators.
 * This file exports GooglePageObject & AppiumPageObject classes
 */

class GooglePageObject {
    public get searchTextBox(): any { return browser.element('input[type="search"]'); }
    public get searchButton(): any { return browser.element('button[aria-label="Recherche Google"]'); }
    public get results(): any { return browser.waitForVisible('div #rso', 5000); }
    public get firstLink(): any { return browser.element('#rso > div:nth-child(2) div.KJDcUb a  div.MUxGbd.v0nnCb'); }
}

class AppiumPageObject {
    public get linkButton(): any { return browser.element('body > nav.navbar.navbar-inverse.navbar-static-top button'); }
    public get tutorialLink(): any { return browser.element('#bs-example-navbar-collapse-1 a[data-localize="docs-nav-resources"]'); }
    public get firstBook(): any { return browser.element('#readmeMarkdown > div:nth-child(1) > a.resource-title'); }
    public get androidTutorialTitle(): any { return browser.element('#native-android-automation').getText(); }
}

/*
Public Interface - export instances of classes
**/
export const GooglePage = new GooglePageObject();
export const AppiumPage = new AppiumPageObject();

