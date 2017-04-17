var getAppLanguageCode = function () {
		switch (app.locale) {	// InDesign locales
			case Locale.FRENCH_LOCALE: return("fr");					// French						1279477362 = 'LCFr'
			case Locale.GERMAN_LOCALE: return("de");					// German						1279477613 = 'LCGm'
		}
		// default
		return("en");
	},
	getScriptsPath = function () {
		var fullpath = app.activeScript,
			scriptFile = new File(fullpath);
		return(scriptFile.path);
	},
	appLanguageCode,
	f;

appLanguageCode = getAppLanguageCode();
//appLanguageCode = "de";

// does not work on some new OSX versions:  var man_path = getScriptsPath() + "/docs/HyperLinkBuilder_Manual_" + appLanguageCode + ".html";
var man_path = getScriptsPath() + "/docs/";
f = new File(man_path);
f.execute();