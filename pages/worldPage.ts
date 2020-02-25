
/**
 * Page Objects help in better re-usablitity and maintenance of element locators.
 * This file exports CalculatorPageObject class
 */

export class TestWorldPageObject {
    public outputText: string = 'android.view.View';
    public idLocator: string = 'com.android.calculator2:id/';
    public button: string = 'com.testingworld:id/';

    constructor() {
        this.outputText = this.androidClassSelector(this.outputText);

    }

    public worldSelector = (selector: string): string => {
        return this.androidIDSelector(this.button + selector);
    }
    private androidClassSelector = (selector: any): string => {
        let str = `'android=new UiSelector().className("${selector}")'`;
        str = str.substring(1, str.length - 1);
        return str;
    }

      private androidIDSelector = (selector: any): string => {
            let str = `'android=new UiSelector().resourceId("${selector}")'`;
            str = str.substring(1, str.length - 1);
            return str;
        }
}
