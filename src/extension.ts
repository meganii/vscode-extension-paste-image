// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { promisify } from "util";
import { exec } from "child_process";
import * as path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import got from 'got';

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

const gyazoRegExp = new RegExp('https://gyazo.com/([0-9a-zA-Z]*)');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-extension-paste-image" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('vscode-extension-paste-image.pasteImage', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from vscode-extension-paste-image!');
		insertFromClipboardWithCloud();
	});
	context.subscriptions.push(disposable);

	let disposable2 = vscode.commands.registerCommand('vscode-extension-paste-image.insertGyazo', async () => {
		vscode.window.showInformationMessage('Insert Gyazo!!!!');
		insertFromGyazo();
	});
	context.subscriptions.push(disposable2);
}

async function insertFromClipboardWithCloud() {
	const basepath :string = vscode.workspace.getConfiguration().get('pasteImage.path') || path.join(__dirname, '../');
	console.log(basepath);
	const filename = new Date().toLocaleString('sv').replace(/\D/g,'') + '.png';
	const imgpath = path.join(basepath, filename);

	try {
		const { stdout, stderr } = await execPromise(`powershell.exe "(Get-Clipboard -Format Image).Save('${imgpath}')"`);
		console.log(`imgpath: ${imgpath}`);
		console.log(`stdout: ${stdout}`);
		console.error(`stderr: ${stderr}`);
	} catch (error) {
		vscode.window.showErrorMessage('Cannot save image');
	}

	const result = await cloudinary.uploader.upload(imgpath);
	let cloudinaryURL :string = result?.secure_url || '';
	const width = result?.width;
	const height = result?.height;

	insertText(cloudinaryURL, width, height);
}

async function insertFromGyazo() {
	const clipboardText = await vscode.env.clipboard.readText();
	if (!gyazoRegExp.test(clipboardText)) { return; }
	console.log(clipboardText);
	
	const m = clipboardText.match(gyazoRegExp);
	if (!m) { return; }

	console.log(m[1]);
	const api = 'https://api.gyazo.com/api/oembed';
	const params = new URLSearchParams();
	params.append('url', m[0]);
	const data : {url: string, height: number, width: number} = await got(`${api}?${params}`).json();
	console.log(data);

	insertText(data.url, data.width, data.height);
}

function toMarkdown(filepath: string, width:number, height:number) {
	return `![ALT](${filepath} "=${width}x${height}")`;
}

function insertText(url:string, width:number, height:number) {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showErrorMessage('no editor');
		return;
	}

	editor.edit(edit => {
		let current = (editor as vscode.TextEditor).selection;
		if (current.isEmpty) {
			edit.insert(current.start, toMarkdown(url, width, height));
		} else {
			edit.replace(current, toMarkdown(url, width, height));
		}
	});
}

// this method is called when your extension is deactivated
export function deactivate() {}
