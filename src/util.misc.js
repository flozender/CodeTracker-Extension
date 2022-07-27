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

window.isSafari = isSafari;
window.isValidTimeStamp = isValidTimeStamp;
window.timeSince = timeSince;
window.lineOf = lineOf;
