// await jestPuppeteer.debug();
const puppeteer = require("puppeteer");
const { blue, cyan, green, magenta, red, yellow } = require('colorette');

let file = require("./oracle/attribute/training/checkstyle-Checker-basedir.json");
let URL = file.repositoryWebURL.replace(".git", "/blob/" + file.startCommitId + "/" + file.filePath);
let ATTRIBUTE_NAME = file.attributeName;
let START_LINE = file.attributeDeclarationLine;
let CHANGES = file.expectedChanges;

jest.setTimeout(15000);

describe('Track attributes', () => {

    beforeAll(async () => {
        await page.goto(`${URL}`, { waitUntil: 'networkidle2' });

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

        let pinButton = await page.$("body > nav > div.octotree-main-icons > a.octotree-pin")
        await pinButton.evaluate(b => b.click());
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
    });


    it('should select the attribute', async () => {

        await page.waitForTimeout(500);
        await expect(page.content()).resolves.toContain('codeElementField');
        let codeElementField = await page.$("#codeElementField");

        await page.evaluate(async (START_LINE, ATTRIBUTE_NAME) => {
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
            let attributeSpan;
            for (let i = 0; i < spans.length; i++) {
                if (spans[i].innerText === ATTRIBUTE_NAME) {
                    attributeSpan = spans[i];
                    break;
                }
            }
            await SelectText(attributeSpan);
            return true;
        }, START_LINE, ATTRIBUTE_NAME);

        let trackButton = await page.$("#codeElementSubmit")
        await trackButton.evaluate(b => b.click());
        await page.waitForTimeout(500);

        await expect(await page.evaluate(() => {
            const selection = document.getSelection();
            let selectionText = selection.toString().trim();
            return selectionText;
        })).toEqual(ATTRIBUTE_NAME);

        let codeElementText = await codeElementField.evaluate((c) => c.value);
        await expect(codeElementText === ATTRIBUTE_NAME).toBeTruthy();
    });

    it('should load the change history', async () => {
        await page.waitForResponse(response => response.status() === 200);
        await expect(page.content()).resolves.toContain('codetracker-svg');
    });

    it('should load commit page on node click', async () => {
        await page.waitForTimeout(500);
        let i = 0;
        let changeSet = new Set(CHANGES.map((c) => c.commitId));
        let changeLength = changeSet.size;
        let nodeSelector = `#codetracker-svg > g > g:nth-child(${changeLength + i})`;
        let node = await page.waitForSelector(nodeSelector);
        let changeType = CHANGES[i]["changeType"];
        let commitId = CHANGES[i]["commitId"]
        await expect(await node.evaluate((n) => {
            return n.getAttribute("data-changes");
        })).toContain(changeType);

        let aTagselector = `#codetracker-svg > g > g:nth-child(${changeLength + i}) > a`;
        let commitLink = await page.waitForSelector(aTagselector);

        await commitLink.click();
        await page.waitForResponse(response => response.status() === 200);
        await page.waitForNavigation();
        await page.waitForTimeout(500);
        await expect(await page.evaluate(() => {
            return window.location.toString();
        })).toContain(commitId);
    });

    it('should highlight the correct line', async () => {
        await page.waitForNavigation();
        // let filesButton = await page.waitForSelector("#show-file-tree-button");
        // await filesButton.evaluate((b)=>b.click());
        // let diffButton = await page.waitForSelector("#toc > div.d-flex.d-inline-block > form > div > button.selected.btn-sm.btn.BtnGroup-item");
        // await diffButton.click();
        await page.waitForTimeout(1000);
        await expect(await page.content()).toContain("selected-line");
        let correctLineSelected = await page.evaluate((ATTRIBUTE_NAME) => {
            let td = document.querySelectorAll("td.selected-line-top.selected-line-bottom");
            td = td[td.length-1];
            if (td.textContent.includes(ATTRIBUTE_NAME)) {
                return true;
            }
            let tr = td.parentElement;
            while (!!tr) {
                if (tr.children.length > 0) {
                    let length = Math.max(0, tr.children.length - 1);
                    let textContent = tr.children[length].textContent.trim();
                    if (textContent.includes(ATTRIBUTE_NAME)) {
                        return true;
                    }
                }
                tr = tr.nextElementSibling;
            }
            return false;
        }, ATTRIBUTE_NAME);

        await expect(correctLineSelected).toBeTruthy();
    })

});

