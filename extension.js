const vscode = require('vscode');

function activate(context) {
    let disposable = vscode.commands.registerCommand('c89-line-comments.toggleLineComment', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const document = editor.document;
        const selections = editor.selections;

        // collect all unique lines across all active selections/carets
        const linesToProcess = new Set();
        for (const selection of selections) {
            const startLine = selection.start.line;
            let endLine = selection.end.line;
            
            // if selection ends at character 0 of a new line, don't include that empty new line
            if (selection.end.character === 0 && endLine > startLine) {
                endLine--;
            }
            
            for (let i = startLine; i <= endLine; i++) {
                linesToProcess.add(i);
            }
        }

        // determine toggle state: if any selected line is uncommented, we comment all.
        // otherwise, if all are already commented, we uncomment all.
        let allCommented = true;
        let hasNonEmptyLines = false;

        for (const lineNum of linesToProcess) {
            const text = document.lineAt(lineNum).text.trim();
            if (text.length > 0) {
                hasNonEmptyLines = true;
                if (!(text.startsWith('/*') && text.endsWith('*/'))) {
                    allCommented = false;
                    break;
                }
            }
        }
        
        // if they only highlighted blank lines, default to commenting them
        if (!hasNonEmptyLines) {
            allCommented = false;
        }

        editor.edit(editBuilder => {
            for (const lineNum of linesToProcess) {
                const line = document.lineAt(lineNum);
                const text = line.text;

                // capture leading whitespace to preserve indentation
                const indentMatch = text.match(/^\s*/);
                const indent = indentMatch ? indentMatch[0] : '';
                
                // content without leading whitespace and without trailing whitespace
                const content = text.substring(indent.length).trimEnd();

                if (allCommented) {
                    // UNCOMMENT logic
                    // matches /* followed by optional space, captures content, optional space, */
                    const match = content.match(/^\/\*\s?(.*?)\s?\*\/$/);
                    if (match) {
                        const newText = indent + match[1];
                        editBuilder.replace(line.range, newText);
                    }
                } else {
                    // COMMENT logic
                    // skip commenting lines that are already c89 commented to prevent /* /* nesting */ */
                    if (!(content.startsWith('/*') && content.endsWith('*/'))) {
                        const newText = indent + '/* ' + content + ' */';
                        editBuilder.replace(line.range, newText);
                    }
                }
            }
        });
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
