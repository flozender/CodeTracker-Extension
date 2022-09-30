# CodeTracker Browser Extension

## Set Up Instructions
### Requirements: 
 - Node.js v16.17.0 or higher
 - NPM v8.15.0 or higher

### To build the browser extension:
 - run `npm install` and then `npm run build`

### To start the codetracker web api:
 - Clone the [CodeTracker API](https://github.com/flozender/CodeTracker-API) and follow the set up instructions

### For the chrome extension:
 - Open chrome and then "manage extensions", then click "Load Unpacked"
 - Select the `manifest.json` in directory `tmp/chrome`
 - visit any repository on [GitHub](https://www.github.com/checkstyle/checkstyle), the extension should be visible


## Usage Instructions

Pin the sidebar using the pin button on the top right for the best experience.

### To track code elements
 - Highlight any method/variable/attribute/block and check the sidebar to see if the code element is supported
 - If the selected element is valid, click on the `Track` button to track the change history at a commit level
 - Hover over node to see change history and other information
 - Click on a node to redirect to the exact code element in that commit
 - Yellow nodes denote "Evolution Hooks", right click to expand history for the parent method 