const vscode = require('vscode');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

var inputList = [];
var outputList = [];
var check = true;

var NumberOfTest = 5;

var problems = [];


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	const config = vscode.workspace.getConfiguration("JOY");

	const server_ip = config.get("serverIP");
	const ID = config.get("ID");
	console.log("asd" + server_ip);
	console.log("asd" + ID);

	async function makeTestCase(i){
		var path1 = vscode.workspace.workspaceFolders[0].uri.fsPath + "/test"+i;
		const testCaseFolderName = 'testcase';
		const testCaseFolderPath = path.join(path1, testCaseFolderName);
		fs.mkdir(testCaseFolderPath, (err) => {
		  	if (err) {
				vscode.window.showErrorMessage('Failed to create testcase folder: ' + err.message);
			} else {
				vscode.window.showInformationMessage('Testcase folder created successfully');
		  	}
		});
	}

	let get_problem = vscode.commands.registerCommand('JOY.get', async function () {
		const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
		const testFolderName = 'test';
		const testFolderPath = path.join(workspacePath, testFolderName);
		for(var i = 0 ; i < NumberOfTest ; i++){
			fs.mkdirSync(testFolderPath + i);
			await makeTestCase(i);
			var problem = {
				id : i,
				check : false,
				path : testFolderPath,
				isCompile : false
			};
			problems.push(problem);
		}
	});


	let remove_problem = vscode.commands.registerCommand('JOY.remove', function () {
		const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
      	const testcaseFolderName = 'testcase';
      	const testcaseFolderPath = path.join(workspacePath, testcaseFolderName);
      	fs.rmdir(testcaseFolderPath, { recursive: true }, (err) => {
        	if (err) {
        		vscode.window.showErrorMessage('Failed to delete testcase folder: ' + err.message);
        	} else {
        		vscode.window.showInformationMessage('Testcase folder deleted successfully');
        	}
      	});
	});


	let get_result = vscode.commands.registerCommand('JOY.result', function () {
		const activeEditor = vscode.window.activeTextEditor;
		const activeFilePath = activeEditor.document.fileName;
		const problemNum = (path.dirname(activeFilePath)).slice(-1);
		console.log(problems[problemNum].id);
		if(problems[problemNum].isCompile){
			problems[problemNum].check = check;
		}
		console.log(problems[problemNum].check);
		if(problems[problemNum].check){
			vscode.window.showInformationMessage("TestCase에 통과하였습니다.");
		}else{
			vscode.window.showErrorMessage(`TestCase에 통과하지 못하였습니다.`);
		}
	});


	let show_problem = vscode.commands.registerCommand('JOY.show', function () {
		const view = vscode.window.createWebviewPanel(
			'joy.problem',
			'JOY',
			vscode.ViewColumn.Beside,
			{
			  enableScripts: true
			}
		);
		let htmlContent = view.webview.html;
		  // HTML 내용에 글씨를 추가합니다.
		  htmlContent += '<h2>Additional Text</h2>';
		view.webview.html = htmlContent;
	});

	let send_result = vscode.commands.registerCommand('JOY.send', function () {
		var pass = [];
		for(var i = 0 ; i < NumberOfTest ; i++){
			pass.push(problems[i].check);
		}
		for(var i = 0 ; i < NumberOfTest ; i++){
			console.log(pass);
		}
	});


	function createInputTreeView(){
		vscode.window.createTreeView('joy-input',{
			treeDataProvider: new inputProvider()
		});
	}
	//데이터 삽입
	const input = new Input("a",vscode.TreeItemCollapsibleState.None);
	inputList.push(input);

	function createOutputTreeView(){
		vscode.window.createTreeView('joy-output',{
			treeDataProvider: new outputProvider()
		});
	}
	//데이터 삽입
	const output = new Output("a",vscode.TreeItemCollapsibleState.None);
	outputList.push(output);


	createInputTreeView();
	createOutputTreeView();


	let test = vscode.commands.registerCommand('JOY.test', function () {
		const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('열린 파일을 찾을 수 없습니다.');
            return;
        }

		const activeFilePath = activeEditor.document.fileName;
		const input = [];
		for(var i = 0 ; i < 10 ; i++){
			const temp_input = path.join(path.dirname(activeFilePath), 'testcase/tcin'+i);
			const input_value = readInputFromFile(temp_input);
			input.push(input_value);
		}

        // main.c 파일의 상대 경로 계산
        const filePath = path.join(path.dirname(activeFilePath), 'main.c');
		const programPath = path.join(path.dirname(activeFilePath), 'program');
        // 컴파일 명령어와 실행 인수 설정
        const compileCommand = 'gcc';
        const compileArgs = ['-o', programPath, filePath];  // 컴파일하여 'program'이라는 실행 파일 생성

        // 컴파일 후 프로그램 실행
        const compileProcess = spawn(compileCommand, compileArgs);

        compileProcess.stdout.on('data', (data) => {
            console.log(`컴파일 출력: ${data}`);
        });

        compileProcess.stderr.on('data', (data) => {
            console.error(`컴파일 에러: ${data}`);
        });

        compileProcess.on('close', (code) => {
			check = true;
            if (code === 0) {
                console.log('컴파일 완료');

				for(var i = 0 ; i < 10 ; i++){
					// 컴파일이 성공적으로 완료되면 프로그램 실행
					var runCommand = path.join(path.dirname(activeFilePath), 'program');
					const runProcess = spawn(runCommand);

					//표준 입력을 위한 stdin
					runProcess.stdin.write(input[i]);
					runProcess.stdin.end();

					const temp_output = path.join(path.dirname(activeFilePath), 'testcase/tcout'+i);
					const output_value = readInputFromFile(temp_output);
					runProcess.stdout.on('data',async (data) => {
						// console.log(data.toString()+" "+ output_value)
						if(data.toString() == output_value){
							await handleTestCaseResult(true);
						}else{
        					await handleTestCaseResult(false);
						}
					});
					runProcess.stderr.on('data', (data) => {
						console.error(`프로그램 에러: ${data}`);
					});

					runProcess.on('close', (code) => {
						console.log(`프로그램 종료, 종료 코드: ${code}`);
					});
				}
            } else {
                console.error('컴파일 에러');
            }
        });
		
	});

	async function handleTestCaseResult(passed) {
		if (passed) {
			// vscode.window.showInformationMessage("TestCase에 통과하였습니다.");
			const activeEditor = vscode.window.activeTextEditor;
			const activeFilePath = activeEditor.document.fileName;
			const problemNum = (path.dirname(activeFilePath)).slice(-1);
			problems[problemNum].isCompile = true;
		} else {
			//vscode.window.showErrorMessage('TestCase에 통과하지 못하였습니다.');
			const activeEditor = vscode.window.activeTextEditor;
			const activeFilePath = activeEditor.document.fileName;
			const problemNum = (path.dirname(activeFilePath)).slice(-1);
			problems[problemNum].isCompile = true;
			check = false;
		}
	}

	context.subscriptions.push(get_problem);
	context.subscriptions.push(remove_problem);
	context.subscriptions.push(show_problem);
	context.subscriptions.push(get_result);
	context.subscriptions.push(test);
}

function deactivate() {}

function readInputFromFile(filePath) {
	try {
	  const absolutePath = filePath;
	  const input = fs.readFileSync(absolutePath, 'utf-8');
	  return input;
	} catch (error) {
	  console.error(`Error reading input file: ${error}`);
	  return null;
	}
}

class inputProvider{
	getTreeItem(element) {
        return element;
    }
	getChildren(element){
        const temp = Object.assign([], inputList);
        // return Promise.resolve(temp.reverse());
		return Promise.resolve(temp);
    }
}
class Input extends vscode.TreeItem {
    constructor(
        label,
        collapsibleState
    ) {
        super(label, collapsibleState);
    }
}

class outputProvider{
	getTreeItem(element) {
        return element;
    }
	getChildren(element){
        const temp = Object.assign([], outputList);
        // return Promise.resolve(temp.reverse());
		return Promise.resolve(temp);
    }
}
class Output extends vscode.TreeItem {
    constructor(
        label,
        collapsibleState
    ) {
        super(label, collapsibleState);
    }
}

module.exports = {
	activate,
	deactivate
}
