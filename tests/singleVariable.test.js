// await jestPuppeteer.debug();
const puppeteer = require('puppeteer');
const {blue, cyan, green, magenta, red, yellow} = require('colorette');

let file = require('./oracle/variable/training/checkstyle-Checker-fireErrors-element.json');
let URL = file.repositoryWebURL.replace('.git', '/blob/' + file.startCommitId + '/' + file.filePath);
let VARIABLE_NAME = file.variableName;
let START_LINE = file.variableStartLine;
let CHANGES = file.expectedChanges;



jest.setTimeout(15000);

describe('Track variables', () => {

    beforeAll(async () => {
        await page.goto(`${URL}`, {waitUntil: 'networkidle2'});

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
                (target) => target.type() === 'background_page'
            );
            const backgroundPage = await backgroundPageTarget.page();
            // Test the background page as you would any other page.
            await browser.close();
        }
        await loadExtension();

        let pageContent = await page.content();
        if (!pageContent.includes('octotree-pinned')) {
            let pinButton = await page.$('body > nav > div.octotree-main-icons > a.octotree-pin')
            await pinButton.evaluate((b) => b.click());
        }
        await page.waitForTimeout(500);
        // page
        //     .on('console', message => {
        //         const type = message.type().substr(0, 3).toUpperCase()
        //         const colors = {
        //             LOG: text => text,
        //             ERR: red,
        //             WAR: yellow,
        //             INF: cyan
        //         }
        //         const color = colors[type] || blue
        //         console.log(color(`${type} ${message.text()}`))
        //     })
        //   .on('pageerror', ({ message }) => console.log(red(message)))
        //   .on('response', response =>
        //     console.log(green(`${response.status()} ${response.url()}`)))
        //   .on('requestfailed', request =>
        //     console.log(magenta(`${request.failure().errorText} ${request.url()}`)))
    });


    it('should select the variable', async () => {

        await page.waitForTimeout(500);
        await expect(page.content()).resolves.toContain('codeElementField');
        let codeElementField = await page.$('#codeElementField');

        await page.evaluate(async (START_LINE, VARIABLE_NAME) => {
            const SelectText = (element) => {
                let doc = document, range, selection;

                if (doc.body.createTextRange) {
                    range = document.body.createTextRange();
                    range.moveToElementText(element);
                    range.select();
                } else if (window.getSelection) {
                    selection = window.getSelection();
                    range = document.createRange();
                    range.selectNodeContents(element);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }

            };
            let td = document.querySelectorAll(`#LC${START_LINE}`);
            let spans = td[0].children;
            let variableSpan;
            for (let i = 0; i < spans.length; i++) {
                if (spans[i].innerText === VARIABLE_NAME) {
                    variableSpan = spans[i];
                    break;
                }
            }
            await SelectText(variableSpan);
            return true;
        }, START_LINE, VARIABLE_NAME);
        
        let label = await page.$('#codeElementLabel')
        await label.evaluate((b) => b.click());

        await page.waitForResponse((response) => response.status() === 200);
        await page.waitForTimeout(500);

        let trackButton = await page.$('#codeElementSubmit')
        await trackButton.evaluate((b) => b.click());
        await page.waitForTimeout(500);

        await expect(await page.evaluate(() => {
            const selection = document.getSelection();
            let selectionText = selection.toString().trim();
            return selectionText;
        })).toEqual(VARIABLE_NAME);

        let codeElementText = await codeElementField.evaluate((c) => c.value);
        await expect(codeElementText === VARIABLE_NAME).toBeTruthy();
    });

    it('should load the change history', async () => {
        await page.waitForResponse((response) => response.status() === 200);
        await expect(page.content()).resolves.toContain('codetracker-svg');
    });

    it('should load commit page on node click', async () => {
        await page.waitForTimeout(500);
        let i = 0;
        let changeSet = new Set(CHANGES.map((c) => c.commitId));
        let changeLength = changeSet.size + 1;
        let nodeSelector = `#codetracker-svg-g > g:nth-child(${changeLength + i})`;
        let node = await page.waitForSelector(nodeSelector);
        let changeType = CHANGES[i]['changeType'];
        let commitId = CHANGES[i]['commitId']
        await expect(await node.evaluate((n) => {
            return JSON.parse(n.getAttribute('data-changes'))[0].split(':')[0].toLowerCase();
        })).toContain(changeType);

        let circleSelector = `#codetracker-svg-g > g:nth-child(${changeLength + i}) > circle`;
        let commitLink = await page.waitForSelector(circleSelector);

        await commitLink.click();
        await page.waitForResponse((response) => response.status() === 200);
        await page.waitForNavigation();
        await page.waitForTimeout(500);
        await expect(await page.evaluate(() => {
            return window.location.toString();
        })).toContain(commitId);
    });

    it('should highlight the correct line', async () => {
        await page.waitForNavigation();
        await page.waitForTimeout(1000);

        await expect(await page.content()).toContain('selected-line');
        variableName = CHANGES[0].elementNameAfter;
        lineNumber = variableName.slice(variableName.lastIndexOf('(') + 1, variableName.lastIndexOf(')'))
        let correctLineSelected = await page.evaluate((lineNumber) => {
            return window.location.toString().endsWith(`R${lineNumber}`);
        }, lineNumber);

        await expect(correctLineSelected).toBeTruthy();
    })

});

