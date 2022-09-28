
// Node.js program to demonstrate the
// fs.readdir() method
  
// Import the filesystem module
const fs = require('fs');
  
// Function to get current filenames
// in directory
fs.readdir("./tests/oracle/method/training", (err, files) => {
  if (err)
    console.log(err);
  else {
    console.log("\nCurrent directory filenames:");
    console.log(files)
    // files.forEach(file => {
    //   console.log(file);
    // })
  }
})