/*
 * HyperLinkBuilder.jsx
 * Javascript for InDesign CC(xxxx), CS6, CS5.5, CS5
 * Version date: 20170417
 *
 * PURPOSE:
 * ========
 * Convert any text styled with a given Character Style to a HyperLink URL
 * like URLs, email or part numbers
 * Hyperlinks also work in PDF files.
 *
 * AUTHOR:
 * ===========
 * Andreas Imhof
 * EDV-Dienstleistungen
 * CH-Guemligen, Switzerland
 * www.aiedv.ch
 * Copyright 2015-2017
 *
 * DISCLAIMER:
 * ===============
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * 
 */
 
#target "InDesign"
#targetengine "HyperLinkBuilder"


var  HyperLinkBuilder = function() {

	var TargetApp = "InDesign",
		INDminVersion = "7",
		INDminVersionName = "CS5",
		// run with CS5 7.x.x, CS6 8.x.x, CC 9.x.x
		appVersion = app.version,
		majorINDVersion = parseInt(appVersion.split(".")[0], 10);
	// check InDesign and version
	if (app.name.toLowerCase().indexOf(TargetApp.toLowerCase()) < 0) {	// application name like 'Adobe InDesign'
		alert("This script runs with " + TargetApp + " version " + INDminVersion + " ( " + INDminVersionName + " ) or newer.");
		exit(0);
	}
	if (parseInt(majorINDVersion, 10) < parseInt(INDminVersion, 10)) {	// version string is like 8.0.2.413 for InDesign CS6
		alert("This script needs " + TargetApp + " version " + INDminVersion + " ( " + INDminVersionName + " ) or newer.");
		exit(0);
	}


	if (typeof(HB_settings) == 'undefined') {
		var	HB_settings = {
				charStyleName: "",
				beforeURLText: "http://www.",
				afterURLText: "",
				noDialog: 0,
				silent: 0,
				hyperlinksCleaning: 0,
				hl_appearance: {
					visible: false,
					borderColor:"BLUE",
					borderStyle:"SOLID",
					highlight:"NONE",
					width:"THIN"
				},
				dlgw_location: []			// dialog window last position
			};
	}
	if (typeof(HB_wrk) == 'undefined') {
		var HB_wrk = {
			dlgw: null,				// main dialog palette
			isopen: false,
			activeDocumentID: null,	// track active document
			activeDocumentName: ""
		};
	}
	else {
		HB_wrk.activeDocumentID = null;	// reset active document on load
		HB_wrk.activeDocumentName = "";
	}

	var settingsFileName = "settings.set",  // define default settings file name. default = "settings.set"
		settingsFilePath = "",
		totalFOUNDlinks = 0,
		totalCONVERTEDlinks = 0,
		folderSeparator = "/",

		Product = {
			applicationName: "HyperLinkBuilder",
			productShortcut: "HBid",
			version: "10",
			versionStr: "10.0",				// human readable version string
			sub_version: "0",				// any free fixes: a sub-version
			copyRight: "©www.AiEDV.ch"
		},

		charStylesArr = [],
		charStyleIdx = 0,
		HB_isBusy = false,

		scriptsPath = "",
		getScriptsPath = function () {
			var fullpath, scriptFile,
				app_activeScript = null;
			try {
				app_activeScript = app.activeScript;	// if app.activeScript is undefined we can not test typeof!!!
			} catch(ex){}

			if (app_activeScript !== null) {	// if defined
				fullpath = app_activeScript;
				scriptFile = new File(fullpath);
				return(scriptFile.path);
			}

			return scriptsPath;
		};
		scriptsPath = getScriptsPath();	// in case where getScriptsPath is called from a handler app.activeScript is undefined
		//alert("init scriptsPath: " + scriptsPath);

	settingsFilePath = "~/" + Product.applicationName + "Support";	// define default settings path



	/**
	 * setTimeout
	 * Version 1.0
	 * A setTimeout function implementation for InDesign ExtendScript like known from a Browser's Javascript.
	 * Uses InDesign's idleTask stuff.
	 * Timeout milliseconds are not accurate, but it allows to call a heavy load script,
	 * split it up into small junks for InDesign is not blocked too long and has time to breath.
	 *
	 * The script MUST run in its dedicated target engine:
	 * #target "InDesign"
	 * #targetengine "myOwnEngineName"
	 *
	 * DISCLAIMER:
	 * No warranty - use as is or modify but retain the originator's coordinates:
	 * CopyRight Andreas Imhof, www.aiedv.ch, ai@aiedv.ch
	 */
	//
	var setTimeout_Task_curfile = new File($.fileName),
	setTimeout_Task_curfullname = decodeURI(setTimeout_Task_curfile.name),
									// setTimeout_Taskname must be a UNIQUE name, so we take it from the current running script!! 
									// May be set to any String like
									// setTimeout_Taskname = 'myOwnTask';
	setTimeout_Taskname = setTimeout_Task_curfullname.lastIndexOf(".") > 0 ? (setTimeout_Task_curfullname.substr(0,setTimeout_Task_curfullname.lastIndexOf("."))) : setTimeout_Task_curfullname,

	setTimeout_Tasks = {},	// all defined tasks prepared to run
	/**
	 * setTimeout_hasIdleTask
	 * Utility function
	 * @param {Number} the timeout task id
	 * @return {Boolean} true if a given timeout id also has his attached idleTask
	 */
	setTimeout_hasIdleTask = function(id) {
		var has = false, i;
		for (i = 0; i < app.idleTasks.length; i++) {
			//alert("id: " + id + " tid: " + app.idleTasks[i].label);
			if (app.idleTasks[i].isValid && (app.idleTasks[i].id === id)) {
				has = true;
				break;
			}
		}
		return has;
	},
	/**
	 * setTimeoutList
	 * Utility function
	 * @return {String} a list of all currently active setTimeout_Tasks
	 */
	setTimeoutList = function() {
		var list = "", cb,
			k;
		for (k in setTimeout_Tasks) {
			if (list !== "") list += ",";
			cb = setTimeout_Tasks[k]["cb"].toString();
			cb = cb.replace(/\s/g,"");
			list += setTimeout_Tasks[k]["taskid"] + ":" + cb;
		}
		return list;
	},
	/**
	 * idleTasksList
	 * Utility function
	 * @return {String} a list of all currently active idleTasks
	 */
	idleTasksList = function() {
		var list = "",
			k;
		for (k = 0; k < app.idleTasks.length; k++) {
			if (list !== "") list += ",";
			list += app.idleTasks[k].id + ":" + setTimeout_hasIdleTask(app.idleTasks[k].id) + ":" + app.idleTasks[k].label;
		}
		return list;
	},
	/**
	 * setTimeoutInit
	 * Init/clean the timeout system
	 */
	setTimeoutInit = function() {
		var it;
		// remove all (erroneous) idleTasks
		//alert("set idleTasks: " + app.idleTasks.length);
		//NA: logmess("setTimeoutInit set idleTasks: " + app.idleTasks.length + "\n");
		for (it = 0; it < app.idleTasks.length; it++) {
			if (app.idleTasks[it].label == setTimeout_Taskname) {
				//alert("removing idleTask id " + app.idleTasks[it].id + " label: " + app.idleTasks[it].label);
				clearTimeout(app.idleTasks[it].id);
			}
		}
		setTimeout_Tasks = {};
	},
	/**
	 * Tasks Handler
	 * Check if a task can be called now
	 * @param {Number} taskid
	 * @return {Boolean} always false
	 */
	setTimeoutHandler = function(taskid) {
		var now_Ticks = new Date().getTime(),
			cb, cb_retval = undefined;

		try {
			//alert("taskid: " + taskid + "\nnumcalls: " + setTimeout_Tasks[taskid]["numcalls"]);
			// we look for well timed call only!!!	CS6 calls at start AND after the timeout
			if (setTimeout_Tasks[taskid]["end_ticks"] > now_Ticks) {	// we have not reached timeout
				//NA: logmess("setTimeoutHandler id " +  taskid + " too early by ms: " + (setTimeout_Tasks[taskid]["end_ticks"] - now_Ticks) + "\n");
				//alert("setTimeoutHandler id " +  taskid + " too early by ms: " + (setTimeout_Tasks[taskid]["end_ticks"] - now_Ticks));
				setTimeout_Tasks[taskid]["numcalls"] += 1;
				return false;	// wait for next call
			}
		}
		catch(ex) {
			alert("Exception (1) in function 'setTimeoutHandler()', taskid " + taskid + ":\n" + ex);
		}

		try {
			cb = setTimeout_Tasks[taskid]["cb"];	// store the callback
			clearTimeout(taskid);	// remove the timeout
		}
		catch(ex) {
			alert("Exception (2) in function 'setTimeoutHandler()', taskid " + taskid + ":\n" + ex);
		}

		try {
			//NA: logmess("setTimeoutHandler call " +  cb + "\n");
			cb_retval = cb();	// call the cb
			//if (cb_retval) alert("cb_retval:\n" + cb_retval);
		} catch(ex) {
			alert("Exception in function '" + cb() + ":\n" + ex);
		}

		return false;
	},
	/**
	 * setTimeout
	 * Set a function to called after the given timeout
	 * @param {function} callback the function to call
	 * @param {Number} timeout in ms
	 * @return {Boolean} null on error, otherwise the id (can be used with clearTimeout
	 */
	setTimeout = function(callback,timeout) {
		try {
			var idle_Task,
				now_Ticks = new Date().getTime();
			idle_Task = app.idleTasks.add({sleep:timeout});
			idle_Task.label = setTimeout_Taskname;
			setTimeout_Tasks[idle_Task.id] = {
				"label": setTimeout_Taskname,
				"start_ticks": now_Ticks,
				"sleep": timeout,
				"end_ticks": now_Ticks + timeout,
				"cb": callback,
				"taskid": idle_Task.id,
				"numcalls": 0
				};
			setTimeout_Tasks[idle_Task.id].handler = function(ev){setTimeoutHandler(setTimeout_Tasks[idle_Task.id]["taskid"]);};
			idle_Task.addEventListener(IdleEvent.ON_IDLE, setTimeout_Tasks[idle_Task.id].handler,false);
			//NA: logmess("setTimeout idle_Task.id: " + idle_Task.id + ", timeout: " + timeout + "\ncallback: " + callback + "\n");
			return idle_Task.id;
		}
		catch(ex) {
			alert("Exception in function 'setTimeout()':\n" + ex);
		}
		return null;
	},
	/**
	 * clearTimeout
	 * Clear the timeout given by the setTimeout return value
	 * @param {Number} id the timeout id to clear
	 */
	clearTimeout = function (id){
		var i, task = null;
		for (i = 0; i < app.idleTasks.length; i++) {
			//alert("id: " + id + " tid: " + app.idleTasks[i].label);
			if ((app.idleTasks[i].id == id) && app.idleTasks[i].isValid) {
				task = app.idleTasks[i];
				break;
			}
		}

		if (task !== null) {
			try {
				if (setTimeout_Tasks[id] && setTimeout_Tasks[id].handler) {
					// this kills any!!!    app.idleTasks.itemByID(id).removeEventListener(IdleEvent.ON_IDLE, setTimeout_Tasks[id].handler,false);
					task.removeEventListener(IdleEvent.ON_IDLE, setTimeout_Tasks[id].handler,false);
				}
				// this kills any!!!    app.idleTasks.itemByID(id).remove();
				//task.remove();
				task.sleep = 0;
			}
			catch(ex) {
				alert("Exception in function 'clearTimeout() idleTasks':\n" + ex);
			}
			try {
				delete setTimeout_Tasks[id];
			}
			catch(ex) {
				alert("Exception in function 'clearTimeout() delete setTimeout_Tasks':\n" + ex);
			}
		}
	};
	/**
	 * Init/clean the timeout system
	 */
	setTimeoutInit();
	// alert(setTimeout_Taskname);	// Just to check if the 'setTimeout_Taskname' was set correctly



	var haveCallerScript = false,

	main = function (func, theSettingsFileName, noDialog, silent) {

		if ( (typeof(func) != 'undefined') && (func == 0) ) return;	// do nothing - just stay loaded
		appLanguageCode = getAppLanguageCode(app.locale);
		//appLanguageCode = "en";	// uncomment to override the InDesign application language

		if (appLanguageCode == "en") {
			//HBlocal_en();	// set internal English (always done at startup as default)
		}
		else {
			var languageFileName = getScriptsPath() + folderSeparator + "localized" + folderSeparator + "HBlocal_" + appLanguageCode + ".jsx",
				languageFile = new File(languageFileName);
			if (languageFile.exists == false) {
				// english already loaded
				//HBlocal_en();	// set internal English (always at startup done as default)
			}
			else {	// load the localized file
				app.doScript(languageFile,ScriptLanguage.javascript,[lg]);
			}
		}

		// get script parameters
		try {
			if ( app.scriptArgs.isDefined("charStyleName") ) {
				HB_settings.charStyleName = app.scriptArgs.getValue("charStyleName");
				haveCallerScript = true;
			}
		} catch(e) {}
		try {
			if ( app.scriptArgs.isDefined("beforeURLText") ) {
				HB_settings.beforeURLText = app.scriptArgs.getValue("beforeURLText");
				haveCallerScript = true;
			}
		} catch(e) {}
		try {
			if ( app.scriptArgs.isDefined("afterURLText") ) {
				HB_settings.afterURLText = app.scriptArgs.getValue("afterURLText");
				haveCallerScript = true;
			}
		} catch(e) {}
		try {
			if ( app.scriptArgs.isDefined("noDialog") ) {
				HB_settings.noDialog = parseInt(app.scriptArgs.getValue("noDialog"));
				haveCallerScript = true;
			}
		} catch(e) {}
		try {
			if ( app.scriptArgs.isDefined("silent") ) {
				HB_settings.silent = parseInt(app.scriptArgs.getValue("silent"));
				haveCallerScript = true;
			}
		} catch(e) {}
		try {
			if ( app.scriptArgs.isDefined("hyperlinksCleaning") ) {
				HB_settings.hyperlinksCleaning = parseInt(app.scriptArgs.getValue("hyperlinksCleaning"));
				haveCallerScript = true;
			}
		} catch(e) {}


		// load default "settings.set" file
		if (typeof(theSettingsFileName) != 'undefined') settingsFileName = theSettingsFileName;
		loadSettingsFromFile();

		if (typeof(noDialog) != 'undefined') HB_settings.noDialog = noDialog;
		if (typeof(silent) != 'undefined') HB_settings.silent = silent;

		// let's go
		if (HB_settings.noDialog == 0)  {
			var go = mainDialog();
		}
		else {	// convert direct
			createHyperlinks();
		}
	},
	list_object = function(obj, which, objname, nofuncs) {
		if (typeof(obj) == 'undefined') return('undefined');
		if (typeof(obj) == null) return('null');
		var str = "",
			numprops = 0, n = 0;
		if ((typeof(objname) != 'undefined') && (objname != '')) str += objname + "={";
		else str += "{";
		for (var key in obj) numprops++;
		for (var key in obj) {
			if ((typeof(which) != 'undefined') && (which != '') && (key.toLowerCase().indexOf(which) < 0)) continue;
			try {
				if ( (obj[key].constructor.name == 'Function') && (typeof(nofuncs) != 'undefined') && (nofuncs == true) ) continue;

				str += "\"" + key + "\":";
				//alert (key + ": " + obj[key] + ": " + obj[key].constructor.name);
				switch (obj[key].constructor.name) {
					case 'Array':
						var arr = obj[key];
						str += "[";
						for (var i = 0; i < arr.length; i++) {
							str += (typeof(arr[i]) == 'string' ? "\"" : "") + arr[i] + (typeof(arr[i]) == 'string' ? "\"" : "");
							if (i < (arr.length-1)) str += ",";
						}
						str += "]";
						break;
					case 'String':
						 str += "\"" + obj[key] + "\"";
						break;
					case 'Point':
						 str += "[" + obj[key][0] + "," + obj[key][1] + "]";
						break;
					case 'Function':
						 str += "[" + obj[key][0] + "," + obj[key][1] + "]";
						break;
					default:	// Number
						 str += obj[key];
						 break;
				}
			} catch(ex){
				str += "\"\"";
			}
			n++;
			if (n < numprops) str += ",";
		}
		str += "}";
		return(str);
	},

	changed_activeDocument = function() {
		var doc, doc_id = null, doc_name = "", doc_changed = false;
		try {	// must try/catch: a document could be about to closing but window is still showing
			doc = app.activeDocument;	// this breaks when a document is closing
			if (app.documents.length > 0) {
				doc_id = doc.id;
				doc_name = doc.name;
			}
			else {
				doc_id = null;
				doc_name = "";
			}
		} catch(ex) {
				doc_id = null;
				doc_name = "";
		}
		if ((doc_id !== HB_wrk.activeDocumentID) || (doc_name != HB_wrk.activeDocumentName)) doc_changed = true;
		else doc_changed = false;

		//if (doc_changed) alert("doc changed:\n" + list_object(HB_wrk) + "\n\ndoc_id: " + doc_id + "\ndoc_name: " + doc_name);
		//else alert("doc NOT changed:\n" + list_object(HB_wrk) + "\n\ndoc_id: " + doc_id + "\ndoc_name: " + doc_name);
		HB_wrk.activeDocumentID = doc_id;
		HB_wrk.activeDocumentName = doc_name;

		return(doc_changed);
		},
	numdocs_available = function() {
		try {	// must try/catch: a document could be about to closing but window is still showing
			var doc = app.activeDocument;	// this breaks when a document is closing
			if (app.documents.length <= 0) return(0);
		} catch(ex) {
			return(0);
		}
		return(app.documents.length);
		},
	get_charStyles = function() {
		var actdoc;
		if (numdocs_available < 1) {
			charStylesArr = [];
			charStyleIdx = 0;
			return;
		}
		try {	// must try/catch: a document could be about to closing but window is still showing
			actdoc = app.activeDocument;
		} catch(ex) {
			actdoc = null;
		};
		if (!actdoc) {
			charStylesArr = [];
			charStyleIdx = 0;
			return;
		}

		charStylesArr = ([].concat(app.activeDocument.characterStyles.everyItem().name));
		//alert("charStylesArr: " + charStylesArr);
		charStylesArr.shift();	// delete the first '[None]'

		charStyleIdx = 0;
		if (HB_settings.charStyleName != "") {
			for (var i = 0; i < charStylesArr.length; i++) {
				if (charStylesArr[i] == HB_settings.charStyleName) {
					charStyleIdx = i;
					break;
				}
			}
		}
		},

	// keep track of selection / document changes
	app_track_change_event = Event.AFTER_SELECTION_CHANGED,	// which event to use to keep track of state changes
	app_track_change_eventName = "app_AFTER_SELECTION_CHANGED",	// human readable
	app_track_CHANGED_hdl = null,
	app_track_CHANGED = function () {
		//alert("app_track_CHANGED" + "\nHB_wrk.dlgw: " + HB_wrk.dlgw + "\nHB_isBusy: " + HB_isBusy);
		if (HB_wrk.dlgw == null) return;
		if (HB_isBusy) return;			// sorry, we are working (building hyperlinks)
		check_doc_state({eventType:app_track_change_eventName}, true);
	},
	// event listeners used only by the dialog window
	addDialogEventListeners = function() {
		var isactive = false, hdl = 'undefined', l;
		if (HB_wrk.dlgw == null) return(false);

		// check if this listener already is set (as we can not remove it)
		for (l = 0; l < app.eventListeners.length; l++) {
			//alert(list_object(app.eventListeners[l]));
			if (app.eventListeners[l].name == 'HyperLinkBuilder ' + app_track_change_eventName) {
				//alert(app_track_change_eventName + " is already active");
				isactive = true;
				break;
			}
		}
		if (!isactive) {
			app_track_CHANGED_hdl = app.addEventListener(app_track_change_event, app_track_CHANGED,false);
			if (app_track_CHANGED_hdl) app_track_CHANGED_hdl.name = "HyperLinkBuilder " + app_track_change_eventName;
			//alert("app_track_CHANGED_hdl: " + app_track_CHANGED_hdl);
			//alert(list_object(app_track_CHANGED_hdl));
		}
		return(true);

	},
	removeDialogEventListeners = function(caller) {
		var removed, l;
		if (HB_wrk.dlgw == null) return(false);
		
		try {
			removed = app.removeEventListener(app_track_change_event, app_track_CHANGED,false);
			//alert("removed: " + removed + "\n caller: " + caller);
			if (removed) app_track_CHANGED_hdl = null;
		} catch(ex) {
		}
		// all listeners should now be removed!!
		
		if (app.eventListeners.length > 0) {
			//alert("2 app.eventListeners.length: " + app.eventListeners.length);
			// check if this listener already is set (as we can not remove it)
			for (l = 0; l < app.eventListeners.length; l++) {
				if (app.eventListeners[l].eventType == app_track_change_event) {
					//alert(app_track_change_eventName + " is STILL active");
				}
			}
		}
		
		return(true);
	},

	set_mainDialogTitle = function() {
		if (HB_wrk.dlgw == null) return;
		var windowTitle = Product.applicationName + " v" + Product.versionStr + "    '" +  settingsFileName + "'    " + Product.copyRight;
		//alert(windowTitle);
		HB_wrk.dlgw.text = windowTitle;
		},

	set_dialogItems = function() {
		var i,
			iIdx = -1, borderColorSelected = 0, highlightSelected = 0, borderwidthSelected = 0, borderstyleSelected = 0;
		if (!HB_wrk.dlgw) return;
		set_mainDialogTitle();

		// may be not?    if ((HB_settings.dlgw_location !== null) && (HB_settings.dlgw_location.length == 2)) HB_wrk.dlgw.location = HB_settings.dlgw_location;

		// the characters styles pop
		HB_wrk.dlgw.row1.leftGroup.charStylesDropdown.removeAll();
		if (charStylesArr.length > 0) {
			// add items to dropdown
			for (i = 0; i < charStylesArr.length; i++) {
				HB_wrk.dlgw.row1.leftGroup.charStylesDropdown.add("item", charStylesArr[i]);
			}
		}
		//alert("styles: " + HB_wrk.dlgw.row1.leftGroup.charStylesDropdown.items + "\ncharStyleIdx: " + charStyleIdx + "\ncharStylesArr.length: " + charStylesArr.length);
		if (charStylesArr.length > 0) HB_wrk.dlgw.row1.leftGroup.charStylesDropdown.items[charStyleIdx].selected = true;

		// what to set before/after the found item
		HB_wrk.dlgw.row1.leftGroup.beforeURLTextGroup.beforeTextEdit.text = HB_settings.beforeURLText;
		HB_wrk.dlgw.row1.leftGroup.afterURLTextGroup.afterTextEdit.text = HB_settings.afterURLText;
		
		// Hyperlink appearance
		HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.hl_appearCheck.value = HB_settings.hl_appearance.visible;

		iIdx = -1;
		for (var item in UIColors) {
			iIdx++;
				//alert(HB_settings.hl_appearance.borderColor + "==" + UIColors[item] + "\n" + (HB_settings.hl_appearance.borderColor == UIColors[item]));
			if (HB_settings.hl_appearance.borderColor == UIColors[item]) { borderColorSelected = iIdx; break; }
		}

		iIdx = -1;
		for (var item in HyperlinkAppearanceHighlight) {
			iIdx++;
			if (HB_settings.hl_appearance.highlight == HyperlinkAppearanceHighlight[item]) { highlightSelected = iIdx; break; }
		}

		iIdx = -1;
		for (var item in HyperlinkAppearanceWidth) {
			iIdx++;
			if (HB_settings.hl_appearance.width == HyperlinkAppearanceWidth[item]) { borderwidthSelected = iIdx; break; }
		}

		iIdx = -1;
		for (var item in HyperlinkAppearanceStyle) {
			iIdx++;
			if (HB_settings.hl_appearance.borderStyle == HyperlinkAppearanceStyle[item]) { borderstyleSelected = iIdx; break; }
		}

		for (i = 0; i < HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearHighlightDropdown.items.length; i++) HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearHighlightDropdown.items[i].selected = false;
		HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearHighlightDropdown.items[highlightSelected].selected = true;
		
		for (i = 0; i < HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearWidthDropdown.items.length; i++) HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearWidthDropdown.items[i].selected = false;
		HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearWidthDropdown.items[borderwidthSelected].selected = true;
		
		for (i = 0; i < HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderColorDropdown.items.length; i++) HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderColorDropdown.items[i].selected = false;
		HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderColorDropdown.items[borderColorSelected].selected = true;
		
		for (i = 0; i < HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderStyleDropdown.items.length; i++) HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderStyleDropdown.items[i].selected = false;
		HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderStyleDropdown.items[borderstyleSelected].selected = true;

		// Hyperlink cleaning
		HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.noCleaning.value = (HB_settings.hyperlinksCleaning==0);
		HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.cleaningLost.value = (HB_settings.hyperlinksCleaning==1);
		HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.cleaningAll.value = (HB_settings.hyperlinksCleaning==2);

		// silent
		HB_wrk.dlgw.row2.rightGroup.silentCheck.value = (HB_settings.silent > 0 ? true : false);

		},

	set_buttonsStates = function(state) {
		if (!HB_wrk.dlgw) return;
		HB_wrk.dlgw.row1.rightGroup.btnPanel.goBtn.enabled = state;
		},

	check_doc_state_calls = 0,	// count the calls to check_doc_state
	check_doc_state = function(e, istask) {
		//alert("check_doc_state: " + e.eventType);
		var actdoc, ready2go = false;
		if (!HB_wrk.dlgw) return;
		/*
		if (!istask) {
			setTimeout(function(){check_doc_state(e,true);},200);
			return;
		}
		*/
		check_doc_state_calls++;
		try {	// must try/catch: a document could be about to closing but window is still showing
			actdoc = app.activeDocument;
		} catch(ex) {
			actdoc = null;
		};
		try {
			//var doc_chg = changed_activeDocument();
			//alert("check_doc_state doc_chg: " + doc_chg + "\nistask: " + istask);
			get_charStyles();
			if (app.documents.length == 0) {
				HB_wrk.dlgw.row1.rightGroup.message.text = loc(0);	// "No document is open."
				ready2go = false;
			}
			else if ((actdoc != null) && (actdoc.stories.length == 0)) {
					HB_wrk.dlgw.row1.rightGroup.message.text = loc(1);	// "This document does not contain any text."
					ready2go = false;
				}
				else if (charStylesArr.length<1) {
						HB_wrk.dlgw.row1.rightGroup.message.text = loc(3);	// "At least 1 character style must be defined!"
						ready2go = false;
					} else {
						HB_wrk.dlgw.row1.rightGroup.message.text = "";
						ready2go = true;
						}
			set_buttonsStates(ready2go);
			set_dialogItems();
		}
		catch(ex) {
			alert("Exception in function 'check_doc_state':\n" + ex);
			ready2go = false;
		}
		// return if is ready to build Hyperlinks
		return ready2go;
		},

	mainDialog = function () {
		var go = 0,
			myRange,
			beforeTextEdit,
			afterTextEdit,
			editSize = [],
			labelSize = [],
			subtitleSize = [],
			popSize = [],
			popSize2 = [],
			editWidth = 350,
			ddWidth = 270,
			windowFont, font, fontTitle, fontSubtitle, fontHelp, bluepen,

			cleanUpDialog = function() {
				removeDialogEventListeners("cleanUpDialog");
				app.cancelAllTasks();
				//alert("cleanUpDialog DONE");
			},
			close_dlgw = function () {
				HB_wrk.dlgw.onClose = null;	// make sure to remove us because we are called multiple times when dialog is closing
				cleanUpDialog();
				go = false;
				HB_wrk.dlgw.close(0);
				HB_wrk.isopen = false;

				// and store current settings
				store_settings();
			};

		if (HB_wrk.isopen == true) {
			HB_wrk.dlgw.show();
			return;
		}

		get_charStyles();

		HB_wrk.dlgw = new Window('palette', "", undefined, {resizeable:false, closeButton: true, maximizeButton:false, minimizeButton:false});
		set_mainDialogTitle();

		windowFont = HB_wrk.dlgw.graphics.font;
		font = ScriptUI.newFont ( windowFont.name, windowFont.name.style, 11 );
		fontTitle = ScriptUI.newFont ( windowFont.name, windowFont.name.style, 14 );
		fontSubtitle = ScriptUI.newFont ( windowFont.name, windowFont.name.style, 13 );
		fontHelp = ScriptUI.newFont ( windowFont.name, 'BOLD', 18 );
		bluepen = HB_wrk.dlgw.graphics.newPen (HB_wrk.dlgw.graphics.PenType.SOLID_COLOR, [0,0,1,1], 1);
		subtitleSize = [65,1.8*font.size];
		popSize = [100,1.8*font.size];
		popSize2 = [200,1.8*font.size];
		labelSize = [55,1.8*font.size];
		editSize = [350,1.8*font.size];

		HB_wrk.dlgw.orientation = 'column';
		HB_wrk.dlgw.margins = [15,15,15,15];
		HB_wrk.dlgw.alignChildren = ['left','top'];
		HB_wrk.dlgw.alignment = ['left','top'];
		HB_wrk.dlgw.graphics.font = font;

		if ((HB_settings.dlgw_location !== null) && (HB_settings.dlgw_location.length == 2)) HB_wrk.dlgw.location = HB_settings.dlgw_location;

		//------------------------------
		// first window row
		HB_wrk.dlgw.row1 = HB_wrk.dlgw.add('group');
			HB_wrk.dlgw.row1.orientation = 'row';
			HB_wrk.dlgw.row1.alignment = ['left','top'];
			HB_wrk.dlgw.row1.alignChildren = ['left','top'];

			//------------------------------
			// items on left side
			HB_wrk.dlgw.row1.leftGroup = HB_wrk.dlgw.row1.add('group');
				HB_wrk.dlgw.row1.leftGroup.orientation = 'column';
				HB_wrk.dlgw.row1.leftGroup.alignment = ['left','top'];
				HB_wrk.dlgw.row1.leftGroup.alignChildren = ['left','top'];
				HB_wrk.dlgw.row1.leftGroup.spacing = 5;
				//HB_wrk.dlgw.row1.leftGroup.size = {width:420, height:325};

			//	var spacer0 = HB_wrk.dlgw.row1.leftGroup.add('statictext', undefined, ""); spacer0.size = [10,15];	// spacer

				HB_wrk.dlgw.row1.leftGroup.stylesTitle = HB_wrk.dlgw.row1.leftGroup.add('statictext', undefined, loc(2));
					HB_wrk.dlgw.row1.leftGroup.stylesTitle.graphics.font = fontSubtitle;
				HB_wrk.dlgw.row1.leftGroup.stylesTitle = HB_wrk.dlgw.row1.leftGroup.add('statictext', undefined, loc(12));
					HB_wrk.dlgw.row1.leftGroup.stylesTitle.graphics.font = font;

				HB_wrk.dlgw.row1.leftGroup.charStylesDropdown = HB_wrk.dlgw.row1.leftGroup.add('dropdownlist', undefined, '', {items:charStylesArr});	// char styles list
					if (charStylesArr.length > 0) HB_wrk.dlgw.row1.leftGroup.charStylesDropdown.items[charStyleIdx].selected = true;
					HB_wrk.dlgw.row1.leftGroup.charStylesDropdown.graphics.font = font;
					HB_wrk.dlgw.row1.leftGroup.charStylesDropdown.size = popSize2;

				var spacer1 = HB_wrk.dlgw.row1.leftGroup.add('statictext', undefined, ""); spacer1.size = [10,15];	// spacer

				HB_wrk.dlgw.row1.leftGroup.beforeURLTextLabel = HB_wrk.dlgw.row1.leftGroup.add('statictext', undefined, loc(4));
					HB_wrk.dlgw.row1.leftGroup.beforeURLTextLabel.graphics.font = font;


				HB_wrk.dlgw.row1.leftGroup.beforeURLTextGroup = HB_wrk.dlgw.row1.leftGroup.add('group', undefined);
					HB_wrk.dlgw.row1.leftGroup.beforeURLTextGroup.orientation = "row";

					HB_wrk.dlgw.row1.leftGroup.beforeURLTextGroup.beforeURLTextLabel = HB_wrk.dlgw.row1.leftGroup.beforeURLTextGroup.add('statictext', undefined, loc(5));
						HB_wrk.dlgw.row1.leftGroup.beforeURLTextGroup.beforeURLTextLabel.graphics.font = font;
						HB_wrk.dlgw.row1.leftGroup.beforeURLTextGroup.beforeURLTextLabel.size = labelSize;

					HB_wrk.dlgw.row1.leftGroup.beforeURLTextGroup.beforeTextEdit = HB_wrk.dlgw.row1.leftGroup.beforeURLTextGroup.add('edittext', undefined, HB_settings.beforeURLText);
						HB_wrk.dlgw.row1.leftGroup.beforeURLTextGroup.beforeTextEdit.graphics.font = font;
						HB_wrk.dlgw.row1.leftGroup.beforeURLTextGroup.beforeTextEdit.size = editSize;
						HB_wrk.dlgw.row1.leftGroup.beforeURLTextGroup.beforeTextEdit.helpTip = loc(6);	// The URL part to add BEFORE the found text

				HB_wrk.dlgw.row1.leftGroup.foundTextLabel = HB_wrk.dlgw.row1.leftGroup.add('statictext', undefined, loc(7));
					HB_wrk.dlgw.row1.leftGroup.foundTextLabel.graphics.font = font;
					HB_wrk.dlgw.row1.leftGroup.foundTextLabel.size = [150,20];


				HB_wrk.dlgw.row1.leftGroup.afterURLTextGroup = HB_wrk.dlgw.row1.leftGroup.add('group', undefined);
					HB_wrk.dlgw.row1.leftGroup.afterURLTextGroup.orientation = "row";

					HB_wrk.dlgw.row1.leftGroup.afterURLTextGroup.afterURLTextLabel = HB_wrk.dlgw.row1.leftGroup.afterURLTextGroup.add('statictext', undefined, loc(8));
						HB_wrk.dlgw.row1.leftGroup.afterURLTextGroup.afterURLTextLabel.graphics.font = font;
						HB_wrk.dlgw.row1.leftGroup.afterURLTextGroup.afterURLTextLabel.size = labelSize;

					HB_wrk.dlgw.row1.leftGroup.afterURLTextGroup.afterTextEdit = HB_wrk.dlgw.row1.leftGroup.afterURLTextGroup.add('edittext', undefined, HB_settings.afterURLText);
						HB_wrk.dlgw.row1.leftGroup.afterURLTextGroup.afterTextEdit.graphics.font = font;
						HB_wrk.dlgw.row1.leftGroup.afterURLTextGroup.afterTextEdit.size = editSize;
						HB_wrk.dlgw.row1.leftGroup.afterURLTextGroup.afterTextEdit.helpTip = loc(9);	// The URL part to add AFTER the found text



				//------------------------------
				// Hyperlink appearance Group
				var spacer2 = HB_wrk.dlgw.row1.leftGroup.add('statictext', undefined, ""); spacer2.size = [10,10];	// spacer
				var uicolors = [], highlight = [], borderwidth = [], borderstyle = [], borderColorSelected = 0, highlightSelected = 0, borderwidthSelected = 0, borderstyleSelected = 0, iIdx = -1;
				for (var item in UIColors) {
					iIdx++;
					//alert(HB_settings.hl_appearance.borderColor + "==" + UIColors[item]);
					if (HB_settings.hl_appearance.borderColor == UIColors[item]) borderColorSelected = iIdx;
					uicolors[uicolors.length] = item.replace("_"," ").toLowerCase();
				}

				iIdx = -1;
				for (var item in HyperlinkAppearanceHighlight) {
					iIdx++;
					if (HB_settings.hl_appearance.highlight == HyperlinkAppearanceHighlight[item]) highlightSelected = iIdx;
					highlight[highlight.length] = item;
				}

				iIdx = -1;
				for (var item in HyperlinkAppearanceWidth) {
					iIdx++;
					if (HB_settings.hl_appearance.width == HyperlinkAppearanceWidth[item]) borderwidthSelected = iIdx;
					borderwidth[borderwidth.length] = item;
				}

				iIdx = -1;
				for (var item in HyperlinkAppearanceStyle) {
					iIdx++;
					if (HB_settings.hl_appearance.borderStyle == HyperlinkAppearanceStyle[item]) borderstyleSelected = iIdx;
					borderstyle[borderstyle.length] = item;
				}
				/*
				alert(uicolors);
				alert(highlight);
				alert(borderwidth);
				alert(borderstyle);
				*/

				HB_wrk.dlgw.row1.leftGroup.hl_appearGroup = HB_wrk.dlgw.row1.leftGroup.add('group', undefined);
					HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.orientation = "column";
					HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.alignment = ['left','top'];
					HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.alignChildren = ['left','top'];

					HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.hl_appearTitle = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.add('statictext', undefined, loc(70));
						HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.hl_appearTitle.graphics.font = fontSubtitle;

					HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.hl_appearCheck = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.add("checkbox", undefined, loc(71));
						HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.hl_appearCheck.value = HB_settings.hl_appearance.visible;
						HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.hl_appearCheck.graphics.font = font;
						HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.hl_appearCheck.helpTip = loc(72);	// make visible link

					// highlight and width group
					HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.add('group', undefined);
						HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.orientation = "row";

						// highlight
						HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.highlightLable = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.add('statictext', undefined, loc(73));
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.highlightLable.graphics.font = font;
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.highlightLable.size = subtitleSize;

						HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearHighlightDropdown = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.add('dropdownlist', undefined, '', {items:highlight});	// highlight list
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearHighlightDropdown.items[highlightSelected].selected = true;
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearHighlightDropdown.graphics.font = font;
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearHighlightDropdown.size = popSize;
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearHighlightDropdown.helpTip = loc(74);	// Highlight on mouse over

						var spacerh1 = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.add('statictext', undefined, ""); spacerh1.size = [30,5];	// spacer

						// width
						HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.widthLable = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.add('statictext', undefined, loc(77));
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.widthLable.graphics.font = font;
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.widthLable.size = subtitleSize;

						HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearWidthDropdown = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.add('dropdownlist', undefined, '', {items:borderwidth});	// highlight list
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearWidthDropdown.items[borderwidthSelected].selected = true;
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearWidthDropdown.graphics.font = font;
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearWidthDropdown.size = popSize;
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearWidthDropdown.helpTip = loc(78);	// Border width

					// borderColor and style group
					HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.add('group', undefined);
						HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.orientation = "row";

						// border color
						HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.borderColorLable = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.add('statictext', undefined, loc(75));
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.borderColorLable.graphics.font = font;
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.borderColorLable.size = subtitleSize;

						HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderColorDropdown = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.add('dropdownlist', undefined, '', {items:uicolors});	// color list
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderColorDropdown.items[borderColorSelected].selected = true;
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderColorDropdown.graphics.font = font;
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderColorDropdown.size = popSize;
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderColorDropdown.helpTip = loc(76);	// border color

						var spacerh2 = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.add('statictext', undefined, ""); spacerh2.size = [30,5];	// spacer

						// border style
						HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.borderStyleLable = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.add('statictext', undefined, loc(79));
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.borderStyleLable.graphics.font = font;
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.borderStyleLable.size = subtitleSize;

						HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderStyleDropdown = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.add('dropdownlist', undefined, '', {items:borderstyle});	// border style
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderStyleDropdown.items[borderstyleSelected].selected = true;
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderStyleDropdown.graphics.font = font;
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderStyleDropdown.size = popSize;
							HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderStyleDropdown.helpTip = loc(80);	// border style

				var spacer2a = HB_wrk.dlgw.row1.leftGroup.add('statictext', undefined, ""); spacer2a.size = [10,10];	// spacer

			//------------------------------
			// and the buttons on right side
			HB_wrk.dlgw.row1.rightGroup = HB_wrk.dlgw.row1.add('group');
				HB_wrk.dlgw.row1.rightGroup.orientation = 'column';
				HB_wrk.dlgw.row1.rightGroup.alignChildren = ['fill','top'];
				HB_wrk.dlgw.row1.rightGroup.alignment = ['fill','top'];

				HB_wrk.dlgw.row1.rightGroup.btnPanel = HB_wrk.dlgw.row1.rightGroup.add('panel', undefined, '');
					HB_wrk.dlgw.row1.rightGroup.btnPanel.goBtn = HB_wrk.dlgw.row1.rightGroup.btnPanel.add('button', undefined, loc(21), {name:'go'});
					HB_wrk.dlgw.row1.rightGroup.btnPanel.goBtn.helpTip = loc(22);	// Start hyperlinks replacement
					HB_wrk.dlgw.row1.rightGroup.btnPanel.cancelBtn = HB_wrk.dlgw.row1.rightGroup.btnPanel.add('button', undefined, loc(23), {name:'cancel'});
					HB_wrk.dlgw.row1.rightGroup.btnPanel.cancelBtn.helpTip = loc(24);	// Cancel

					var spacer3 = HB_wrk.dlgw.row1.rightGroup.btnPanel.add('statictext', undefined, ""); spacer3.size = [10,25];	// spacer

					HB_wrk.dlgw.row1.rightGroup.btnPanel.loadSettingsFromFileBtn = HB_wrk.dlgw.row1.rightGroup.btnPanel.add('button', undefined, loc(27));
					HB_wrk.dlgw.row1.rightGroup.btnPanel.loadSettingsFromFileBtn.helpTip = loc(28);	// Load new settings from settings file
					HB_wrk.dlgw.row1.rightGroup.btnPanel.saveSettingsToFileBtn = HB_wrk.dlgw.row1.rightGroup.btnPanel.add('button', undefined, loc(25));
					HB_wrk.dlgw.row1.rightGroup.btnPanel.saveSettingsToFileBtn.helpTip = loc(26);	// Save settings to file

				//HB_wrk.dlgw.row1.rightGroup.helpButton = HB_wrk.dlgw.row1.rightGroup.add('statictext', undefined, " ? ");
				HB_wrk.dlgw.row1.rightGroup.helpButton = HB_wrk.dlgw.row1.rightGroup.add('button', undefined, "?", {name:'Help'});
					HB_wrk.dlgw.row1.rightGroup.helpButton.size = [30,30];	// help button
					HB_wrk.dlgw.row1.rightGroup.helpButton.alignment = ['right','top'];
					HB_wrk.dlgw.row1.rightGroup.helpButton.helpTip = "Show Manual";	// Show Manual

				HB_wrk.dlgw.row1.rightGroup.message = HB_wrk.dlgw.row1.rightGroup.add('edittext', undefined, "", {multiline:true});
					HB_wrk.dlgw.row1.rightGroup.message.graphics.font = font;
					HB_wrk.dlgw.row1.rightGroup.message.size = [200,80];
					HB_wrk.dlgw.row1.rightGroup.message.maximumSize = [250,100];


		//------------------------------
		// 2nd window row
		HB_wrk.dlgw.row2 = HB_wrk.dlgw.add('group');
			HB_wrk.dlgw.row2.orientation = 'row';
			HB_wrk.dlgw.row2.alignment = ['left','top'];
			HB_wrk.dlgw.row2.alignChildren = ['left','top'];

			//------------------------------
			// cleaning options
			HB_wrk.dlgw.row2.leftGroup = HB_wrk.dlgw.row2.add('group');
				HB_wrk.dlgw.row2.leftGroup.orientation = 'column';
				HB_wrk.dlgw.row2.leftGroup.alignment = ['left','top'];
				HB_wrk.dlgw.row2.leftGroup.alignChildren = ['left','top'];
				HB_wrk.dlgw.row2.leftGroup.spacing = 0;
			//	var spacer10 = HB_wrk.dlgw.row2.leftGroup.add('statictext', undefined, ""); spacer10.size = [10,15];	// spacer

				HB_wrk.dlgw.row2.leftGroup.cleaningPanel = HB_wrk.dlgw.row2.leftGroup.add('panel', undefined, '');
					HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningTitle = HB_wrk.dlgw.row2.leftGroup.cleaningPanel.add('statictext', undefined, loc(30));	// Hyperlinks Cleaning
						HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningTitle.alignment = ['left','top'];
						HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningTitle.graphics.font = fontTitle;

					HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup = HB_wrk.dlgw.row2.leftGroup.cleaningPanel.add('group', undefined);
						HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.orientation = "row";
						HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.alignment = ['left','top'];
						HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.alignChildren = ['left','top'];

						// left cleaning column
						HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol = HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.add('group', undefined);
							HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.orientation = "column";
							HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.alignment = ['left','top'];
							HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.alignChildren = ['left','top'];
							HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.size = {width:237, height:80};

								HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.noCleaning = HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.add('radiobutton', undefined, loc(33));	// no link cleaning at all
									HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.noCleaning.indent = 20;
									HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.noCleaning.graphics.font = font;
									HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.noCleaning.value = (HB_settings.hyperlinksCleaning==0);
									HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.noCleaning.helpTip = loc(34);	// no link cleaning at all

								HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.cleaningLost = HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.add('radiobutton', undefined, loc(35));	// Delete LOST Hyperlinbks
									HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.cleaningLost.indent = 20;
									HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.cleaningLost.graphics.font = font;
									HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.cleaningLost.value = (HB_settings.hyperlinksCleaning==1);
									HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.cleaningLost.helpTip = loc(36);	// Delete all unreferenced (lost) Hyperlinks

								HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.cleaningAll = HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.add('radiobutton', undefined, loc(37));	// Delete ALL
									HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.cleaningAll.indent = 20;
									HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.cleaningAll.graphics.font = font;
									HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.cleaningAll.value = (HB_settings.hyperlinksCleaning==2);
									HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.cleaningAll.helpTip = loc(38);	// Delete all Hyperlinks

						// right cleaning column
						HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.rightCol = HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.add('group', undefined);
							HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.rightCol.orientation = "column";
							HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.rightCol.alignment = ['left','top'];
							HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.rightCol.alignChildren = ['left','top'];

							var spacer20 = HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.rightCol.add('statictext', undefined, ""); spacer20.size = [10,10];	// spacer

							HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.rightCol.removeHyperLinksBtn = HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.rightCol.add('button', undefined, loc(31), {name:'Remove Hyperlinks'});
							HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.rightCol.removeHyperLinksBtn.helpTip = loc(32);	// Clean or delete all Hyperlinks


			//------------------------------
			// general options
			HB_wrk.dlgw.row2.rightGroup = HB_wrk.dlgw.row2.add('group');
				HB_wrk.dlgw.row2.rightGroup.orientation = 'column';
				HB_wrk.dlgw.row2.rightGroup.alignment = ['left','top'];
				HB_wrk.dlgw.row2.rightGroup.alignChildren = ['left','top'];
				HB_wrk.dlgw.row2.rightGroup.spacing = 5;
				var spacer20 = HB_wrk.dlgw.row2.rightGroup.add('statictext', undefined, ""); spacer20.size = [10,15];	// spacer

				HB_wrk.dlgw.row2.rightGroup.optionsTitle = HB_wrk.dlgw.row2.rightGroup.add('statictext', undefined, loc(60));	// general options
					HB_wrk.dlgw.row2.rightGroup.optionsTitle.alignment = ['left','top'];
					HB_wrk.dlgw.row2.rightGroup.optionsTitle.graphics.font = fontTitle;

					HB_wrk.dlgw.row2.rightGroup.silentCheck = HB_wrk.dlgw.row2.rightGroup.add("checkbox", undefined, loc(61));
						HB_wrk.dlgw.row2.rightGroup.silentCheck.value = (HB_settings.silent > 0 ? true : false);
						HB_wrk.dlgw.row2.rightGroup.silentCheck.graphics.font = font;
						HB_wrk.dlgw.row2.rightGroup.silentCheck.helpTip = loc(62);	// Don't show messages


			// ad licensing button
			if (typeof(Licensing) != 'undefined') {
			HB_wrk.dlgw.row4 = HB_wrk.dlgw.add('group');
				HB_wrk.dlgw.row4.orientation = 'row';
				HB_wrk.dlgw.row4.alignment = ['right','top'];

					HB_wrk.dlgw.row4.rightGroup = HB_wrk.dlgw.row4.add('group');
						HB_wrk.dlgw.row4.rightGroup.orientation = 'column';
						HB_wrk.dlgw.row4.rightGroup.alignment = ['right','top'];
						HB_wrk.dlgw.row4.rightGroup.alignChildren = ['right','top'];
						HB_wrk.dlgw.row4.rightGroup.spacing = 15;
						HB_wrk.dlgw.row4.margins = [7,7,37,7];
			}


		/*
			The dialog item handlers
		*/
		// Go button
		HB_wrk.dlgw.row1.rightGroup.btnPanel.goBtn.onClick = function() {
			getDialogSettings();
			if (HB_settings.silent < 1) {
				HB_wrk.dlgw.row1.rightGroup.message.text = loc(13);	// "Setting Hyperlinks.\nPlease wait..."
			}
			//createHyperlinks();
			setTimeout(function(){createHyperlinks();},1);
		}; 
			
		// Cancel button
		HB_wrk.dlgw.row1.rightGroup.btnPanel.cancelBtn.onClick = close_dlgw;
		HB_wrk.dlgw.onClose = close_dlgw;	// onClose is called multiple times!!!!!

		// Clean Hyperlinks button
		HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.rightCol.removeHyperLinksBtn.onClick = function() {
			getDialogSettings();
			if (HB_settings.silent < 1) {
				HB_wrk.dlgw.row1.rightGroup.message.text = loc(42);	// "Cleaning Hyperlinks.\nPlease wait..."
			}
			//removeHyperlinks(HB_settings.hyperlinksCleaning,HB_settings.silent);
			setTimeout(function(){removeHyperlinks(HB_settings.hyperlinksCleaning,HB_settings.silent);},1);
		}; 

		// Help button
		HB_wrk.dlgw.row1.rightGroup.helpButton.onClick = function (e) {
														var helpfilename = getScriptsPath() + folderSeparator + "Manual.jsx",
															helpfile = new File(helpfilename);
														try { app.doScript(helpfile,ScriptLanguage.javascript); }
														catch(ex) { /*alert(ex);*/ }
													};

		HB_wrk.dlgw.row1.rightGroup.btnPanel.loadSettingsFromFileBtn.onClick = function() {
			var f = new Folder(settingsFilePath);
			var selected = f.openDlg(loc(251));
			if (selected != null) {
				var fnew = new Folder(selected);
				settingsFilePath = fnew.path;
				settingsFileName = fnew.name;
				//alert("selected: " + selected + "\nfullpath: " + fnew.fsName + "\npath: " + fnew.path + "\nname: " + fnew.name);
				var loaded = loadSettingsFromFile();
				//alert("loaded: " + loaded);
				//close/reopen dialog
				if (HB_wrk.dlgw) {
					get_charStyles();
					set_dialogItems();
				}
			}
		};
		HB_wrk.dlgw.row1.rightGroup.btnPanel.saveSettingsToFileBtn.onClick = function() {
			var savepath = settingsFilePath;
			if (endsWith(savepath,folderSeparator) == false) savepath += folderSeparator;
			savepath += settingsFileName;
			//alert("savepath: " + savepath);
			canWriteInFolder(savepath, true);	// make sure settings folder exists
			var f = new File(savepath);
			var selected = f.saveDlg(loc(50));
			if (selected != null) {
				settingsFilePath = selected.path;
				settingsFileName = selected.name;
				settingsloaded = 0;
				if (endsWith(settingsFileName.toLowerCase(),".set") == false) settingsFileName += ".set";
				//alert("savepath: " + savepath + "\nselected: " + selected + "\nsettingsFilePath: " + settingsFilePath + "\nsettingsFileName: " + settingsFileName);
				getDialogSettings();
				saveSettingsToFile();
				setWindowTitle();
			}
		};
		function setCleaningButton() {
			getDialogSettings();
			if (HB_settings.hyperlinksCleaning == 0) HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.rightCol.removeHyperLinksBtn.enabled = false;
			else HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.rightCol.removeHyperLinksBtn.enabled = true;
		};
		HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.noCleaning.onClick = setCleaningButton;
		HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.cleaningLost.onClick = setCleaningButton;
		HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.cleaningAll.onClick = setCleaningButton;


		function getDialogSettings() {
				HB_settings.charStyleName = HB_wrk.dlgw.row1.leftGroup.charStylesDropdown.selection.text;
				//alert(HB_settings.charStyleName);
				HB_settings.beforeURLText = HB_wrk.dlgw.row1.leftGroup.beforeURLTextGroup.beforeTextEdit.text;
				HB_settings.afterURLText = HB_wrk.dlgw.row1.leftGroup.afterURLTextGroup.afterTextEdit.text;

				HB_settings.silent = HB_wrk.dlgw.row2.rightGroup.silentCheck.value == true ? 1 : 0;

				if (HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.noCleaning.value == true) {	// no cleaning
					HB_settings.hyperlinksCleaning = 0;
				}
				else if (HB_wrk.dlgw.row2.leftGroup.cleaningPanel.cleaningGroup.leftCol.cleaningLost.value == true) {	// clean LOST
					HB_settings.hyperlinksCleaning = 1;
				}
				else {												// remove all
					HB_settings.hyperlinksCleaning = 2;
				}

				HB_settings.hl_appearance.visible = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.hl_appearCheck.value;
				HB_settings.hl_appearance.highlight = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearHighlightDropdown.selection.text.toUpperCase();
				HB_settings.hl_appearance.width = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.highlightGroup.hl_appearWidthDropdown.selection.text.toUpperCase();
				HB_settings.hl_appearance.borderColor = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderColorDropdown.selection.text.toUpperCase().replace(" ","_");
				HB_settings.hl_appearance.borderStyle = HB_wrk.dlgw.row1.leftGroup.hl_appearGroup.borderColorGroup.hl_appearBorderStyleDropdown.selection.text.toUpperCase();
		};


		// keep track of window position changes
		HB_wrk.dlgw.onMove = function(e) {
			HB_settings.dlgw_location = HB_wrk.dlgw.location;
			//alert(HB_wrk.dlgw_location);
		};


		// add dialog event listeners
		addDialogEventListeners();

		go = HB_wrk.dlgw.show();	// a palette immediately exits and stays open, returns 0
		//alert("go: " + go);	// always returns 0
		HB_wrk.isopen = true;

		check_doc_state({eventType:"dlgw.AFTER_PALETTE_OPEN"});

		return(go);
	},

	createHyperlinks = function () {
		var curDoc = app.activeDocument,
			charStyleName = HB_settings.charStyleName,
			URLaddress,
			source,
			url,
			hyperlink,
			linkadded,
			hyperlinklabel,
			old_changeTextPreferences = app.changeTextPreferences.properties,
			old_findTextPreferences = app.findTextPreferences.properties,
			old_findChangeTextOptions = app.findChangeTextOptions.properties;

		HB_isBusy = true;

		// cleaning first?
		if (HB_settings.hyperlinksCleaning != 0) removeHyperlinks(HB_settings.hyperlinksCleaning,true);


		app.changeTextPreferences = NothingEnum.nothing;
		app.findTextPreferences = NothingEnum.nothing;
		app.findChangeTextOptions.properties = {includeMasterPages:true, includeFootnotes:true, includeHiddenLayers:true, wholeWord:false};

		if (charStyleName == "") charStyleName = app.activeDocument.characterStyles.item(1).name;
		app.findTextPreferences.properties = {appliedCharacterStyle:charStyleName};

		foundTexts = curDoc.findText(false);
		totalFOUNDlinks = foundTexts.length;
		totalCONVERTEDlinks = 0;

		for (i = foundTexts.length - 1; i >= 0; i--) {
			linkadded = true;

			try {
				source = curDoc.hyperlinkTextSources.add(foundTexts[i]);
			}
			catch (e) {
				linkadded = false;
				//alert("skipped found styled item: '" + foundTexts[i].contents + "'");
			}
			if (linkadded) {
				URLaddress = foundTexts[i].contents;
				// clean found style text
				URLaddress = URLaddress.replace(/\ufeff/gi,"");	// some illegal unicode
				URLaddress = URLaddress.replace(/[\r\n]/gi,"");	// CR and LF
				URLaddress = URLaddress.replace(/[\u2029\u2028]/gi,"");	// hard paragraph and soft line break
				URLaddress = URLaddress.replace(/^ /gi,"");	// remove leading spaces

				if (HB_settings.beforeURLText != "") {
					do {
						if ( (URLaddress.toLowerCase().indexOf("http://") == 0)
							|| (URLaddress.toLowerCase().indexOf("https://") == 0) ) break;	// already fully qualified URL - add nothing
						if ( (URLaddress.toLowerCase().indexOf("mailto:") == 0) ) break;	// already fully qualified mail address - add nothing
						URLaddress = HB_settings.beforeURLText + URLaddress;
					} while(false);
				}
				if (HB_settings.afterURLText != "") {
					URLaddress += HB_settings.afterURLText;
				}

				try {
					url = curDoc.hyperlinkURLDestinations.add(URLaddress); 
					hyperlink = curDoc.hyperlinks.add(source, url); 
				}
				catch (ex) { continue; }

				++totalCONVERTEDlinks;
				hyperlinklabel = foundTexts[i].contents;
				hyperlinklabel = hyperlinklabel.replace(/\ufeff/gi,"");	// some illegal unicode
				hyperlinklabel = hyperlinklabel.replace(/[\r\n]/gi,"");	// CR and LF
				hyperlinklabel = hyperlinklabel.replace(/[\u2029\u2028]/gi,"");	// hard paragraph and soft line break
				hyperlinklabel = hyperlinklabel.replace(/^ /gi,"");	// remove leading spaces
				if (hyperlinklabel.length > 60) hyperlinklabel = hyperlinklabel.substr(0,60);
				with (hyperlink) { 
					//alert(destination);
					visible = HB_settings.hl_appearance.visible;			// true or false
					highlight = HyperlinkAppearanceHighlight[HB_settings.hl_appearance.highlight];	// like HyperlinkAppearanceHighlight.NONE, HyperlinkAppearanceHighlight.INVERT, HyperlinkAppearanceHighlight.OUTLINE, HyperlinkAppearanceHighlight.INSET
					borderColor = UIColors[HB_settings.hl_appearance.borderColor];					// like UIColors.RED
					borderStyle = HyperlinkAppearanceStyle[HB_settings.hl_appearance.borderStyle];	// like HyperlinkAppearanceStyle.SOLID, HyperlinkAppearanceStyle.DASHED
					width = HyperlinkAppearanceWidth[HB_settings.hl_appearance.width];				// like HyperlinkAppearanceWidth.THIN, HyperlinkAppearanceWidth.MEDIUM, HyperlinkAppearanceWidth.THICK
					name = hyperlinklabel + " :" + id;
				}
			}
		}

		if (HB_settings.silent == 0) {
			if (totalCONVERTEDlinks == 0) HB_wrk.dlgw.row1.rightGroup.message.text = loc(10);	// "No styled items found to be converted to hyperlinks!"
			else HB_wrk.dlgw.row1.rightGroup.message.text = loc(11,totalCONVERTEDlinks);		// "X styled items converted to hyperlinks."
		}

		app.changeTextPreferences.properties = old_changeTextPreferences;
		app.findTextPreferences.properties = old_findTextPreferences;
		app.findChangeTextOptions.properties = old_findChangeTextOptions;

		HB_isBusy = false;

		return;
	},


	removeHyperlinks = function (what, silent) {
		var writeDEBUGfile = false,
			curDoc = app.activeDocument,
			hyperlinks = curDoc.hyperlinks.length,
			hyperlinkTextSources = curDoc.hyperlinkTextSources.length,
			hyperlinkURLDestinations = curDoc.hyperlinkURLDestinations.length,
			sources,
			valid_hyperlinkURLDestinations = [],
			all_hyperlinkURLDestinations = [],
			lost_hyperlinkURLDestinations = 0,
			i;

		if (what == 0) return	//no cleaning

		HB_isBusy = true;

		if (what == 1) {	// clean destinations only
			// find lost hyperlinkURLDestinations
			if (hyperlinks > 0) {
				var hyperlinks = curDoc.hyperlinks;
				for (i = 0; i < hyperlinks.length; i++) {
					if (!hyperlinks[i].destination) {	// undefined destination
						//TEST ONLY: valid_hyperlinkURLDestinations.push("null");
					}
					else valid_hyperlinkURLDestinations.push(hyperlinks[i].destination.id);
				}
			}
			if (writeDEBUGfile) writeFile ("~/valid_hyperlinkURLDestinations.txt", "valid_hyperlinkURLDestinations #"+valid_hyperlinkURLDestinations.length+":\n" + valid_hyperlinkURLDestinations);

			if (hyperlinkURLDestinations > 0) {
				var destinations = curDoc.hyperlinkURLDestinations;
				for (i = 0; i < destinations.length; i++) {
					all_hyperlinkURLDestinations.push(destinations[i].id);
				}
			}
			if (writeDEBUGfile) writeFile ("~/all_hyperlinkURLDestinations.txt", "all_hyperlinkURLDestinations #"+all_hyperlinkURLDestinations.length+":\n" + all_hyperlinkURLDestinations);

			// count and delete lost hyperlinkURLDestinations
			for (i = 0; i < all_hyperlinkURLDestinations.length; i++) {
				var destID = all_hyperlinkURLDestinations[i];
				if (valid_hyperlinkURLDestinations.indexOf(destID) < 0) {
					lost_hyperlinkURLDestinations++;
					curDoc.hyperlinkURLDestinations.itemByID(destID).remove();
				}
			}
			if (silent < 1) HB_wrk.dlgw.row1.rightGroup.message.text = loc(39,lost_hyperlinkURLDestinations);	//	lost_hyperlinkURLDestinations + " lost URL destinations deleted"
			HB_isBusy = false;
			return;
		}

		// delete all hyperlinks
		if (hyperlinks > 0) {
			//sources = curDoc.hyperlinks.everyItem().source;
			//alert("hyperlinks to remove:" + sources.length);
			curDoc.hyperlinks.everyItem().remove();
		}
		if (hyperlinkTextSources > 0){
			//alert("hyperlinkTextSources:" + hyperlinkTextSources);
			curDoc.hyperlinkTextSources.everyItem().remove();
		}
	
		if (hyperlinkURLDestinations > 0){
			//alert("hyperlinkURLDestinations:" + hyperlinkURLDestinations);
			curDoc.hyperlinkURLDestinations.everyItem().remove();
		}


		if (silent < 1) {
			if (hyperlinks == 0) {
				HB_wrk.dlgw.row1.rightGroup.message.text = loc(40);	// "No Hyperlinks deleted"
			}
			else {
				HB_wrk.dlgw.row1.rightGroup.message.text = loc(41, hyperlinks, hyperlinkTextSources, hyperlinkURLDestinations);	// "Done. " + num hyperlinks + " links deleted"
			}
		}
		HB_isBusy = false;
		return;
	},

	err = function (e){
		alert(e);
		exit();
	},

	// ERROR codes
	error = {
		text:"",
		lastcode:0,
		NOERR:0,
		WRONG_INDD_VERSION:-1,
		NO_OPEN_DOC:-3,
		UNSAVED_DOC:-5,
		OPENENIG_DOC_FAILURE:-11,
		FOLDER_CREATE:-50,
		FILE_CREATE:-51,
	},

	/**************************
	 * get language code
	 */
	lg = new Array(),		// the array holding all menu and message strings
	appLanguageCode = "en",	// default to english

	getAppLanguageCode = function (locale) {
		if ((locale == null) || (locale == "")) return("en");
		switch (locale) {	// all InDesign locales
			case Locale.ARABIC_LOCALE: return("ar");					// Arabic						1279476082 = 'LCAr'
			case Locale.CZECH_LOCALE: return("cz");						// Czech						1279476602 = 'LCCz'
			case Locale.DANISH_LOCALE: return("dn");					// Danish						1279476846 = 'LCDn'
			case Locale.ENGLISH_LOCALE: return("en");					// English						1279477102 = 'LCEn'
			case Locale.FINNISH_LOCALE: return("fn");					// Finnish						1279477358 = 'LCFn'
			case Locale.FRENCH_LOCALE: return("fr");					// French						1279477362 = 'LCFr'
			case Locale.GERMAN_LOCALE: return("de");					// German						1279477613 = 'LCGm'
			case Locale.GREEK_LOCALE: return("gr");						// Greek						1279477618 = 'LCGr'
			case Locale.HEBREW_LOCALE: return("hb");					// Hebrew						1279477858 = 'LCHb'
			case Locale.HUNGARIAN_LOCALE: return("hu");					// Hungarian					1279477877 = 'LCHu'
			case Locale.INTERNATIONAL_ENGLISH_LOCALE: return("en");		// International English		1279477097 = 'LCEi'
			case Locale.ITALIAN_LOCALE: return("it");					// Italian						1279478132 = 'LCIt'
			case Locale.JAPANESE_LOCALE: return("jp");					// Japanese						1279478384 = 'LCJp'
			case Locale.KOREAN_LOCALE: return("ko");					// en_KoreanLocale				1279478639 = 'LCKo'
			case Locale.POLISH_LOCALE: return("pl");					// Polish						1279479916 = 'LCPl'
			case Locale.PORTUGUESE_LOCALE: return("pg");				// Portuguese					1279479911 = 'LCPg'
			case Locale.ROMANIAN_LOCALE: return("ro");					// Romanian						1279480431 = 'LCRo'
			case Locale.RUSSIAN_LOCALE: return("ru");					// Russian						1279480437 = 'LCRu'
			case Locale.SIMPLIFIED_CHINESE_LOCALE: return("cn");		// simplified chinese			1279476590 = 'LCCn'
			case Locale.SPANISH_LOCALE: return("sp");					// Spanish						1279480688 = 'LCSp'
			case Locale.SWEDISH_LOCALE: return("sw");					// Swedish						1279480695 = 'LCSw'
			case Locale.TRADITIONAL_CHINESE_LOCALE: return("tw");		// traditional chinese			1279480951 = 'LCTw'
			case Locale.TURKISH_LOCALE: return("tr");					// Turkish						1279480946 = 'LCTr'
			case Locale.UKRAINIAN_LOCALE: return("uk");					// Ukrainian					1279481195 = 'LCUk' 
		}
		// default
		return("en");
	},

	loc = function (which,par1,par2,par3,par4) {
		if (which >= lg.length) return("");
		try {
			if (lg[which].indexOf("%%") < 0) return(lg[which]);
		}
		catch(e) {
			alert("lg error for which: " + which);
			return("");
		}
		var tx = lg[which];
		if (typeof(par1) != 'undefined') tx = tx.replace(/%%1%%/gi,par1);
		if (typeof(par2) != 'undefined') tx = tx.replace(/%%2%%/gi,par2);
		if (typeof(par3) != 'undefined') tx = tx.replace(/%%3%%/gi,par3);
		if (typeof(par4) != 'undefined') tx = tx.replace(/%%4%%/gi,par4);
		return(tx);
	},

	/*
	 * Localized strings
	 * Language: English - en
	 */
	HBlocal_en = function () {
		lg[0]="No document is open.";
		lg[1]="This document does not contain any text.";
		lg[2]="Convert styled text to hyperlinks";
		lg[3]="At least 1 character style must be defined!";
		lg[4]="Complete 'found text' to build a valid URL:";
		lg[5]="Before:";
		lg[6]="The URL part to add BEFORE the found text";
		lg[7]="+'found text'+";
		lg[8]="After:";
		lg[9]="The URL part to add AFTER the found text";
		lg[10]="No styled items found to be converted to hyperlinks!";
		lg[11]="%%1%% styled items converted to hyperlinks.";
		lg[12]="Find character style:";
		lg[13]="Setting Hyperlinks.\nPlease wait...";

		/* Buttons */
		lg[21]="Go";
		lg[22]="Execute the hyperlinks processing";
		lg[23]="Cancel";
		lg[24]="Abort hyperlinks processing";
		lg[25]="Save Settings";
		lg[26]="Save current settings to file";
		lg[27]="Load Settings";
		lg[28]="Load new settings from settings file";

		/* Cleaning */
		lg[30]="Hyperlinks Cleaning";
		lg[31]="Clean Hyperlinks";
		lg[32]="Clean or delete all Hyperlinks";
		lg[33]="NO cleaning";
		lg[34]="Leave set Hyperlinks as is";
		lg[35]="Delete LOST";
		lg[36]="Delete all unreferenced (lost) Hyperlinks";
		lg[37]="Delete ALL";
		lg[38]="Delete all Hyperlinks";
		lg[39]="%%1%% lost URL destinations deleted";
		lg[40]="No Hyperlinks deleted.";
		lg[41]="Deleted:\n%%1%% Hyperlinks.\n%%2%% hyperlinkTextSources.\n%%3%% hyperlinkURLDestinations.";
		lg[42]="Cleaning Hyperlinks.\nPlease wait...";

		/* Save settings dialog */
		lg[50]="Save settings";

		/* general options */
		lg[60]="Options";
		lg[61]="No messages";
		lg[62]="Don't show messages";

		/* Hyperlink appearance */
		lg[70]="Hyperlink Appearance";
		lg[71]="Visible Rectangle";
		lg[72]="Let the Hyperlink appear as visible rectangle";
		lg[73]="Highlight:";
		lg[74]="Highlight on mouse over";
		lg[75]="Color:";
		lg[76]="Border color";
		lg[77]="Width:";
		lg[78]="Border width";
		lg[79]="Style:";
		lg[80]="Border style";

	},

	lookdeep = function (object){
		var collection = [], index = 0, next, item;
		for (item in object){
			if (object.hasOwnProperty(item)){
				next = object[item];
				//alert(next + " -> " + next.constructor.name);
				switch (next.constructor.name) {
					case "Object":
						if (next != null) collection[index++] = item + ':{ '+ lookdeep(next).join(', ')+'}';
						break;
					case "Array":
						if (next != null) collection[index++] = item + ':['+ next.join(', ')+']';
						break;
					case "Point":
						if (next != null) collection[index++] = item + ':['+ next.x + ',' + next.y +']';
						break;
					case "Enumerator":
						if (next != null) collection[index++] = [item + ':"' + String(next) + '"'];
						break;
					case "String":
						collection[index++] = [item +':"' + String(next) + '"'];
						break;
					default:
						collection[index++] = [item +':' + String(next)];
						break;
				}
			}
		}
		return collection;
	},

	set_settingsFileName = function (fn) {
		settingsFileName = fn;
	},
	get_settingsFileName = function () {
		return(settingsFileName);
	},
	set_settingsFilePath = function (fp) {
		settingsFilePath = fp;
	},
	get_settingsFilePath = function () {
		return(settingsFilePath);
	},

	loadSettingsFromFile = function () {
		var settingsFile, err, content, settings = {}, key, key1, val;
		
		if (settingsFileName == "") return(0);
		// load the current settings from disk
		settingsFile = new File(settingsFilePath + folderSeparator + settingsFileName);
		//alert("loadSettingsFromFile: " + settingsFile.fsName + "\nexists: " + settingsFile.exists);
		if (settingsFile.exists == false) return(-1);
		settingsFile.encoding = "UTF-8";
		err = settingsFile.open("r");
		//alert("settings file:" + settingsFile.fsName);
		content = settingsFile.read();
		err = settingsFile.close();
		//alert(content);
		try {
			eval(content);	// make settings string from file to object variable 'settings'
		} catch(ex) {
			alert("Error in Settings file");
			return;
		}

		for (key in settings) {	// update current HB_settings
			if (settings.hasOwnProperty(key)) {
				if (settings[key].constructor.name == 'Function') continue;
					//alert(key + " -> " + settings[key]);
				try {
					if (key != "hl_appearance") HB_settings[key] = settings[key];
					else {
						for (key1 in settings[key]) {	// look into 'hl_appearance'
							if (settings[key][key1].constructor.name == 'Function') continue;
								//alert(key1 + " -> " + settings[key][key1]);
							switch(key1) {
								case "visible":
									HB_settings[key][key1] = settings[key][key1];
									break;
								case "borderColor":
									val = settings[key][key1].toUpperCase().replace(" ","_");
									//alert("borderColor: " + settings[key][key1] + "\nUIColor: " + UIColors[val]);
									try {
										HB_settings[key][key1] = UIColors[val];
									} catch(ex){}
									break;
								case "borderStyle":
									HB_settings[key][key1] = HyperlinkAppearanceStyle[settings[key][key1]];
									break;
								case "highlight":
									HB_settings[key][key1] = HyperlinkAppearanceHighlight[settings[key][key1]];
									break;
								case "width":
									HB_settings[key][key1] = HyperlinkAppearanceWidth[settings[key][key1]];
									break;
							}
						}
					}
				} catch(ex){}
			}
		}
		return(0);
	},

	/****************************
	 * check if exists or create folder structure
	 */
	create_folderstructure = function (thepath) {
		if (thepath == "") return(0);	// nothing to check = noerror
		var f = new Folder(thepath);
		if (f.exists == true) return(0);
		f.create();
		//alert("create_folderstructure()\nthepath: " + thepath + "\nf.exists: " + f.exists);
		if (f.exists == false) {
			var folder_names = thepath.split("/");
			var fldr = null;
			var fldr_path = "";
			for (var i = 0; i < folder_names.length; i++) {
				if (folder_names[i] == "") continue;
				fldr_path += folder_names[i] + "/";
				fldr = new Folder(fldr_path);
				fldr.create();
			}
			f = new File(thepath);	// recheck for existance
			if (f.exists == false) {
				return(1);
			}
		}
		return(0);
	},

	saveSettingsToFile = function () {
		var thesettingspath, settingsFile, err;
		// write the current settings to disk
		thesettingspath = settingsFilePath;
		if (endsWith(thesettingspath,folderSeparator) == false) thesettingspath += folderSeparator;
		thesettingspath += settingsFileName;
		settingsFile = new File(thesettingspath);
		settingsFile.encoding = "UTF-8";
		//alert("saving settings to: " + settingsFile.fsName);
		try { settingsFile.remove(); } catch(e) {}
		err = settingsFile.open("w");

		err = settingsFile.write("settings={\n"+ lookdeep(HB_settings).join(',\n')+"\n}");
		err = settingsFile.close();
	},

	canWriteInFolder = function (path, createIfNotExists) {
		error.text = "";
		error.lastcode = 0;
		var mypath = path;
		if ( endsWith(mypath,folderSeparator) == false) mypath += folderSeparator;
		var fldr = new Folder(mypath);	// make sure the path exists
		if (!fldr.exists) {
			if (createIfNotExists == false) return(false);
			var fldrcreated = fldr.create();
			if (fldrcreated == false) {
				error.lastcode = error.FOLDER_CREATE;
				error.text = fldr.error;
				//alert("canWriteInFolder()\ncould not create path: " + path);
				return(false);	// we can NOT create/write
			}
		}
		// the folder exists or was created
		var checkFile = new File(mypath + folderSeparator + "writecheck__.tst");
		var created = checkFile.open("w");
		if (created == true) {	// we can write
			checkFile.close();
			checkFile.remove();
			//alert("canWriteInFolder()\nwritable path: " + path);
			return(true);
		}
		error.lastcode = error.FILE_CREATE;
		error.text = checkFile.error;
		//alert("canWriteInFolder()\nNON writable path: " + path);
		return(false);
	},

	startsWith = function (str,subs) {
		return str.indexOf(subs) === 0;
	},

	endsWith = function (str,subs) { 
		if (str.length < subs.length) return(false);
		if ((str == "") || (subs == "")) return(false);
		var endstr = str.substr(str.length - subs.length);
		return (endstr == subs);
	},

	toDay = function () {
		// get current date as YYYYMMDD
		var now = new Date(),
			year = "", month = "", day = "", today = "";
		year = "" + now.getFullYear();
		month = "" + (now.getMonth() + 1);
		if (month.length < 2) month = "0" + month;
		day = "" + now.getDate();
		if (day.length < 2) day = "0" + day;
		today = year + month + day;
		return(today);
	},

	writeFile = function (path, content) {
		var err,
			f = new File(path);
		f.encoding = "UTF-8";
		try { f.remove(); } catch(e) {}
		do {
			err = f.open("w");
			if (err != true) break;
			err = f.write(content);
			if (err != true) break;
		} while(false);
		f.close();
		return(err);
	};

	if (!Array.prototype.indexOf) {
		Array.prototype.indexOf = function(obj, start) {
			for (var i = (start || 0), j = this.length; i < j; i++) {
				if (this[i] === obj) { return i; }
			}
			return -1;
		}
	}

	// propagate functions
	this.Product = Product;
	this.HB_settings = HB_settings;
	this.main = main;
	this.HBlocal_en = HBlocal_en;
	this.set_settingsFileName = set_settingsFileName;
	this.get_settingsFileName = get_settingsFileName;
	this.set_settingsFilePath = set_settingsFilePath;
	this.get_settingsFilePath = get_settingsFilePath;
	this.loadSettingsFromFile = loadSettingsFromFile;
	this.getScriptsPath = getScriptsPath;
	this.removeHyperlinks = removeHyperlinks;
	this.createHyperlinks = createHyperlinks;

	HBlocal_en();	// load default english language

	//main();
	//main(1,"settings.set",0,0);


}; // the wrapping function is NOT executed now!

/**
 * standard call with main dialog
 */
// instantiate new HyperLinkBuilder
if (typeof(thisScript_instance) == 'undefined') {
	//alert("defining thisScript_instance");
	var thisScript_instance = null;
}

//thisScript_instance = null;	// uncomment for DEBUG to always reload the script
if (thisScript_instance == null) thisScript_instance = new HyperLinkBuilder();
var myHB = thisScript_instance;
myHB.main();	// calls main dialog


/**
 * more independent, automated calls
 */
/*
// edit below to match needs
// instantiate new HyperLinkBuilder
var myHB = new HyperLinkBuilder();
// set english language
myHB.HBlocal_en();	// load english language
// load settings file
myHB.loadSettingsFromFile();		// load 'settings.set'
myHB.HB_settings.silent = 1;		// may be, that we want to do it silent
// remove/clean existing Hyperlinks
//myHB.removeHyperlinks(1,true);	// silently trash lost Hyperlinks
myHB.removeHyperlinks(2,true);		// silently trash ALL Hyperlinks
// re-create hyperlinks according to loaded settings file
myHB.createHyperlinks();

// and create URL links from styled web addresses
// set settings filename
myHB.set_settingsFileName("URL.set");
myHB.loadSettingsFromFile();		// load 'URL.set'
myHB.HB_settings.silent = 1;		// may be, that we want to do it silent
myHB.createHyperlinks();

// and create mailto: links from styled mail addresses
// set settings filename
myHB.set_settingsFileName("mailto.set");
myHB.loadSettingsFromFile();		// load 'mailto.set'
myHB.HB_settings.silent = 1;		// may be, that we want to do it silent
myHB.createHyperlinks();
*/