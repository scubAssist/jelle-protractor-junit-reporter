var util = require('./lib/util'),
  mkdirp = require('mkdirp'),
  XMLWriter = require('xml-writer'),
  moment = require('moment'),
  fs = require('fs'),
  path = require('path');

/*
 Jolle
*/



var noopTimer = {
  start: function () {},
  elapsed: function () {
    return 0;
  }
};

function escapeRegExp(str) {
  return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function JUnitScreenshotReporter(options) {
  var
    timer = options.timer || noopTimer,
    basePath = options.basePath,
    saveSuccess = options.saveSuccess || false,
    saveFailure = options.saveFailure || true,
    xmlReportDestPath = options.xmlReportDestPath,
    specCount,
    successCount,
    failureCount,
    specs = [],
    pendingCount;

  this.jasmineStarted = function () {
    specCount = 0;
    successCount = 0;
    failureCount = 0;
    pendingCount = 0;
    timer.start();
  };

  this.generateReport = function () {
    var xw = new XMLWriter(true);
    xw.startDocument();
    xw.startElement('testsuite');

    var seconds = timer.elapsed() / 1000;

    if (this.failureCount > 0) {
      xw.writeAttribute('errors', failureCount);
      xw.writeAttribute('failures', failureCount);
    }
    xw.writeAttribute('tests', specCount);
    //xw.writeAttribute('name', automationHeader); TODO
    xw.writeAttribute('time', seconds);
    xw.writeAttribute('timestamp', moment().format('YYYY-MM-DDTHH:mm:ss'));

    for (var t = 0; t < specs.length; t++) {
      xw.startElement('testcase');
      xw.writeAttribute('className', specs[t].description);
      xw.writeAttribute('name', specs[t].description);
      //xw.writeAttribute('time', this.specs[t].duration / 1000); TODO
      if (specs[t].status == "pending") {
        xw.startElement('skipped');
        xw.writeAttribute('message', 'Skipped reason not provided by Protractor');
        xw.endElement(); // skipped
      }
      if (specs[t].status == "failed") {
        xw.startElement('failure');
        xw.writeAttribute('type', 'testfailure');
        xw.writeAttribute('message', 'Skipped reason not provided by Protractor');

        for (var i = 0; i < specs[t].failedExpectations.length; i++) {
          var failedExpectation = specs[t].failedExpectations[i];
          xw.text(failedExpectation.message + '. ');
          xw.text(failedExpectation.stack + '. ');
        }
        xw.endElement(); //failure
      }

      // if (allResults[t] != "true") {
      //   if (allResults[t] == 'Skipped') {
      //     xw.startElement('skipped');
      //     xw.writeAttribute('message', 'Skipped reason not provided by Protractor');
      //   } else {
      //     xw.startElement('failure');
      //     xw.writeAttribute('type', 'testfailure');
      //     for (var jk = 0; jk < testArray[t].assertions.length; jk++) {
      //       xw.text(testArray[t].assertions[jk].errorMsg + '. ');
      //       xw.text(testArray[t].assertions[jk].stackTrace + '. ');
      //     }
      //   }
      //   xw.endElement(); //failure
      // }

      if (specs[t].screenshot) {
        // screenshot
        xw.startElement('system-out');
        xw.text('[[ATTACHMENT|' + specs[t].screenshot + ']]')
        xw.endElement(); // system-out
      }
      xw.endElement(); //testcase
    }

    xw.writeElement('system-out', 'beta');
    xw.endElement(); //testsuite
    xw.endDocument();

    return xw.toString();
  }

  this.jasmineDone = function () {
    // XML Rapport wegschrijven

    var result = this.generateReport();
    fs.writeFileSync(path.resolve(xmlReportDestPath), result);

    //   printNewline();
    //   for (var i = 0; i < failedSpecs.length; i++) {
    //     specFailureDetails(failedSpecs[i]);
    //   }

    //   printNewline();
    //   var specCounts = specCount + " " + plural("spec", specCount) + ", " +
    //     failureCount + " " + plural("failure", failureCount);

    //   if (pendingCount) {
    //     specCounts += ", " + pendingCount + " pending " + plural("spec", pendingCount);
    //   }

    //   print(specCounts);

    //   printNewline();
    //   var seconds = timer.elapsed() / 1000;
    //   print("Finished in " + seconds + " " + plural("second", seconds));

    //   printNewline();

    //onComplete(failureCount === 0);
  };

  this.specDone = function (result) {
    specCount++;

    if (result.status == "pending") {
      pendingCount++;
      return;
    }

    if (result.status == "passed") {
      successCount++;
      // Sla een screenshot op
      if (saveSuccess) {
        this.saveScreenshot(result);
      }

      specs.push(result);
      return;
    }

    if (result.status == "failed") {
      failureCount++;
      // Sla een screenshot op
      if (saveFailure) {
        this.saveScreenshot(result);
      }

      specs.push(result);
    }
  };

  this.saveScreenshot = function (result) {
    //var self = this;
    browser.takeScreenshot().then(function (png) {
      var screenShotFile = replaceAll(replaceAll(result.id, '.', '_'), ' ', '_') + '.png',
        screenShotPath = path.join(basePath, screenShotFile),
        directory = path.dirname(screenShotPath);

      mkdirp(directory, function (err) {
        if (err) {
          throw new Error('Could not create directory ' + directory);
        } else {
          util.storeScreenShot(png, screenShotPath);
          result.screenshot = screenShotPath;
        }
      });
    });
  }

  return this;
}

module.exports = JUnitScreenshotReporter;
