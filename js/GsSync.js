function GsSync (_opt) {

    // Notes, functions return _gssync incase you ever wanted to do something which resembled the builder pattern.

    this.options = {};

    /** Initializes GsSync,.
     * @param _19 the option _opt in parent scope.
     * @scope Internal
     * */
    this.initialize = function (_19) {
        this.options.debug = 4; // -1 nothing ever, 0 error, 1 warn 2 info 4 trace
        this.options.instantSync = true; // debug only
        this.options.idleInterval = 30000;
        this.options.interval = 300000;
        this.options.networkTimeout = 3000;
        this.options.testNetwork = false;
        this.setOptions(_19);
        return this
    }

    /** Sets up the timer if not already running.
     * @scope Internal
     * @returns Self
     */
    this.setupTimer = function () {
        var _gssync = this;
        if (this.timer) {
            return _gssync;
        }
        console.log("Setting timer to run " + this.options.interval);
        this.timer = setInterval(function () {
            _gssync.options.debug >= 0 && console.log("GsSync Tick");
            _gssync.doSync();
        }, this.options.interval);
        return _gssync;
    }
    /** Tests for network activity via google's favicon. Uses the traverse function if network is up; passing "true"
     * @scope Internal
     * @returns self, after setting up a callback to http request
     */
    this.ifNetworkThen = function (lamba) {
        var xhr = new XMLHttpRequest(),
            _gssync = this;
        var _27 = setTimeout(function () {
                _gssync.error("NO_NETWORK");
                return this
            }, this.options.networkTimeout);
        xhr.open("GET", "http://www.google.com/favicon.ico", true);
        xhr.send();
        xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    clearTimeout(_27);
                    _27 = null;
                    if (xhr.responseText.length > 100) {
                        lamba();
                    }
                }
            };
        return this
    }

    /** Get the key of the spreadsheet
     * @returns key
     */
    this.getKey = function() {
        var url = this.options.getGSUrl();
        var keyRegex = new RegExp("key=([A-Za-z0-9_-]+)");
        return keyRegex.exec(url)[1];
    };

    /** Starts the sync operation, called by timer def in setupTimer()
     * @scope internal
     */
    this.doSync = function ()
    {
        var _gssync = this;
        _gssync.options.debug >= 0 && console.log("GsSync Tick: doSync");
        // Check to ensure ((new Date().getTime() - this.options.getUpdate()) < this.options.idleInterval
//        if (!_34 && this.options.testNetwork && !this.folder) {
//            return this.testNetwork()
//        }
        if (_gssync.doingSync)
        {
            _gssync.options.debug >= 0 && console.log("Skipping sync already one in progress.");
            return _gssync;
        }
        _gssync.doingSync = true;
        if (!_gssync.activeMangaSheetUrl)
        {
            this.getWorkbook();
        }
        else {
            this.syncActiveManga(_gssync.getKey(), false);
        }
        return _gssync;
    };

    /** Adds an entry to the bottom of the spreadsheet
     * @scope internal
     * @param key the work book key
     * @param value an object with the values to add
     * @return _gssync ref
     */
    this.addToGS = function (key, value) {
        var _gssync = this;
        var keyRegex = new RegExp("full/([A-Za-z0-9_-]+)$");
        _gssync.options.debug >= 2 && console.log(_gssync.activeMangaSheetUrl);
        var sheetKey = keyRegex.exec(_gssync.activeMangaSheetUrl)[1];
        var url = "http://spreadsheets.google.com/feeds/list/"+key+"/"+sheetKey+"/private/full";
        _gssync.options.debug >= 4 && console.log(url);
        value['status'] = 'active';
        var map = $(['mirror', 'name', 'url', 'lastChapterReadURL', 'lastChapterReadName', 'read', 'update', 'ts', 'display', 'cats', 'status'])
            .map(function () {
                return '<gsx:' + this.toLowerCase() + '>' + value[this] + '</gsx:' + this.toLowerCase() + '>';
            });
        _gssync.options.debug >= 4 && console.log(map);
        var row = '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended"> ' +
                map.toArray().join() +
                '</entry>';
        _gssync.options.debug >= 4 && console.log(row);
        $.ajax({
            url: url,
            type: "POST",
            dataType: "xml",
            contentType: "application/atom+xml",
            data: row,
            success: function (data, textStatus, jqXHR)
            {
                return _gssync;
            },
            error: function(jqXHR, textStatus, errorThrown)
            {
                _gssync.options.debug >= 1 && console.log(textStatus);
                _gssync.options.debug >= 1 && console.log(errorThrown);
                _gssync.options.debug >= 4 && console.log(jqXHR);
            },
            timeout: _gssync.options.timeout
        });

        return _gssync;
    };

    /** Remove from the Google spreadsheet - Moves from active manga to inactive manga - or marks inactive. TBD
     * @scope internal
     * @param key workbook key
     * @param value the object to be deleted. Uses full manga object with gs and local.
     * @return _gssync ref
     */
    this.removeFromGS = function (key, value)
    {
        var _gssync = this;
        if (value.local['status'] == 'inactive') {
            return _gssync;
        }
        value.local['ts'] = Math.round((new Date()).getTime() / 1000);
        return _gssync.updateInGS(key, value, "inactive");
    }

    /** Updates in the Google spreadsheet
     * @scope internal
     * @param key workbook key
     * @param value the object to be deleted. Uses full manga object with gs and local.
     * @param status the status status.
     * @return _gssync ref
     */
    this.updateInGS = function (key, value, status)
    {
        var _gssync = this;
        if (value.local['status'] == 'inactive') {
            return _gssync;
        }
        _gssync.options.debug >= 2 && console.log(_gssync.activeMangaSheetUrl);
        var keyRegex = new RegExp("full/([A-Za-z0-9_-]+)$");
        var sheetKey = keyRegex.exec(_gssync.activeMangaSheetUrl)[1];
//        var url = "http://spreadsheets.google.com/feeds/list/" + key + "/" + sheetKey + "/private/full";
        var url = value.gs.gskeyedit;

        _gssync.options.debug >= 4 && console.log(url);
        if (!status || status)
        {
            value.local['status'] = 'active';
        }
        else {
            value.local['status'] = status;
        }
        var map = $(['mirror', 'name', 'url', 'lastChapterReadURL', 'lastChapterReadName', 'read', 'update', 'ts', 'display', 'cats', 'status'])
            .map(function () {
                return '<gsx:' + this.toLowerCase() + '>' + value.local[this] + '</gsx:' + this.toLowerCase() + '>';
            });
        _gssync.options.debug >= 4 && console.log(map);
        var row = '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended"> ' +
            '<id>'+value.gs.gskey+'</id>' +
            map.toArray().join() +
            '</entry>';
        _gssync.options.debug >= 4 && console.log(row);

        $.ajax({
            url: url,
            type: "PUT",
            dataType: "xml",
            contentType: "application/atom+xml",
            data: row,
            success: function (data, textStatus, jqXHR)
            {
                return _gssync;
            },
            error: function(jqXHR, textStatus, errorThrown)
            {
                _gssync.options.debug >= 1 && console.log(textStatus);
                _gssync.options.debug >= 1 && console.log(errorThrown);
                _gssync.options.debug >= 4 && console.log(jqXHR);
            },
            timeout: _gssync.options.timeout
        });
        return _gssync;
    }


    /** Fetches the active mangga then syncs
     * @param key workbook key to be helpful.
     * @param forceWrite another way of saying, don't delete
     * @scope internal
     * @return reference to object
     */
    this.syncActiveManga = function (key, forceWrite) {
        var _gssync = this;
        _gssync.options.debug >= 2 && console.log(_gssync.activeMangaSheetUrl);
        var keyRegex = new RegExp("full/([A-Za-z0-9_-]+)$");
        var sheetKey = keyRegex.exec(_gssync.activeMangaSheetUrl)[1];
        var url = "http://spreadsheets.google.com/feeds/list/" + key + "/" + sheetKey + "/private/full";
        _gssync.options.debug >= 2 && console.log("Syncing: " + url);

        $.ajax({
            url: url,
            type: "GET",
            dataType: "xml",
            success: function (data, textStatus, jqXHR)
            {
                var response = $(data);
                var actionMap = {};
                response.find("entry").each(function (index, value)
                {
                    var url = $(value).find("url").text();
                    var gskeyedit = null;
                    $.each( $(value).find("link"), function (index, value)
                    {
                        if (value.getAttribute("rel") == "edit")
                        {
                            gskeyedit = value.getAttribute("href");
                        }
                    });
                    var gsObj = {
                        url: url,
                        name: $(value).find("name").text(),
                        mirror: $(value).find("mirror").text(),
                        lastChapterReadURL: $(value).find("lastChapterReadURL".toLocaleLowerCase()).text(),
                        lastChapterReadName: $(value).find("lastChapterReadName".toLocaleLowerCase()).text(),
                        read: parseInt($(value).find("read").text()),
                        update: parseInt($(value).find("update").text()),
                        ts: parseInt($(value).find("ts").text()),
                        display: parseInt($(value).find("display").text()),
                        cats: $(value).find("cats").text(),
                        status: $(value).find("status").text(),
                        gskey: $(value).find("id").text(),
                        gskeyedit: gskeyedit
                    };
                    actionMap[url] = {
                        'gs': gsObj
                    };
                });

                var curCollection = JSON.parse(_gssync.options.collect());
                _gssync.options.debug >= 4 && console.log(curCollection);
                $.each(curCollection, function (index, value)
                {
                    if (!actionMap[value.url]) // Doesn't exist in remote
                    {
                        _gssync.options.debug >= 4 && console.log("at i " + index );
                        _gssync.options.debug >= 4 && console.log(value.url);
                        _gssync.options.debug >= 4 && console.log(actionMap[value.url]);
                        actionMap[value.url] = {};
                    }
                    actionMap[value.url].local = value;
                });
                _gssync.options.debug >= 4 && console.log(actionMap);
                $.each(actionMap, function (amkey, value)
                {
                    _gssync.options.debug >= 2 && console.log("Syncing " + amkey);
                    if (value.gs && !value.local)
                    {
                        _gssync.options.debug >= 2 && console.log("remote but not local");
                        if (value.gs.status == 'active')
                        {
                            _gssync.options.readManga(value.gs);
                        }
                        // _gssync.removeFromGS(key, value.local); //TODO: How?
                    } else if (!value.gs && value.local)
                    {
                        _gssync.options.debug >= 2 && console.log("local but not remote");
                        _gssync.addToGS(key, value.local);
                    } else if (value.gs && value.local) // redundant but meh
                    {
                        _gssync.options.debug >= 2 && console.log("Actual sync");
                        if (value.gs.ts > value.local.ts && value.gs.status == 'inactive')
                        {
                            _gssync.options.debug >= 2 && console.log("Delete manga from local list");
                            _gssync.options.deleteManga(value.gs.url);
                        } else if (value.gs.ts < value.local.ts && value.gs.status == 'inactive')
                        {
                            _gssync.options.debug >= 2 && console.log("Manga undeleted / updated");
                            _gssync.updateInGS(key, value, "active");
                        } else if (value.gs.ts > value.local.ts)
                        {
                            _gssync.options.debug >= 2 && console.log("Manga updated remote to local");
                            _gssync.options.readManga(value.gs);
                        } else if (value.gs.ts < value.local.ts)
                        {
                            if (value.gs.lastChapterReadURL != value.local.lastChapterReadURL) // Otherwise sync 'almost loop'
                            {
                                _gssync.options.debug >= 2 && console.log("Manga updated local to remote");
                                _gssync.updateInGS(key, value, "active");
                            }
                        }
                    }
                });
                // update synced
//                _35.synced = _37.syncedAt;
                _gssync.doingSync = false;

            },
            error: function(jqXHR, textStatus, errorThrown)
            {
                _gssync.options.debug >= 1 && console.log(textStatus);
                _gssync.options.debug >= 1 && console.log(errorThrown);
                _gssync.doingSync = false;
            },
            timeout: _gssync.options.timeout
        });


        return _gssync;
    };

    /** Creates the required sheets
     * @param key to be helpful.
     * @param storeKey key to store it in _gssync with
     * @scope internal
     * @return reference to object
     */
    this.createSheet = function (key, storeKey, values, lamba) {
        var _gssync = this;
        var url = "http://spreadsheets.google.com/feeds/worksheets/"+key+"/private/full";
        var content = '<entry xmlns="http://www.w3.org/2005/Atom" '+
            'xmlns:gs="http://schemas.google.com/spreadsheets/2006"> '+
            '<title>'+values['title']+'</title> '+
            '<gs:rowCount>50</gs:rowCount> '+
            '<gs:colCount>11</gs:colCount> '+
            '</entry>';
        _gssync.options.debug >= 4 && console.log(url);
        _gssync.options.debug >= 4 && console.log(content);
        $.ajax({
            url: url,
            data: content,
            dataType: "xml",
            contentType: "application/atom+xml",
            type: "POST",
            success: function (data, textStatus, jqXHR)
            {
                var response = $(data);
                _gssync.options.debug >= 2 && console.log("Got created sheet" + storeKey);
                response.find("entry").each(function (index, value)
                {
                    var each = $(value);
                    _gssync[storeKey] = each.find("id").text();
                });
                if (lamba)
                {
                    return lamba();
                }
                return _gssync.createSheets(key, false); // Go back to continue the next step
            },
            error: function(jqXHR, textStatus, errorThrown)
            {
                _gssync.options.debug >= 1 && console.log(textStatus);
                _gssync.options.debug >= 1 && console.log(errorThrown);
                _gssync.options.debug >= 4 && console.log(jqXHR);
                _gssync.doingSync = false;
            },
            timeout: _gssync.options.timeout
        });
        return _gssync;
    };

    /** Creates a update cell XML query..
     * @scope internal
     * @param url the URL for the worksheet
     * @param row the row to update from 1 onwards
     * @param col the column to update from 1 onwards
     * @param version the version - not used atm
     * @param data The data to update the cell with
     * @param batch boolean if this is part of a batch request. put false in batch in V3 of spreedsheet API has been broken since 2011.
     * @returns Formatted string
     */
    this.createCellEntry = function (url, row, col, version, data, batch) {
        if (batch)
        {
            return 		'        <entry>\n' +
                        '            <batch:id>'+ String.fromCharCode('a'.charCodeAt(0) + (row-1)) +col+'</batch:id>\n' +
                        '            <batch:operation type="update" />\n' +
                        '            <id>'+url+'/R'+row+'C'+col+'</id>\n' +
                        '            <link rel="edit" type="application/atom+xml" href="'+url+'/R'+row+'C'+col+'/'+version+'" />\n' +
                        '            <gs:cell row="'+row+'" col="'+col+'" inputValue="'+ escape(data)+'" />\n' +
                        '        </entry>\n';
        } else {
            return 		'<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gs="http://schemas.google.com/spreadsheets/2006">\n' +
                        '    <id>'+url+'/R'+row+'C'+col+'</id>\n' +
                        '    <link rel="edit" type="application/atom+xml" href="'+url+'/R'+row+'C'+col+'" />\n' +
                        '    <gs:cell row="'+row+'" col="'+col+'" inputValue="'+ escape(data)+'" />\n' +
                        '</entry>\n';
        }
    };

    /** Initializes the manga sheet.... A fancy name for installing the columns , the let's loop until everythings gone version.
     * @scope internal
     * @param key workbook key....
     * @returns {*}
     */
    this.initActiveMangaSheet = function (key) {
        var _gssync = this;
        var keyRegex = new RegExp("full/([A-Za-z0-9_-]+)$");
        _gssync.options.debug >= 2 && console.log(_gssync.activeMangaSheetUrl);
        var sheetKey = keyRegex.exec(_gssync.activeMangaSheetUrl)[1];

        var url = "http://spreadsheets.google.com/feeds/cells/"+key+"/"+sheetKey+"/private/full";
        _gssync.options.debug >= 4 && console.log(url);

        var batch = false;
        var queue = [
            _gssync.createCellEntry(url, 1, 1, 0, "mirror", batch),
            _gssync.createCellEntry(url, 1, 2, 0, "name", batch),
            _gssync.createCellEntry(url, 1, 3, 0, "url", batch),
            _gssync.createCellEntry(url, 1, 4, 0, "lastChapterReadURL", batch),
            _gssync.createCellEntry(url, 1, 5, 0, "lastChapterReadName", batch),
            _gssync.createCellEntry(url, 1, 6, 0, "read", batch),
            _gssync.createCellEntry(url, 1, 7, 0, "update", batch),
            _gssync.createCellEntry(url, 1, 8, 0, "ts", batch),
            _gssync.createCellEntry(url, 1, 9, 0, "display", batch),
            _gssync.createCellEntry(url, 1, 10, 0, "cats", batch),
            _gssync.createCellEntry(url, 1, 11, 0, "status", batch)
        ];


        var initActiveMangaSheetRecurs = function ()
        {
            _gssync.options.debug >= 2 && console.log("Recurs");
            var data = queue.pop();
            $.ajax({
                url: url,
                type: "POST",
                dataType: "xml",
                contentType: "application/atom+xml",
                data: data,
                success: function (data, textStatus, jqXHR)
                {
                    if (queue.length > 0)
                    {
                        return initActiveMangaSheetRecurs();
                    }
                    return _gssync.createSheets(key, true);
                },
                error: function(jqXHR, textStatus, errorThrown)
                {
                    _gssync.options.debug >= 1 && console.log(textStatus);
                    _gssync.options.debug >= 1 && console.log(errorThrown);
                    _gssync.options.debug >= 4 && console.log(jqXHR);
                    _gssync.options.debug >= 4 && console.log(data);
                    _gssync.options.debug >= 4 && console.log(content);
                    _gssync.doingSync = false;
                },
                timeout: _gssync.options.timeout
            });
        };
        initActiveMangaSheetRecurs();
        return _gssync;
    };
    /** Initializes the manga sheet.... A fancy name for installing the columns - Batch version.. Broken.
     * @scope internal
     * @param key workbook key....
     * @returns {*}
     */
    this.initActiveMangaSheetBatch = function (key) {
        var _gssync = this;
        var keyRegex = new RegExp("full/([A-Za-z0-9_-]+)$");
        _gssync.options.debug >= 2 && console.log(_gssync.activeMangaSheetUrl);
        var sheetKey = keyRegex.exec(_gssync.activeMangaSheetUrl)[1];

        var url = "http://spreadsheets.google.com/feeds/cells/"+key+"/"+sheetKey+"/private/full";
        _gssync.options.debug >= 4 && console.log(url);

        var batch = true;
        var content = '<feed xmlns="http://www.w3.org/2005/Atom" xmlns:batch="http://schemas.google.com/gdata/batch" xmlns:gs="http://schemas.google.com/spreadsheets/2006">\n' +
            '            <id>'+url+'</id>\n' +
            _gssync.createCellEntry(url, 1, 1, 0, "mirror", batch) +
            _gssync.createCellEntry(url, 1, 2, 0, "name", batch) +
            _gssync.createCellEntry(url, 1, 3, 0, "url", batch) +
            _gssync.createCellEntry(url, 1, 4, 0, "lastChapterReadURL", batch) +
            _gssync.createCellEntry(url, 1, 5, 0, "lastChapterReadName", batch) +
            _gssync.createCellEntry(url, 1, 6, 0, "read", batch) +
            _gssync.createCellEntry(url, 1, 7, 0, "update", batch) +
            _gssync.createCellEntry(url, 1, 8, 0, "ts", batch) +
            _gssync.createCellEntry(url, 1, 9, 0, "display", batch) +
            _gssync.createCellEntry(url, 1, 10, 0, "cats", batch) +
            _gssync.createCellEntry(url, 1, 11, 0, "status", batch) +
		    '</feed>';

        $.ajax({
            url: url + "/batch",
            type: "PUT",
            dataType: "xml",
            contentType: "application/atom+xml",
            data: content,
            success: function (data, textStatus, jqXHR)
            {
                var response = $(data);
                //TODO: check output
                return _gssync.createSheets(key, true);
            },
            error: function(jqXHR, textStatus, errorThrown)
            {
                _gssync.options.debug >= 1 && console.log(textStatus);
                _gssync.options.debug >= 1 && console.log(errorThrown);
                _gssync.options.debug >= 4 && console.log(jqXHR);
                _gssync.options.debug >= 4 && console.log(content);
                _gssync.doingSync = false;
            },
            timeout: _gssync.options.timeout
        });

        return _gssync;
    };
    /** Initializes the amr meta sheet.... A fancy name for NOT installing the columns
     * @scope internal
     * @param key workbook key....
     * @returns {*}
     */
    this.initMetaSheet = function (key, forceWrite) {
        var _gssync = this;
        // Do nothing atm
        return _gssync.createSheets(key, forceWrite);
    };
    /** Creates the required sheets
     * @param key to be helpful.
     * @scope internal
     * @return reference to object
     */
    this.createSheets = function (key, forceWrite) {
        var _gssync = this;
        // Called recursively through each step..
        _gssync.options.debug >= 1 && console.log("create Sheets");
        if (!_gssync.amrMetaSheetUrl)
        {
            _gssync.options.debug >= 2 && console.log("Creating meta");
            return _gssync.createSheet(key, "amrMetaSheetUrl", { title: "AMRMeta" }, function () { _gssync.initMetaSheet(key, forceWrite); } );
        }
        if (!_gssync.activeMangaSheetUrl)
        {
            _gssync.options.debug >= 2 && console.log("Creating active manga");
            return _gssync.createSheet(key, "activeMangaSheetUrl", { title: "ActiveManga" }, function () {  _gssync.initActiveMangaSheet(key); } );
            // This doesn't call createSheets() again - it goes straight on to populate data.
        }
        return _gssync.syncActiveManga(key, forceWrite); // Continue on to where we were.
    };
    /** Fetches workbook so we can find the sheets, if any are missing creates them. Passes flow onto "syncActiveManga"
     * @scope internal
     * @return reference to object
     */
    this.getWorkbook = function () {
        var _gssync = this;
        var key = _gssync.getKey();
        _gssync.options.debug >= 4 && console.log( "http://spreadsheets.google.com/feeds/worksheets/"+key+"/private/full");
        $.ajax({
            url: "http://spreadsheets.google.com/feeds/worksheets/"+key+"/private/full",
            type: "GET",
            dataType: "xml",
            success: function (data, textStatus, jqXHR)
            {
                if (data == "")
                {
                    console.log("Worksheet is empty; probably a cookie issue. Please login to Gmail/Chrome Sync");
                    return _gssync;
                }
                var response = $(data);
                _gssync.options.debug >= 2 && console.log("Got books.");
                response.find("entry").each(function (index, value)
                {
                    var each = $(value);
                    var title = each.find("title").text();
                    if (title === "ActiveManga")
                    {
                        _gssync.activeMangaSheetUrl = each.find("id").text();
                    }
                    if (title === "AMRMeta")
                    {
                        _gssync.amrMetaSheetUrl = each.find("id").text();
                    }
                });
                if (!_gssync.activeMangaSheetUrl || !_gssync.amrMetaSheetUrl)
                {
                    return _gssync.createSheets(key, false);
                }
                return _gssync.syncActiveManga(key, false);
            },
            error: function(jqXHR, textStatus, errorThrown)
            {
                _gssync.options.debug >= 1 && console.log(textStatus);
                _gssync.options.debug >= 1 && console.log(errorThrown);
                _gssync.doingSync = false;
            },
            timeout: _gssync.options.timeout
        });
    }

    /** Starts timer, and if bookmark hook hasn't been registered. Register it. Called by background.js on param save,
     * init(), and locally by traverse(), and attach()
     * @scope public
     * @returns self or result of attach().
     */
    this.start = function () {
        var _gssync = this;
        this.setupTimer();
        this.isRunning = true;
        _gssync.doingSync = false;
        if (this.options.instantSync)
        {
            this.doSync();
        }
        return this
    }
    /** Starts timer, and if bookmark hook hasn't been registered. Register it. Called by background.js on param save / change,
     * and locally by and attach() (For a restart.)
     * @scope public
     * @returns self or result of attach().
     */
    this.stop = function () {
        if (!this.isRunning) {
            return this
        }
        clearInterval(this.timer);
        this.timer = null;
        this.isRunning = false;
        return this
    }
    /** Copies options provided by constructor into code. called by initialize() only
     * @scope internal
     * @param _settings map of values to set
     * @returns {*}
     */
    this.setOptions = function (_settings) {
        for (var i in _settings) {
                if (typeof(_settings[i]) == "function") {
                    this.options[i] = _settings[i].bind(this)
                } else {
                    this.options[i] = _settings[i]
                }
            }
        return this
    }

    this.initialize(_opt);
    return this
};
