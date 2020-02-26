
/**
 * Page Objects help in better re-usablitity and maintenance of element locators.
 * This file exports LivrePageObject class
 */

export class LivrePageObject {
    public outputText: string = 'android.widget.TextView';
    public button: string = 'com.immanens.electrelh:id/';

    constructor() {
        this.outputText = this.androidClassSelector(this.outputText);

    }

    public livreSelector = (selector: string): string => {
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
