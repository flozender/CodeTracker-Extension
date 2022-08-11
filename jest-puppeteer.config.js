const path = require('path')

const CRX_PATH = path.resolve(__dirname, './tmp/chrome')

module.exports = {
    launch: {
        dumpio: true,
        headless: false,
        product: 'chrome',
        args: [
            `--disable-extensions-except=${CRX_PATH}`,
            `--load-extension=${CRX_PATH}`
        ],
        defaultViewport: null,
    },
    browserContext: 'default',
}