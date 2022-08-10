function isSafari() {
  return typeof safari !== 'undefined' && safari.self && typeof safari.self.addEventListener === 'function';
}

function isValidTimeStamp(timestamp) {
  return !isNaN(parseFloat(timestamp)) && isFinite(timestamp);
}

function timeSince(timeStamp) {

  timeStamp = new Date(timeStamp)
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  var now = new Date(),
    secondsPast = (now.getTime() - timeStamp.getTime()) / 1000;
  if (secondsPast < 60) {
    return secondsPast + 's';
  }
  if (secondsPast < 3600) {
    return rtf.format(-1 * parseInt(secondsPast / 60), 'minute');
  }
  if (secondsPast <= 86400) {
    return rtf.format(-1 * parseInt(secondsPast / 3600), 'hour');
  }
  if (secondsPast <= 2628000) {
    return rtf.format(-1 * parseInt(secondsPast / 86400), 'day');
  }
  if (secondsPast <= 31536000) {
    return rtf.format(-1 * parseInt(secondsPast / 2628000), 'month');
  }
  if (secondsPast > 31536000) {
    return rtf.format(-1 * parseInt(secondsPast / 31536000), 'year');
  }
}

const lineOf = (text, substring) => {
  let line = 0, matchedChars = 0;

  for (let i = 0; i < text.length; i++) {
    text[i] === substring[matchedChars] ? matchedChars++ : matchedChars = 0;

    if (matchedChars === substring.length) {
      return line + 1;
    }
    if (text[i] === '\n') {
      line++;
    }
  }

  return -1;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function addExpandButton(data) {
  const { username, reponame, tag, anchor, mode, filePath } = data;
  console.log(data);
  const data_url = `/${username}/${reponame}/blob_expand/${tag}?anchor=${anchor}&amp;diff=split&amp;direction=full&amp;mode=${mode}&amp;path=${filePath}`
  const button = `
    <div class="js-expand-full-wrapper d-inline-block">
      <button type="button" class="btn-link color-fg-muted no-underline js-expand-full directional-expander tooltipped tooltipped-se" aria-label="Expand all" data-url=${data_url}>
          <svg aria-label="Expand all" aria-hidden="false" role="img" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-unfold">
              <path d="M8.177.677l2.896 2.896a.25.25 0 01-.177.427H8.75v1.25a.75.75 0 01-1.5 0V4H5.104a.25.25 0 01-.177-.427L7.823.677a.25.25 0 01.354 0zM7.25 10.75a.75.75 0 011.5 0V12h2.146a.25.25 0 01.177.427l-2.896 2.896a.25.25 0 01-.354 0l-2.896-2.896A.25.25 0 015.104 12H7.25v-1.25zm-5-2a.75.75 0 000-1.5h-.5a.75.75 0 000 1.5h.5zM6 8a.75.75 0 01-.75.75h-.5a.75.75 0 010-1.5h.5A.75.75 0 016 8zm2.25.75a.75.75 0 000-1.5h-.5a.75.75 0 000 1.5h.5zM12 8a.75.75 0 01-.75.75h-.5a.75.75 0 010-1.5h.5A.75.75 0 0112 8zm2.25.75a.75.75 0 000-1.5h-.5a.75.75 0 000 1.5h.5z"></path>
          </svg>
      </button>
      <button type="button" class="btn-link color-fg-muted no-underline js-collapse-diff tooltipped tooltipped-se" aria-label="Collapse expanded lines" hidden="">
          <svg aria-label="Collapse added diff lines" aria-hidden="false" role="img" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-fold">
              <path d="M10.896 2H8.75V.75a.75.75 0 00-1.5 0V2H5.104a.25.25 0 00-.177.427l2.896 2.896a.25.25 0 00.354 0l2.896-2.896A.25.25 0 0010.896 2zM8.75 15.25a.75.75 0 01-1.5 0V14H5.104a.25.25 0 01-.177-.427l2.896-2.896a.25.25 0 01.354 0l2.896 2.896a.25.25 0 01-.177.427H8.75v1.25zm-6.5-6.5a.75.75 0 000-1.5h-.5a.75.75 0 000 1.5h.5zM6 8a.75.75 0 01-.75.75h-.5a.75.75 0 010-1.5h.5A.75.75 0 016 8zm2.25.75a.75.75 0 000-1.5h-.5a.75.75 0 000 1.5h.5zM12 8a.75.75 0 01-.75.75h-.5a.75.75 0 010-1.5h.5A.75.75 0 0112 8zm2.25.75a.75.75 0 000-1.5h-.5a.75.75 0 000 1.5h.5z"></path>
          </svg>
      </button>
  </div>`;

  let parser = new DOMParser();
  let HTMLDOM = parser.parseFromString(button, 'text/html');

  return HTMLDOM.children[0].children[1].children[0];
}

async function scrollSingleArrows() {
  let singleArrows = $(node).find("a.js-expand");
  let seen = new Set();
  let clicked;
  while (singleArrows) {
    clicked = false;
    for (let singleArrow of singleArrows) {
      let rightRange = $(singleArrow).data("right-range");
      if (!seen.has(rightRange)) {
        singleArrow.click();
        clicked = true;
        seen.add(rightRange);
      }
    }
    if (!clicked) {
      break;
    }
    await sleep(500);
    singleArrows = $(node).find("a.js-expand");
    console.log("SINGLE_ARROWS", singleArrows);
  }
}

window.isSafari = isSafari;
window.isValidTimeStamp = isValidTimeStamp;
window.timeSince = timeSince;
window.lineOf = lineOf;
window.sleep = sleep;
window.addExpandButton = addExpandButton;