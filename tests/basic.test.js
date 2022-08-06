// await jestPuppeteer.debug();
const puppeteer = require("puppeteer");

// let file = require("./oracle/method/training/checkstyle-Checker-fireErrors.json");
// let URL = file.repositoryWebURL.replace(".git", "/commit/" + file.startCommitId);
// let FUNCTION_NAME = file.functionName;
// let FILE_PATH = file.filePath;

let URL = "https://github.com/checkstyle/checkstyle/commit/746a9d69125211ff44af1cb37732e919368ba620";
let METHOD_NAME = "testOuterTypeFilename1";
let FILE_PATH = "src/it/java/com/google/checkstyle/test/chapter2filebasic/rule21filename/OuterTypeFilenameTest.java";

describe('Basic functionality', () => {

    beforeAll(async () => {
        await page.goto(`${URL}`);

        let loadExtension = async () => {
            const pathToExtension = require('path').join(__dirname, '../tmp/chrome');
            const browser = await puppeteer.launch({
                headless: 'chrome',
                args: [
                    `--disable-extensions-except=${pathToExtension}`,
                    `--load-extension=${pathToExtension}`,
                ],
            });
            const backgroundPageTarget = await browser.waitForTarget(
                target => target.type() === 'background_page'
            );
            const backgroundPage = await backgroundPageTarget.page();
            // Test the background page as you would any other page.
            await browser.close();
        }
        await loadExtension();
    });

    it('should load the sidebar', async () => {
        await expect(page.content()).resolves.toContain('octotree');
    });

    it('should pin the sidebar', async () => {
        let pinButton = await page.$("body > nav > div.octotree-main-icons > a.octotree-pin")
        await pinButton.evaluate(b => b.click());
        await page.waitForTimeout(500);
        await expect(page.content()).resolves.toContain('octotree-pinned');
    });

    
    // it('should capture selection', async () => {

    // });
});

