/**
 * HyperLinkBuilder.jsx
 * Caller for HyperLinkBuilder.jsxbin
 * Javascript for InDesign CC(xxxx), CS6, CS5.5, CS5
 * Version date: 20170417
 *
 * PURPOSE:
 * ===========
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
 * ===========
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

scriptFile = new File(getScriptsPath() + "/HyperLinkBuilderSupport/HyperLinkBuilder.jsx")
if (scriptFile.exists == false) {
	alert("HyperLinkBuilder main script not found!\nReinstall the HyperLinkBuilder package.");
	exit(0);
}

// call main HyperLinkBuilder script
app.doScript(scriptFile, ScriptLanguage.javascript);




function getScriptsPath() {
	var fullpath = app.activeScript;
	var scriptFile = new File(fullpath);
	return(scriptFile.path);
}
