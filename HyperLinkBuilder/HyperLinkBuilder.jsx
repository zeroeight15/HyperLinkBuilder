/**
 * HyperLinkBuilder.jsx
 * Caller for HyperLinkBuilder.jsxbin
 * Javascript for InDesign CC, CS6, CS5.5, CS5
 * Version date: 20150616
 *
 * PURPOSE:
 * ===========
 * Split one or more stories at one or more selected paragraph styles or at the insertion pointer
 *
 * DISCLAIMER:
 * ===========
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL THE PRODUCER OR
 * ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF
 * USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
 * OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 *
 * AUTHOR:
 * ===========
 * Andreas Imhof
 * EDV-Dienstleistungen
 * CH-Guemligen, Switzerland
 * www.aiedv.ch
 * CopyRight 2015
 *
 * This is NOT free software!
 */
#target "InDesign"
#targetengine "HyperLinkBuilder"

var scriptFile = new File(getScriptsPath() + "/HyperLinkBuilderSupport/HyperLinkBuilder.jsxbin");

if (scriptFile.exists == false) {
	scriptFile = new File(getScriptsPath() + "/HyperLinkBuilderSupport/HyperLinkBuilder.jsx")
	if (scriptFile.exists == false) {
		alert("HyperLinkBuilder binary script not found!\nReinstall the HyperLinkBuilder package.");
		exit(0);
	}
}

// call main HyperLinkBuilder script
app.doScript(scriptFile, ScriptLanguage.javascript);




function getScriptsPath() {
	var fullpath = app.activeScript;
	var scriptFile = new File(fullpath);
	return(scriptFile.path);
}
