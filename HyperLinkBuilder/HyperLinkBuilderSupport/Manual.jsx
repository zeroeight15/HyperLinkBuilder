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

f = new File(getScriptsPath() + "/docs/HyperLinkBuilder_Manual_" + appLanguageCode + ".html");
//alert(f.fsName);
f.execute();