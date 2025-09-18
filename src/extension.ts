import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Create output channel for webview logs
  const outputChannel = vscode.window.createOutputChannel('WebView Logs');
  const disposable = vscode.commands.registerCommand('cr-crud-extension.createCrudSupport', () => {
    const panel = vscode.window.createWebviewPanel(
      'crCrudSupport',
      'Create CRUD Support',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    // const nonce = getNonce();
    panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

    panel.webview.onDidReceiveMessage((msg) => {
      if (msg.command === 'createCrudSupport') {
        const { componentName, routeName, fields } = msg.payload as {
          componentName: string;
          routeName: string;
          fields: string[];
        };
        // Empty body for now
        outputChannel.appendLine(`[WebView] Received payload:', ${componentName}, ${routeName}, ${fields.toString()}`);
        outputChannel.show(true);
      } else if(msg.command==='log'){
        console.log(`[WebView] ${msg.text}`);
        // Or log to output channel
        outputChannel.appendLine(`[WebView] ${msg.text}`);
        outputChannel.show(false); // false = don't preserve focus
      }
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {


  vscode.window.showInformationMessage('Bane getWebviewContent vscode.Uri!');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; padding: 1rem; }
    label { display: block; margin-top: 1rem; }
    input { width: 12rem; padding: 0.5rem; margin-top: 0.25rem; }
    button { margin-top: 1rem; padding: 0.5rem 1rem; }
    .two-column-grid{
      display: grid;
      grid-template-columns: 13rem 10rem;
      column-gap:1rem;
    }
    .left-column label, .left-column:input{
      display:block;
      width:100%;
    }
    .right-column{
      width:100%;
    }
    .fields-list{
      position:relative;
      margin-top:2rem;
      padding:6px 0 0 1rem;
      list-style-type: none;
      width:10rem;
      height: 14rem;
      border:1px solid gray;
      border-radius:5px;
      overflow-y: auto;
      overflow-x:visible;
      z-index:0;
    }
    .fields-list::before{
        content: 'Fields List';
        position: absolute;
        top: -1.5rem;
        left:5px;
        z-index: 10;
      }
      .fields-list li{
        color: lightgreen;
        font-size:16px;
      }
  </style>
</head>
<body>
  <h2>Create CRUD Support</h2>
  <div class='two-column-grid'>
    <div class='left-column'>
      <label>Component Name
        <input id="componentName" type="text" />
      </label>

      <label>Route Folder Name
        <input id="routeName" type="text" />
      </label>

      <label>Add Field Name
        <input id="addField" type="text" value='caption'/>
      </label>
      <!--
      <label>Add Field Name
        <button id="addFieldBtnId">add field name</button>
      </label>
      -->
      <button id="createBtn">Create CRUD Support</button>
    </div>
    <div class='right-column'>
      <ul class="fields-list" id="fieldsList"></ul>
    </div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();

    let componentName = '';
    let routeName = '';
    let fields = [];

    const scroll = (el) => {
    if (
      el.offsetHeight + el.scrollTop >
      el.getBoundingClientRect().height - 20
    ) {
      setTimeout(()=>{
        el.scrollTo(0, el.scrollHeight);
      },0)
    }
  };

    const componentNameEl = document.getElementById('componentName');
    const routeNameEl = document.getElementById('routeName');
    const addFieldBtnEl = document.getElementById('addFieldBtnId');
    const addFieldEl = document.getElementById('addField');
    // addFieldBtnEl.addEventListener('click', () => {
    //   try{
    //     const val = addFieldEl.value.trim();
    //     if (val) {
    //       fields.push(val);
    //       renderFields();
    //     }
    //   }finally{}
    //   addFieldEl.value = '';
    // })
    const fieldsListEl = document.getElementById('fieldsList');
    const createBtnEl = document.getElementById('createBtn');

    componentNameEl.addEventListener('input', e => componentName = e.target.value);
    routeNameEl.addEventListener('input', e => routeName = e.target.value);

    addFieldEl.addEventListener('keyup', (event) => {
      const v = addFieldEl.value.trim()
      if (!v) {
        return;
      }
      if (fields.includes(v)){
        setTimeout(() => {
          addFieldEl.style.color = 'red';
        },0)
        return;
      }
      addFieldEl.style.color = 'black';
      if (event.key !== 'Enter') return;
      fields.push(v);
      renderFields();
      addFieldEl.value = '';
      scroll(fieldsListEl)
    });
    function renderFields() {
      fieldsListEl.innerHTML = '';
      fields.forEach(f => {
        const p = document.createElement('li');
        p.textContent = f;
        fieldsListEl.appendChild(p);
      });
    }

    createBtnEl.addEventListener('click', () => {
      if (componentName && routeName && fields.length){
        const payload = { componentName, routeName, fields };
        vscode.postMessage({ command: 'createCrudSupport', payload });
      }
    });
  </script>
</body>
</html>`;
}

