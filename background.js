chrome.browserAction.onClicked.addListener(function(e) {
        chrome.tabs.executeScript(e.id, {
        file: "jquery-3.5.1.min.js"
    }, function() {
        chrome.tabs.executeScript(e.id, {
            file: "contentscript.js"
        })
    })
})
