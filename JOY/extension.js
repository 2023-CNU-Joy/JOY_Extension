const vscode = require('vscode');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios').default;
const CryptoJS = require('crypto-js');


var sampleList = [];
var check = true;

var NumberOfTest = 0;
var NumberOfTestcase = [];

var problems = [];

const AESKEY = "0123456789abcdef0123456789abcdef";


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	const config = vscode.workspace.getConfiguration("JOY");

	const server_ip = config.get("serverIP");
	const ID = config.get("ID");
	console.log(server_ip);
	console.log(ID);


	async function fetchProblem() {
		try {
		  	const response = await axios.get(server_ip+"/api/v1/problems");
		  	const data = response.data;
		  	console.log("Prpblems : " + data);
		//   var ddata = JSON.stringify();
		  	NumberOfTest = data.length;

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
					isCompile : false,
					title : data[i].title,
					content : data[i].content,
					testInputSample : data[i].exampleTestInput,
					testOutputSample : data[i].exampleTestOut
				};
				problems.push(problem);
			}
		  // 데이터를 활용하여 추가적인 작업 수행
		} catch (error) {
		  console.error('API 호출 중 오류가 발생했습니다:', error.message);
		}
	}

	async function fetchTestcase() {
		try {
		  	const response = await axios.get(server_ip+"/api/v1/testcases");
		  	const data = response.data;
		  	// console.log(data);
			for(var i = 0 ; i < data.length ; i++){
				for(var j = 0 ; j < data[i].length ; j++){
					for(var k = 0 ; k < data[i][j].length ; k++){
						// console.log(decodeByAES256(AESKEY, data[i][j][k]))
					}
				}
			}
		  // 데이터를 활용하여 추가적인 작업 수행
		} catch (error) {
		  	console.error('API 호출 중 오류가 발생했습니다:', error.message);
		}
	}

	function decodeByAES256(key, data){
		const cipher = CryptoJS.AES.decrypt(data, CryptoJS.enc.Utf8.parse(key), {
			iv: CryptoJS.enc.Utf8.parse(""),
			padding: CryptoJS.pad.Pkcs7,
			mode: CryptoJS.mode.CBC
		});
		return cipher.toString(CryptoJS.enc.Utf8);
	};

	async function makeTestCase(num){
		var path1 = vscode.workspace.workspaceFolders[0].uri.fsPath + "/test"+num;
		const testCaseFolderName = 'testcase';
		const testCaseFolderPath = path.join(path1, testCaseFolderName);
		fs.mkdir(testCaseFolderPath, (err) => {
		  	if (err) {
				vscode.window.showErrorMessage('Failed to create testcase folder: ' + err.message);
			} else {
				vscode.window.showInformationMessage('Testcase folder created successfully');
		  	}
		});

		const mainPath = path.join(path1, "main.c");
		fs.writeFileSync(mainPath, '');
		
		try {
			const response = await axios.get(server_ip+"/api/v1/testcases");
			const data = response.data;
			// console.log(data);
			var path2 = vscode.workspace.workspaceFolders[0].uri.fsPath + "/test"+num+"/testcase";
			for(var j = 0 ; j < data[num][0].length ; j++){
				const testCasePath = path.join(path2, "tcin"+j);
				fs.writeFileSync(testCasePath, data[num][0][j]);
			}
			for(var j = 0 ; j < data[num][0].length ; j++){
				const testCasePath = path.join(path2, "tcout"+j);
				fs.writeFileSync(testCasePath, data[num][1][j]);
			}
		// 데이터를 활용하여 추가적인 작업 수행
	  } catch (error) {
			console.error('API 호출 중 오류가 발생했습니다:', error.message);
	  }
	}

	let get_problem = vscode.commands.registerCommand('JOY.get', async function () {
		await fetchProblem();

		try {
			const response = await axios.get(server_ip+"/api/v1/testcases");
			const data = response.data;
			console.log("Encrypto Testcase : " + data);
			for(var i = 0 ; i < NumberOfTest ; i++){
				NumberOfTestcase.push(data[i][0].length);
			}
		// 데이터를 활용하여 추가적인 작업 수행
	  	} catch (error) {
			console.error('API 호출 중 오류가 발생했습니다:', error.message);
	  	}

		function createTestcaseSampleTreeView(){
			vscode.window.createTreeView('joy-InOut',{
				treeDataProvider: new testcaseSampleProvider()
			});
		}
		//데이터 삽입
		for(var i = 0 ; i < NumberOfTest ; i++){
			var inputArray  = problems[i].testInputSample[0].split('\n')
			var outputArray  = problems[i].testOutputSample[0].split('\n')
			const test = new TestcaseSample("test" + i, vscode.TreeItemCollapsibleState.Collapsed);
			const input = new TestcaseSample("Input",vscode.TreeItemCollapsibleState.Collapsed);
			const output = new TestcaseSample("Output",vscode.TreeItemCollapsibleState.Collapsed);
			test.addChild(input);
			test.addChild(output);
			for(var j = 0 ; j < inputArray.length ; j++){
				const testcase = new TestcaseSample(inputArray[j],vscode.TreeItemCollapsibleState.None);
				input.addChild(testcase);
			}
			for(var j = 0 ; j < outputArray.length ; j++){
				const testcase = new TestcaseSample(outputArray[j],vscode.TreeItemCollapsibleState.None);
				output.addChild(testcase);
			}
			sampleList.push(test)
		}
		createTestcaseSampleTreeView();

	});

	let get_result = vscode.commands.registerCommand('JOY.result', function () {
		const activeEditor = vscode.window.activeTextEditor;
		const activeFilePath = activeEditor.document.fileName;
		const problemNum = (path.dirname(activeFilePath)).slice(-1);
		console.log("Problem ID : "+problems[problemNum].id);
		if(problems[problemNum].isCompile){
			problems[problemNum].check = check;
		}
		console.log("Problem check : " + problems[problemNum].check);
		if(problems[problemNum].check){
			vscode.window.showInformationMessage("TestCase에 통과하였습니다.");
		}else{
			vscode.window.showErrorMessage(`TestCase에 통과하지 못하였습니다.`);
		}
	});

	let show_problem = vscode.commands.registerCommand('JOY.show', function () {
		for(var i = 0 ; i < NumberOfTest ; i++){
			const view = vscode.window.createWebviewPanel(
				'joy.problem',
				'test'+i,
				vscode.ViewColumn.Two,
				{
				  enableScripts: true
				}
			);
			let htmlContent = view.webview.html;
			  // HTML 내용에 글씨를 추가합니다.
			  htmlContent += '<h2>'+problems[i].title+'</h2>'+problems[i].content;
			view.webview.html = htmlContent;
		}
	});

	let send_result = vscode.commands.registerCommand('JOY.send', function () {
		var results = [];
		for(var i = 0 ; i < NumberOfTest ; i++){
			results.push(problems[i].check);
		}

		console.log("Results : " + results);

		const data = {
			studentId : ID,
			results : results
		}

		axios.post(server_ip+"/api/v1/results", JSON.stringify(data), {
			headers:{
				'Content-Type': 'application/json'
			}
		})
  		.then(response => {
    		console.log(response.data); // 응답 데이터 출력
		})
  		.catch(error => {
    		console.error(error); // 오류 출력
		});
	});

	let test = vscode.commands.registerCommand('JOY.test', function () {
		const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('열린 파일을 찾을 수 없습니다.');
            return;
        }

		const activeFilePath = activeEditor.document.fileName;
		const input = [];

		const problemNum = (path.dirname(activeFilePath)).slice(-1);

		for(var i = 0 ; i < NumberOfTestcase[problemNum] ; i++){
			const temp_input = path.join(path.dirname(activeFilePath), 'testcase/tcin'+i);
			const input_value = readInputFromFile(temp_input);
			input.push(decodeByAES256(AESKEY, input_value));
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
            console.log('컴파일 출력: ' + data);
        });

        compileProcess.stderr.on('data', (data) => {
            console.error('컴파일 에러: ' + data);
        });

        compileProcess.on('close', (code) => {
			check = true;
            if (code === 0) {
                console.log('컴파일 완료');

				const activeEditor = vscode.window.activeTextEditor;
				const activeFilePath = activeEditor.document.fileName;
				const problemNum = (path.dirname(activeFilePath)).slice(-1);

				for(var i = 0 ; i < NumberOfTestcase[problemNum] ; i++){
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
						if(data.toString() == decodeByAES256(AESKEY, output_value)){
							await handleTestCaseResult(true);
						}else{
        					await handleTestCaseResult(false);
						}
					});
					runProcess.stderr.on('data', (data) => {
						console.error('프로그램 에러: ' + data);
					});

					runProcess.on('close', (code) => {
						console.log('프로그램 종료, 종료 코드: ' + code);
					});
				}
            } else {
                console.error('컴파일 에러');
            }
        });
		
	});

	async function handleTestCaseResult(passed) {
		if (passed) {
			const activeEditor = vscode.window.activeTextEditor;
			const activeFilePath = activeEditor.document.fileName;
			const problemNum = (path.dirname(activeFilePath)).slice(-1);
			problems[problemNum].isCompile = true;
		} else {
			const activeEditor = vscode.window.activeTextEditor;
			const activeFilePath = activeEditor.document.fileName;
			const problemNum = (path.dirname(activeFilePath)).slice(-1);
			problems[problemNum].isCompile = true;
			check = false;
		}
	}

	context.subscriptions.push(get_problem);
	context.subscriptions.push(show_problem);
	context.subscriptions.push(get_result);
	context.subscriptions.push(test);
	context.subscriptions.push(send_result);
}

function deactivate() {}

function readInputFromFile(filePath) {
	try {
	  const absolutePath = filePath;
	  const input = fs.readFileSync(absolutePath, 'utf-8');
	  return input;
	} catch (error) {
	  console.error('Error reading input file: ' + error);
	  return null;
	}
}

class testcaseSampleProvider{
	getTreeItem(element) {
        return element;
    }
	getChildren(element){
        if (!element) {
			// Root 노드의 하위 항목 반환
			return Promise.resolve(sampleList);
		} else {
			// 각 항목의 하위 항목 반환
			return Promise.resolve(element.children);
		}
    }
}

class TestcaseSample extends vscode.TreeItem {
    constructor(
        label,
        collapsibleState,
    ) {
        super(label, collapsibleState);
		this.children = []
    }
	addChild(child){
		this.children.push(child);
	}
	getChildrne(){
		return this.children;
	}
}

module.exports = {
	activate,
	deactivate
}
