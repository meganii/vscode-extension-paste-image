// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { promisify } from "util";
import { exec } from "child_process";
import * as path from 'path';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	cloud_name: vscode.workspace.getConfiguration().get('pasteImage.cloudinaryName'),
	// eslint-disable-next-line @typescript-eslint/naming-convention
	api_key: vscode.workspace.getConfiguration().get('pasteImage.cloudinaryAPIKey'),
	// eslint-disable-next-line @typescript-eslint/naming-convention
	api_secret: vscode.workspace.getConfiguration().get('pasteImage.cloudinaryAPISecret'),
	secure: true
});

const execPromise = promisify(exec);


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-extension-paste-image" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('vscode-extension-paste-image.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from vscode-extension-paste-image!');
		main();
	});

	context.subscriptions.push(disposable);
}

async function main() {
	const basepath = path.join(__dirname, '../');
	const filename = new Date().toLocaleString('sv').replace(/\D/g,'') + '.png';
	const imgpath = path.join(basepath, filename);

	const { stdout, stderr } = await execPromise(`powershell.exe "(Get-Clipboard -Format Image).Save('${imgpath}')"`);
	console.log(`stdout: ${stdout}`);
	console.error(`stderr: ${stderr}`);

	const result = await cloudinary.uploader.upload(imgpath);
	let cloudinaryURL :string = result?.secure_url || '';
	const width = result?.width;
	const height = result?.height;

	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showErrorMessage('no editor');
		return;
	}

	editor.edit(edit => {
		let current = (editor as vscode.TextEditor).selection;
		if (current.isEmpty) {
			edit.insert(current.start, toMarkdown(cloudinaryURL, width, height));
		} else {
			edit.replace(current, toMarkdown(cloudinaryURL, width, height));
		}
	});
}

function toMarkdown(filepath: string, width:number, height:number) {
	return `![ALT](${filepath} "=${width}x${height}")`;
}

// this method is called when your extension is deactivated
export function deactivate() {}
