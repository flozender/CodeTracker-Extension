// await jestPuppeteer.debug();
const puppeteer = require("puppeteer");
const { blue, cyan, green, magenta, red, yellow } = require('colorette')

let file = require("./oracle/method/training/checkstyle-Checker-fireErrors.json");
let URL = file.repositoryWebURL.replace(".git", "/blob/" + file.startCommitId + "/" + file.filePath);
let FUNCTION_NAME = file.functionName;
let START_LINE = file.functionStartLine;
let FILE_PATH = file.filePath;
let CHANGES = file.expectedChanges;

function waitForNetworkIdle(page, timeout, maxInflightRequests = 0) {
    page.on('request', onRequestStarted);
    page.on('requestfinished', onRequestFinished);
    page.on('requestfailed', onRequestFinished);

    let inflight = 0;
    let fulfill;
    let promise = new Promise(x => fulfill = x);
    let timeoutId = setTimeout(onTimeoutDone, timeout);
    return promise;

    function onTimeoutDone() {
        page.removeListener('request', onRequestStarted);
        page.removeListener('requestfinished', onRequestFinished);
        page.removeListener('requestfailed', onRequestFinished);
        fulfill();
    }

    function onRequestStarted() {
        ++inflight;
        if (inflight > maxInflightRequests)
            clearTimeout(timeoutId);
    }

    function onRequestFinished() {
        if (inflight === 0)
            return;
        --inflight;
        if (inflight === maxInflightRequests)
            timeoutId = setTimeout(onTimeoutDone, timeout);
    }
}
jest.setTimeout(15000);

describe('Track Methods', () => {

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

        let pinButton = await page.$("body > nav > div.octotree-main-icons > a.octotree-pin")
        await pinButton.evaluate(b => b.click());
        await page.waitForTimeout(500);
        page
          .on('console', message => {
            const type = message.type().substr(0, 3).toUpperCase()
            const colors = {
              LOG: text => text,
              ERR: red,
              WAR: yellow,
              INF: cyan
            }
            const color = colors[type] || blue
            console.log(color(`${type} ${message.text()}`))
          })
        //   .on('pageerror', ({ message }) => console.log(red(message)))
        //   .on('response', response =>
        //     console.log(green(`${response.status()} ${response.url()}`)))
        //   .on('requestfailed', request =>
        //     console.log(magenta(`${request.failure().errorText} ${request.url()}`)))
    });


    it('should select the method', async () => {
        await page.waitForTimeout(500);
        await expect(page.content()).resolves.toContain('codeElementField');
        let codeElementField = await page.$("#codeElementField");

        await page.evaluate(async (START_LINE) => {
            let i = 0;
            const SelectText = (element) => {
                let doc = document, text = doc.querySelectorAll(element), range, selection;

                if (doc.body.createTextRange) {
                    range = document.body.createTextRange();
                    range.moveToElementText(text[i]);
                    range.select();
                } else if (window.getSelection) {
                    selection = window.getSelection();
                    range = document.createRange();
                    range.selectNodeContents(text[i]);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
                i++;
                if (i === text.length) i = 0;
            };
            await SelectText(`#LC${START_LINE} > span.pl-en`);
            return true;
        }, START_LINE);

        let trackButton = await page.$("#codeElementSubmit")
        await trackButton.evaluate(b => b.click());
        await page.waitForTimeout(500);


        await expect(await page.evaluate((FUNCTION_NAME) => {
            const selection = document.getSelection();
            let selectionText = selection.toString().trim();
            return selectionText === FUNCTION_NAME;
        }, FUNCTION_NAME)).toBeTruthy();

        let codeElementText = await codeElementField.evaluate((c) => c.value);
        await expect(codeElementText === FUNCTION_NAME).toBeTruthy();
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
        await expect(await page.evaluate(()=>{
            return window.location.toString();
        })).toContain(commitId);
    });

    it('should highlight the correct line', async()=>{
        await page.waitForTimeout(700);
        
        await expect(await page.content()).toContain("selected-line");
        let correctLineSelected = await page.evaluate((FUNCTION_NAME)=>{
            let td = document.querySelectorAll("td.selected-line")[3];
            if (td.textContent.includes(FUNCTION_NAME)){
                return true;
            }
            let tr = td.parentElement;
            while(!!tr){
                if (tr.children.length > 0){
                    let length = Math.max(0, tr.children.length-1);
                    let textContent = tr.children[length].textContent.trim();
                    if(textContent.includes(FUNCTION_NAME)){
                        return true;
                    }
                }
                tr = tr.nextElementSibling;
            }
            return false;
        }, FUNCTION_NAME);

        await expect(correctLineSelected).toBeTruthy();
    })

});

