import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';


async function findPrismaSchemaRoot(): Promise<string | null> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    return null; // No workspace open
  }

  for (const folder of workspaceFolders) {
    let currentPath = folder.uri.fsPath;

    while (true) {
      const prismaSchemaPath = path.join(currentPath, "prisma", "schema.prisma");

      if (fs.existsSync(prismaSchemaPath)) {
        return currentPath; // ✅ Found root containing prisma/schema.prisma
      }

      // Walk up to parent
      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) {
        break; // reached filesystem root, stop
      }
      currentPath = parentPath;
    }
  }
    return null
  }

  function sortObjectKeys<T>(obj: Record<string, T>): Record<string, T> {
    return Object.fromEntries(
      /*
        "base" ignores case and diacritics (so User, user, Úser, üser all sort together).
        "accent" would keep diacritics (ú vs u) but ignore case.
        "case" would respect case but ignore accents.
        "variant" is the strictest (default) and respects everything.
        numeric sorts asc f10, f2 as f2 f10 not as ascii f10 f2
      */
      Object.entries(obj).sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }))
    );
  }

  // fieldInfo is a line following field names
  type FieldInfo = {
    type: string;
    prismaSetting: string; // everything after the type
  };

  // every model/table has fieldName  and fieldInfo
  type ModelInfo = {
    fields: {
      [fieldName: string]: FieldInfo;
    };
    modelAttributes: string[]; // e.g. ["@@map(\"users\")", "@@index([email])"]
  };

  // there are many models/tables in schema.prisma
  type SchemaModels = {
    [modelName: string]: ModelInfo;
  };

  function parsePrismaSchema(schemaContent: string): SchemaModels {
    const models: SchemaModels = {};
    const modelRegex = /model\s+(\w+)\s*{([^}]*)}/gms;

    let modelMatch;
    while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
    const [, modelName, body] = modelMatch;
    const fields: { [field: string]: FieldInfo } = {};
    const modelAttributes: string[] = [];

    // Remove block comments first
    let bodyWithoutBlocks = body.replace(/\/\*[\s\S]*?\*\//g, "");

    const lines = bodyWithoutBlocks
      .split("\n")
      .map((l) => l.trim().replace(/\s{2,}|\t/gm, ' '))
      .filter(Boolean);

    for (const line of lines) {
      if (line.startsWith("//")) continue; // skip single-line comment

      if (line.startsWith("@@")) {
        modelAttributes.push(line);
        continue;
      }

      const [fieldName, fieldType, ...rest] = line.split(/\s+/);
      if (!fieldName || !fieldType) continue;

      fields[fieldName] = {
        type: fieldType,
        prismaSetting: rest.join(" "),
      };
    }

    models[modelName] = {
      fields: sortObjectKeys(fields),
      modelAttributes,
    };
  }

  return models;
}


let rootPath: string | undefined;
export async function activate(context: vscode.ExtensionContext) {

  const workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace.workspaceFolders;
  const defaultFolderPath: string = '/home/mili/TEST/cr-crud-extension';

  if (!workspaceFolders || workspaceFolders.length === 0) {
    // Check if default path exists
    if (fs.existsSync(defaultFolderPath)) {
      rootPath = defaultFolderPath;
    } else {
      // Fallback to dialog if default path is invalid
      const folderUri: vscode.Uri[] | undefined = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        openLabel: 'Select workspace folder with Prisma/schema.prisma',
        defaultUri: vscode.Uri.file(defaultFolderPath)
      });
      if (!folderUri || folderUri.length === 0) {
        vscode.window.showErrorMessage('No workspace folder selected');
        return;
      }
      rootPath = folderUri[0].fsPath;
    }
  } else {
    rootPath = workspaceFolders[0].uri.fsPath;
  }
  // Create output channel for webview logs
  const outputChannel = vscode.window.createOutputChannel('WebView Logs');

  // vscode.debug.onDidStartDebugSession(session => {
  //   outputChannel.appendLine(`onDidStartDebugSession activated`);
  //   outputChannel.show(true);
  //   if (session.name === "Run Extension (with pak)") {
  //     vscode.commands.executeCommand("cr-crud-extension.createCrudSupport");
  //   }
  // });

  // context.subscriptions.push(
  //   vscode.debug.onDidStartDebugSession(session => {
  //     if (session.name === "Run Extension (with pak)") {
  //       vscode.commands.executeCommand("cr-crud-extension.createCrudSupport")
  //         .then(undefined, err => console.error("Failed to run CRUD support:", err));
  //     }
  //   })
  // );


  // register Create CRUD Support 
  const disposable = vscode.commands.registerCommand('cr-crud-extension.createCrudSupport', () => {
    
    // const workspaceFolders = vscode.workspace.workspaceFolders;
    // outputChannel.appendLine(`workspaceFolders', ${JSON.stringify(workspaceFolders,null,2)}`)
    // outputChannel.show(true);

    const panel = vscode.window.createWebviewPanel(
      'crCrudSupport',
      'Create CRUD Form Support',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    // const nonce = getNonce();
    panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

    panel.webview.onDidReceiveMessage(async (msg) => {
      
      if(msg.command==='readSchema'){

        try {

          const prismaSchemaPath = path.join(rootPath as string, "prisma", "schema.prisma");
          const schemaContent = fs.readFileSync(prismaSchemaPath, "utf-8");

          const parsedSchema = parsePrismaSchema(schemaContent);

          // TODO: parse schemaContent and send back to WebView
          // ---------------------- JSON parser schemaModels via command sendingSchemaModel  ----------------------
          panel.webview.postMessage({
            command: "renderSchema",
            payload: parsedSchema,
          });
          // vscode.window.showErrorMessage('This is a test vscode.window.showErrorMessage');
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to read schema: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
      else if (msg.command === 'createCrudSupport') {
        const { componentName, routeName, fields, embellishments } = msg.payload as {
          componentName: string;
          routeName: string;
          fields: string[];
          embellishments:string[];
        };
        outputChannel.appendLine(`[WebView] createCrudSupport command entry point`);
        outputChannel.show(false);
        // Empty body for now
        outputChannel.appendLine(`[WebView] Received payload:', ${componentName}, ${routeName}, ${fields.join(', ')}, ${embellishments.join(', ')}`);
        outputChannel.show(true);
      }
      else if(msg.command === 'log'){
        // vscode.window.showInformationMessage(`Bane command log ${msg.text}`);
        vscode.window.showInformationMessage(`log ${msg.text}`);
        // log should have at least a text property
        // console.log(`[console.log] ${msg.text}`);
        // Or log to output channel
        outputChannel.appendLine(`[WebView log outputChannel ${msg.text}] `);
        outputChannel.show(true); // false = don't preserve focus
      }
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {

  // Enable scripts in the webview
  webview.options = {
    enableScripts: true,
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
  };

  vscode.window.showInformationMessage('Bane getWebviewContent vscode.Uri!');
  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <style>
    .main-grid {
      display: grid;
      grid-template-columns: 29rem 17rem;
    }

    .grid-wrapper {
      display: grid;
      grid-template-columns: 20rem 8rem;
      column-gap: 0.5rem;
      row-gap: 1rem;
    }

    .span-two {
      grid-column: 1 / span 2;
      text-align: justify;
    }


    #createBtnId {
      width: 12rem;
      padding: 4px 0;
      margin: 1rem 0 0 0;
      padding: 5px 0;
      opacity: 0.8;
    }

    #createBtnId {
      margin-left: 2rem;
    }

    #createBtnId:hover {
      opacity: 1;
    }

    input[type='text'] {
      width: 18rem;
      height: 20px;
      padding: 6px 0 8px 1rem;
      outline: none;
      font-size: 16px;
      border: 1px solid gray;
      border-radius: 4px;
      outline: 1px solid transparent;
      margin-top: 8px;
      margin-bottom: 10px;
    }

    input[type='text']:focus {
      outline: 1px solid gray;
    }

    .left-column {
      grid-column: 1;
    }

    .left-column label,
    .left-column label:focus {
      display: block;
      width: 12rem;
      cursor: pointer;

    }

    .fields-list {
      position: relative;
      cursor: pointer;
    }

    .middle-column {
      position: relative;
      grid-column: 2;
      border: 1px solid gray;
      border-radius: 5px;
      margin-top: 1.45rem;
    }

    .middle-column .candidate-fields-caption {
      position: absolute;
      top: -1.5rem;
      left: 0.5rem;
      color: skyblue;
    }

    .right-column {
      position: relative;
      border: 1px solid gray;
      border-radius: 6px;
      padding: 6px 3px 8px 10px;
      margin-top: 1.5rem;
    }

    .right-column .prisma-model-caption {
      position: absolute;
      top: -1.5rem;
      left: 0.5rem;
      display: inline-block;
      color: skyblue;
    }

    .embellishments {
      position: relative;
      grid-column: span 2;
      display: grid;
      grid-template-columns: 1rem 20rem;

      column-gap: 0.5rem;
      row-gap: 0.7rem;
      align-items: center;
      padding: 8px 1rem;
      border: 1px solid gray;
      border-radius: 6px;
      width: 26.5rem;
      margin-top: 3rem;
    }

    .checkbox-item {
      display: contents;
    }

    .checkbox-item input[type='checkbox'] {
      grid-column: 1;
      justify-self: start;
      align-self: center;
      margin: 0;
    }

    .checkbox-item label {
      grid-column: 2;
      justify-self: start;
      align-self: center;
      cursor: pointer;
      line-height: 1;
    }

    /* for CSS class names inserted as a markup string into innerHTML
      class the names should be defined :global as they are in a new scope
      but WebView CSP Restrictions: VS Code WebViews have strict CSP
      and pseudo classes do not work, though they work in Svelte
    */
    .list-el {
      background-color: skyblue;
      width: max-100%;
      height: 20px;
      font-size: 18px;
      line-height: 18px;
      text-align: center;
      margin: 6px 0 0 0;
    }

    .list-el:hover {
      cursor: pointer;
    }

    .field-text {
      display: block;
      height: 20px;
      text-align: center;
    }

    .remove-hint {
      position: absolute;
      left: 1rem !important;
      z-index: 10;
      font-size: 12px;
      color: red;
      padding: 0 0.5rem 1px 0.5rem;
      background-color: cornsilk;
      opacity: 0;
      text-align: center;
      border: 1px solid lightgray;
      border-radius: 5px;
      transition: opacity 0.2s;
      pointer-events: none;
      white-space: nowrap;
    }

    .list-el:hover .remove-hint {
      opacity: 1;
    }

    .models-list {
      border: 1px solid gray;
    }

    .models-list ul {
      color: navy;
    }

    .models-list ul li {
      color: yellow;
    }

    .model-name {
      color: skyblue;;
      border-bottom: 1px solid lightgray;
      margin-top: 3px;
      width: calc(100% -1rem);
      // border-radius: 6px;
      padding-left: 1rem;
      cursor: pointer;
    }

    .fields-column {
      display: grid;
      grid-template-columns: 7rem 7rem;
      column-gap: 5px;
      width: max-content;
      padding: 6px 0 6px 1rem;
      max-height: 10rem;
      overflow-y: auto;
      font-family: Georgia, 'Times New Roman', Times, serif;
      font-size: 15px !important;
      font-weight: 500 !important;
    }

    .fields-column p {
      margin: 4px 0 0 0;
      padding: 2px 0 0 4px 6pc;
      border-bottom: 1px solid lightgray;
      text-wrap: wrap;
      }
      
      .fields-column p:nth-child(odd) {
        color: skyblue;
        // color: navy;
        cursor: pointer;
        width: 100%;
        padding: 2px 0 2px 0.5rem;
      }

    .fields-column p:nth-child(even) {
      color: lightgreen;
      font-weight: 400 !important;
      font-size: 12px !important;
    }
  </style>

</head>

<div>
  <h2 style='margin-left:8rem;'>Create CRUD Support</h2>

  <div class='main-grid'>
    <div class='grid-wrapper'>
      <div class="span-two">
        To create a UI Form for CRUD operations against the underlying ORM specify
        its component name and create a field list by entering field names in the
        Field Name pressing Enter. The +page.svelte with accompanying
        +page.server.ts will be created in route specified in the Route Name
      </div>

      <div class='left-column'>
        <label for="componentNameId">Component UI Form Name
          <input id="componentNameId" type="text" />
        </label>

        <label for="routeNameId">Route Name
          <input id="routeNameId" type="text" />
        </label>
        <label for="fieldNameId">Field Name
          <input id="fieldNameId" type="text" value='password' />
        </label>
        <button id="createBtnId" disabled>Create CRUD Support</button>
      </div>

      <div class='middle-column'>
        <span class='candidate-fields-caption'>Candidate Fields</span>
        <div class="fields-list" id="fieldsListId"></div>
        <p id="removeHintId" class='remove-hint'>click to remove</p>
      </div>


      <div class="embellishments">
        <div class="checkbox-item">
          <input id="CRInput" type="checkbox" />
          <label for="CRInput">CRInput component</label>
        </div>
        <div class="checkbox-item">
          <input id="CRSpinner" type="checkbox" />
          <label for="CRSpinner">ButtonSpinner component</label>
        </div>
        <div class="checkbox-item">
          <input id="CRActivity" type="checkbox" />
          <label for="CRActivity">PageTitleCombo component</label>
        </div>
        <div class="checkbox-item">
          <input id="CRTooltip" type="checkbox" />
          <label for="CRTooltip">Tooltip component</label>
        </div>
        <div class="checkbox-item">
          <input id="CRSummaryDetail" type="checkbox" />
          <label for="CRSummaryDetail">Summary/Details component</label>
        </div>
      </div>
    </div>
    <div class='right-column'>
      <span class='prisma-model-caption'>Select Fields from Prisma Model</span>
      <div id="schemaContainer">
      </div>
    </div>
  </div>
</div>
</body>
<script>
  /*
    type FieldInfo = {
        type: string;
        prismaSetting: string; // everything after the type
      };
  
      // every model/table has fieldName  and fieldInfo
      type ModelInfo = {
        fields: {
          [fieldName: string]: FieldInfo;
        };
        modelAttributes: string[]; // e.g. ["@@map(\"users\")", "@@index([email])"]
      };
  
      // there are many models/tables in schema.prisma
      type SchemaModels = {
        [modelName: string]: ModelInfo;
      };
  */
  let tablesModel = 'waiting for schemaModels '
  const vscode = acquireVsCodeApi()

  function selectField(event) {
    const el = event.target
    const fieldName = el.innerText
    if (el.style.color === 'navy' && !fields.includes(fieldName)) {
      renderField(fieldName)
    }
  }

  const enterEvent = new KeyboardEvent('keyup', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true
  })

  function renderParsedSchema(parsedSchemaModelsSchema) {
    console.log('renderParsedSchema entry point')
    const schemaModels = parsedSchemaModelsSchema;
    let container = document.getElementById('schemaContainer')
    let markup = ''
    try {
      let markupFields = ''
      for (const [modelName, theFields] of Object.entries(schemaModels)) {
        for (const [fields, modelAttributes] of Object.entries(theFields)) {
          let m = ''
          for (const [fieldName, { type, prismaSetting }] of Object.entries(modelAttributes)) {
            if ('0|1'.includes(fieldName)) continue
            if (prismaSetting.includes('@default') || prismaSetting.includes('@updatedAt')) {
              m += \`<p>\${fieldName}</p><p>type:\${type} <span style='color:pink'>\${prismaSetting ?? 'na'}</span></p>\`
            }else{
              m += \`<p>\${fieldName}</p><p>type:\${type} \${prismaSetting ?? 'na'}</p>\`
            }
          }
          markupFields += m
        }
        markup += \`<details>
          <summary class='model-name'>\${modelName}</summary>
          <div class='fields-column'>\${markupFields}</div>
          </details>\`
      }
    } catch (err) {
      console.log('renderSchema', err)
    }
    container.innerHTML = markup
    container.addEventListener('click', (event) => {
      const el = event.target
      const fieldName = el.innerText
      if (el.tagName === 'P' && el.nextSibling.tagName === 'P' && !fields.includes(fieldName)) {
        const savedEntry = fieldNameEl.value
        fieldNameEl.value = fieldName
        fieldNameEl.dispatchEvent(enterEvent)
        fieldNameEl.value = savedEntry
      }
    })
  }

  // Request schema
  vscode.postMessage({ command: 'readSchema' })

  // Receive schema from extension
  window.addEventListener("message", event => {
    const message = event.data;
    console.log('WebView called from Extension')
    if (message.command === 'renderSchema') {
      console.log('WebView is calling renderParsedSchema')
      renderParsedSchema(message.payload)
    }
  })


  // FieldsList elements inline style as they are crated dynamically via innerHTML
  const listElCSS = 'color:black; font-weight: 500; background-color: skyblue; margin: 2px 0 0 0;'
  let componentName = ''
  let routeName = ''
  // its data-filed-index and read via el.getAttribute('data-field-index')
  // or using camel case variable name replacing 'data-' with .dataset. property
  // el.dataset.fieldIndex where -i in capitalized just Index
  let fields = []
  const getUniqueId = () => {
    // convert to a string of an integer from base 36
    return Math.random().toString(36).slice(2)
  }
  const removeHintEl = document.getElementById('removeHintId')
  removeHintEl.style.opacity = '0'
  const scroll = (el) => {
    if (
      el.offsetHeight + el.scrollTop >
      el.getBoundingClientRect().height - 20
    ) {
      setTimeout(() => {
        el.scrollTo(0, el.scrollHeight)
      }, 0)
    }
  }
  const disableCreateButton = () => {
    createBtnEl.disabled = !fields.length || !routeName || !componentName
  }
  const componentNameEl = document.getElementById('componentNameId')
  const routeNameEl = document.getElementById('routeNameId')
  const fieldNameEl = document.getElementById('fieldNameId')

  const fieldsListEl = document.getElementById('fieldsListId')
  const createBtnEl = document.getElementById('createBtnId')

  componentNameEl.addEventListener('input', (e) => {
    componentName = e.target.value
    if (componentName.length > 0) {
      componentName = componentName[0].toUpperCase() + componentName.slice(1)
      componentNameEl.value = componentName
    }
    disableCreateButton()
  })
  routeNameEl.addEventListener('input', (e) => {
    routeName = e.target.value
    disableCreateButton()
  })

  if (fieldNameEl) {
    fieldNameEl.addEventListener('keyup', (event) => {
      // vscode.postMessage({ command: 'log', text: 'fieldNameEl.addEventListener created' })
      const v = fieldNameEl.value.trim()
      if (!v) {
        // vscode.postMessage({ command: 'log', text: 'field is empty' })
        return
      }
      if (fields.includes(v)) {
        setTimeout(() => {
          fieldNameEl.style.color = 'red'
        }, 0)
        return
      }
      if (fieldNameEl.style.color === 'red') {
        fieldNameEl.style.color = 'black'
      }
      if (event.key !== 'Enter') return
      fields.push(v)
      disableCreateButton()
      renderField(v)
      fieldNameEl.value = ''
      scroll(fieldsListEl)
    })
  }

  // we do not clear all the entries and rebuild from the fields
  // but just add a newly entered in the Field Name fieldNameId
  function renderField(fieldName) {

    const fieldNameFromIndex = (index) => {
      const listEls = fieldsListEl.querySelectorAll('.list-el')
      let name = ''
      // forEach 
      listEls.forEach(listEl => {
        if (listEl.dataset.fieldIndex === index) {
          name = listEl.firstChild.innerText
        }
      })
      return name
    }

    // Create elements
    const div = document.createElement('div')
    const span = document.createElement('span')

    // Set attributes and content
    div.className = 'list-el'
    div.dataset.fieldIndex = getUniqueId()
    div.style.setProperty('--hover-display', 'none')
    div.style.cssText = listElCSS

    span.className = 'field-text'
    span.textContent = fieldName

    // Append structure
    div.appendChild(span)
    fieldsListEl.appendChild(div)

    // so getBoundingClientRect() can be destructured
    // const { x, y } = fieldsListEl.getBoundingClientRect()
    setTimeout(() => {
      const listEls = fieldsListEl.querySelectorAll('.list-el')
      listEls.forEach(el => {
        el.addEventListener('mouseenter', () => {
          removeHintEl.style.top = String(el.offsetTop - el.offsetHeight) + 'px'
          removeHintEl.style.left = String(el.offsetLeft + 12) + 'px'
          removeHintEl.style.opacity = '1'
        })

        el.addEventListener('mouseleave', () => {
          removeHintEl.style.opacity = '0'
        })

        el.addEventListener('click', () => {
          removeHintEl.style.opacity = '0'

          if (fieldNameEl.value === '') {
            fieldNameEl.value = el.innerText
            fieldNameEl.focus()
          }
          const index = el.dataset.fieldIndex
          const fieldName = fieldNameFromIndex(index)
          fields = fields.filter(el => el !== fieldName)
          el.remove()
        })
      })
    }, 400)
  }
  const selectedCheckboxes = () => {
    // Get all checkboxes in the document
    const checkboxes = document.querySelectorAll('input[type="checkbox"]')
    // Array of checked checkbox IDs only
    return Array.from(checkboxes)
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.id)
  }

  createBtnEl.addEventListener('click', () => {
    if (componentName && routeName && fields.length) {
      const payload = { componentName, routeName, fields, embellishments: selectedCheckboxes() }
      vscode.postMessage({ command: 'createCrudSupport', payload: payload })
      // console.log('payload', payload)
    }
  })
</script>
</body>

</html>`;
}

