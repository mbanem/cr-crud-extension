import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let rootPath: string | undefined;
let routeName_ ='';
let fields_:string[]=[];
let embellishments_:string[]=[];
function ensureComponentPath(){
  console.log('embellishments_', embellishments_)
  try{
    const componentsPath = path.join(rootPath as string, '/src/lib/components');
    if (!fs.existsSync(componentsPath)) {
      fs.mkdirSync(componentsPath, { recursive: true });
    }
    return componentsPath;
  }catch(err){
    console.log(err)
    return false;
  }
}

function noType(name: string){
  return name.match(/([a-zA-z0-9_]+)\:?.*/)?.[1]
}
let buttons = `<div class='buttons'>
  `;
function buttons_(){
  const spinner: boolean = embellishments_.includes('CRSpinner');
  ['create', 'update', 'delete'].forEach((caption) => {
    console.log('buttons_()', caption)
    const cap = caption[0].toUpperCase() + caption.slice(1)
    if(spinner){
      buttons += `<CRSpinner
        bind:this={btn${cap}}
        spinOn={loading}
        caption=${caption}
        formaction="?/${caption}"
        disabled={!formDataValid()}
        hidden={false}
      >
      </CRSpinner>
      `
    }else{
      buttons += `<button bind:this={btn${cap}} name="${caption}" formaction="?/${caption}">${caption}</button>
      `
    }
      buttons + `</div>
      `
    })
}

function inputBox(fName:string){
  const name = noType(fName)
  if (embellishments_.includes('CRInput')){
    return `<CRInput title="${name}"
      exportValueOn="enter|blur"
      capitalize={true}
      bind:value={snap.${name}}
      required={true}
    >
    </CRInput>
    `
  }
  return `<input type="hidden" name="${name}" bind:value={snap.${name}} />
  `
}
function submitFunc(){
  return
}
function createFormPage(){
  const pPagePath = path.join(rootPath as string, `/src/routes/${routeName_}`);
  if (!fs.existsSync(pPagePath)) {
    fs.mkdirSync(pPagePath, { recursive: true });
  }
    let TFormData = `type TFormData = {
    id: String;
    `
  let inputBoxes = inputBox('Id')
  
  let data = `
  let snap = $state<TFormData>({
    id: '',
    `
  fields_.forEach(fName=>{
    TFormData += `${fName};
    `
    data += `${noType(fName)}: '',
    `
    inputBoxes += inputBox(fName)
  
  })
  let imports= ''
  embellishments_.forEach(comp => {
    imports += `import ${comp} from '$lib/components/${comp}.svelte';
  `
  })
  let markup = `<script lang="ts">
  import type { Snapshot } from '../$types';
  import { onMount } from 'svelte';
  import type { PageData, ActionData } from './$types';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/state'; // for page.status code on actions

  import * as utils from '$lib/utils';
  ` + imports + TFormData + `}` + data + `});

  type ARGS = {
    data: PageData;
    form: ActionData;
  };
  let { data, form }: ARGS = $props();
  let loading = $state<boolean>(false); // toggling the spinner
  let btnCreate: HTMLButtonElement;
  let btnUpdate: HTMLButtonElement;
  let btnDelete: HTMLButtonElement;
  let iconDelete: HTMLSpanElement;

  const clearMessage = () => {
    setTimeout(() => {
      result = '';
    }, 2000);
  };

  const capitalize = (str:string) => {
    const spaceUpper = (su:string) => {
      return \` \${su[1]?.toUpperCase()}\`
    }
    
    return str
    .replace(/(_\\w)/, spaceUpper)
    .replace(/\\b[a-z](?=[a-z]{2})/g, (char) => char.toUpperCase())
  }

  const routeName = capitalize(document.getElementById('routeNameId').value);

  function noType(name: string){
    return name.match(/([a-zA-z0-9_]+)\:?.*/)?.[1]
  }

  let formDataValid = $derived.by(() => {
    fields.forEach(fName => {
      const name = noType(fName);
      if (!snap[name]){
        return false;
      }
    })
    return true;
  });

  const clearForm = (event?: MouseEvent | KeyboardEvent) => {
    event?.preventDefault();
    fields.forEach(fName => {
      const name = noType(fName);
      snap[name] = ''
    });
    utils.hideButtonsExceptFirst([btnCreate, btnUpdate, btnDelete]);
  };` + `
  
  const enhanceSubmit: SubmitFunction = async ({ action, formData }) => {
    const required:string[] = [];
    fields.forEach(fName => {
      const name = noType(fName)
      if(!formData.get(name)){
        const req = ' -- '+ name +' is required';
        const el = document.querySelector('[title="' + name +'"]')
        if (el){
          (el as HTMLInputElement).placeholder += req;
          required.push(req.slice(4))
        }
      }
    })
    if (required.join('').length){
      return;
    }
    // form is valid 
    loading = true; // start spinner animation

    result =
      action.search === '?/create'
        ? 'creating \`\${routeName}\`...'
        : action.search === '?/update'
          ? 'updating \`\${routeName}\`...'
          : 'deleting \`\${routeName}\`...';
    if (action.search === '?/delete') {
      hideButtonsExceptFirst([btnDelete, btnCreate, btnUpdate]);
    }

    return async ({ update }) => {
      await update();

      if (action.search === '?/create') {
        result = page.status === 200 ? '\`\${routeName}\` created' : 'create failed';
      } else if (action.search === '?/update') {
        result = page.status === 200 ? '\`\${routeName}\` updated' : 'update failed';
      } else if (action.search === '?/delete') {
        result = page.status === 200 ? '\`\${routeName}\` deleted' : 'delete failed';
        iconDelete.classList.toggle('hidden');
        hideButtonsExceptFirst([btnCreate, btnUpdate, btnDelete]);
      }
      invalidateAll();
      await utils.sleep(1000);
      loading = false; // stop spinner animation
      clearForm();
      hideButtonsExceptFirst([btnCreate, btnUpdate, btnDelete]);
      clearMessage();


  ${buttons_()}
  </script>
  <form action="?/create" method="post" use:enhance={enhanceSubmit}>
    <div class="buttons">
    ${inputBoxes}
    ${buttons}<button onclick={clearForm}>clear form</button>
    </div>
  </form>
  `
  const filePath = path.join(pPagePath as string, '+page.svelte');
  fs.writeFileSync(filePath, markup, 'utf8');
}
function createUtils(routeName:String, fields:string[]) {

  const utils = `export const sleep = async (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // ms here is a dummy but required by
      // resolve to send out some value
      resolve(ms)
    }, ms)
  })
}
  
  export const resetButtons = (buttons: HTMLButtonElement[]) => {
  try {
    buttons.forEach((btn) => {
      btn.classList.remove('hidden')
      btn.classList.add('hidden')
      try {
        btn.hidden = true
      } finally {
      }
    })
  } catch { }
}
  
  export const hideButtonsExceptFirst = (buttons: HTMLButtonElement[]) => {
  resetButtons(buttons);
  if (buttons[0] && buttons[0].classList.contains('hidden')) {
    buttons[0].classList.toggle('hidden')
    buttons[0].hidden = false
  }
}`

  const utilsPath = path.join(rootPath as string, '/src/lib/utils');
  if (!fs.existsSync(utilsPath)) {
    fs.mkdirSync(utilsPath, { recursive: true });
  }
  let filePath = path.join(utilsPath, 'crHelpers.ts')
  fs.writeFileSync(filePath, utils, 'utf8');

  const content = "export * from '/home/mili/TEST/cr-crud-extension/src/lib/utils/crHelpers';";
  filePath = path.join(utilsPath, 'index.ts')
  fs.writeFileSync(filePath, content, 'utf8');
}

function createCRInput(){
  const componentsPath = ensureComponentPath()
  if (!componentsPath) return
  const crInput = `<script lang="ts">
  type TExportValueOn =
    | 'keypress'
    | 'keypress|blur'
    | 'enter'
    | 'blur'
    | 'enter|blur';
  import { browser } from '$app/environment';
  import * as utils from '$lib/utils';
  import { onMount } from 'svelte';

  type PROPS = {
    title: string;
    width?: string;
    height?: string;
    fontsize?: string;
    margin?: string;
    type?: string;
    value?: string;
    required?: boolean;
    capitalize?: boolean;
    err?: string[] | undefined;
    onButtonNext?: () => void;
    exportValueOn?: TExportValueOn;
    onInputIsReadyCallback?: () => void; // call parent when onInputIsReadyCallback for 'enter', otherwise on every key
    clearOnInputIsReady?: boolean; // clear input value on onInputIsReadyCallback
  };

  let {
    title,
    width = '16rem',
    height = '2.5rem',
    fontsize = '16px',
    margin = '0',
    type,
    value = $bindable(),
    required = false,
    err = undefined,
    onButtonNext,
    exportValueOn = 'enter',
    onInputIsReadyCallback = undefined,
    capitalize = false,
    clearOnInputIsReady = false,
  }: PROPS = $props();

  // make capitalizes as capitalize is already defined in $Props()
  const capitalizes = (str: string): string => {
    try {
      // if this is not field name but an information message
      if (str.split(' ').length > 3) return str;
      // @ts-expect-error
      str = str.capCamelCase();
      const arr = str.match(/\s+/g);
      if (!arr || arr.length > 3) return str;
    } catch (err) {
      console.log('capitalizes', err);
    }
    return str;
  };
  // NOTE: enter non breaking unicode space: type 00A0 and press Alt + X
  // here we held between apostrophes three non breaking spaces
  title = '   ' + capitalizes(title);
  let requiredStr = required ? \`\${title} is required\` : '';

  (function () {
    // IIFE
    exportValueOn = exportValueOn.toLowerCase() as TExportValueOn;
    // make combination be with 'enter|blur' and 'keypress|blur' if inverted
    const parts = exportValueOn.split('|');
    if (parts.length > 1 && parts[0] === 'blur') {
      exportValueOn = \`\${parts[1]}|\${parts[0]}\` as TExportValueOn;
    }
  })();
  const topPosition = \`\${-1 * Math.floor(parseInt(fontsize) / 3)}px\`;

  // allow pre-defined values to show up when user specify them
  let inputValue = $state<string>('');

  if (browser) {
    try {
      utils.setCSSValue('--INPUT-BOX-LABEL-TOP-POS', topPosition);
      if (width) utils.setCSSValue('--INPUT-COMRUNNER-WIDTH', width as string);
      if (height)
        utils.setCSSValue('--INPUT-COMRUNNER-HEIGHT', height as string);
      if (fontsize)
        utils.setCSSValue('--INPUT-COMRUNNER-FONT-SIZE', fontsize as string);
      width = utils.getCSSValue('--INPUT-COMRUNNER-WIDTH') as string;
    } catch (err) {
      console.log('<InputBox get/setCSSValue', err);
    }
  }

  const onFocusHandler = (event: FocusEvent) => {
    event.preventDefault();
    labelStyle = 'opacity:1;top:3px;';
  };

  const onBlurHandler = (event: FocusEvent) => {
    event.preventDefault();

    // no entry yet so no export is ready buy is dirty -- only handle placeholder if entry is required
    if (inputValue === '') {
      // input is required so warn the user with pink placeholder required message
      if (required) {
        inputEl.placeholder = requiredStr;
        labelStyle = 'opacity:1; top:3px;';
        utils.setPlaceholderColor('pink');
      } else {
        // input is not required so lower down field label inside the input box
        labelStyle = 'opacity:0.5;25px';
      }
    }
    if (exportValueOn.includes('blur')) {
      value = inputValue;
      if (onInputIsReadyCallback) {
        onInputIsReadyCallback();
      }
    }
  };
  const onKeyUpHandler = (event: KeyboardEvent) => {
    event.preventDefault();
    if (event.key === 'Tab') return;
    if (capitalize) {
      // NOTE: reactive variable inputbox value does not updates
      // inputbox value when changed via script, so inputEl.value
      // as a workaround is updated instead
      inputEl.value = utils.capitalize(inputValue);
    }
    // if keypress is Enter and exportValueOn does not include Enter we return
    if (exportValueOn.includes('enter') && event.key !== 'Enter') {
      if (capitalize && inputValue) {
        // inputValue = capitalizes(inputValue);
        inputValue = utils.capitalize(inputValue);
      }
      return;
    }
    // already prevented blur|keypress and blur|enter
    // blur always follows if any case
    if (!'keypress|blur|enter|blur'.includes(exportValueOn)) {
      inputValue = capitalizes(inputValue);
      return;
    }
    if (inputValue && inputValue.length > 0) {
      if (capitalize) {
      }

      // if input should be returned
      // (blur is handled in a separate onBlurHandler)
      if (
        exportValueOn.includes('keypress') ||
        (exportValueOn.includes('enter') && event.key === 'Enter')
      ) {
        value = inputValue;

        if (onInputIsReadyCallback) {
          onInputIsReadyCallback();
          if (clearOnInputIsReady) {
            inputValue = '';
          }
        }
      }
    }
  };

  // input box has a label text instead of a placeholder in order to
  // move it up on focus, but the text does not set focus on input
  // element on click -- so we have to set the focus when the label
  // text is selected
  let labelStyle = $state('opacity:0.5;top:25px;');
  let label: HTMLLabelElement;
  let inputEl: HTMLInputElement;
  export const setFocus = () => {
    inputEl.focus();
  };

  // parent call to set input box value
  export const setInputBoxValue = (str: string, blur: boolean = false) => {
    if (blur) {
      setTimeout(() => {
        inputEl.blur();
      }, 1000);
    }
    inputEl.focus();
    inputValue = str;
  };
  onMount(() => {
    label = document.getElementsByTagName('label')[0] as HTMLLabelElement;
  });
</script>

<div class="input-wrapper" style="margin:{margin};">
  <input
    bind:this={inputEl}
    type={type ? type : 'text'}
    required
    bind:value={inputValue}
    onkeyup={onKeyUpHandler}
    onfocus={onFocusHandler}
    onblur={onBlurHandler}
    disabled={false}
  />
  <label for="" onclick={setFocus} aria-hidden={true} style={\`\${labelStyle}\`}>
    {title}
    <span class="err">
      {err ? \` - \${err}\` : ''}
    </span>
  </label>
</div>

<style lang="scss">
  :root {
    --INPUT-COMRUNNER-WIDTH: 16rem;
    --INPUT-BOX-LABEL-TOP-POS: -1px;
    --INPUT-COMRUNNER-HEIGHT: 2.5rem;
    --INPUT-COMRUNNER-FONT-SIZE: 16px;
  }

  .input-wrapper {
    position: relative;
    width: max-content;
    padding-top: 0.8rem;
    label {
      position: absolute;
      left: 15px;
      font-size: var(--INPUT-COMRUNNER-FONT-SIZE);
      color: var(--INPUT-COLOR);
      background-color: var(--INPUT-BACKGROUND-COLOR);
      transition: 0.5s;
    }
    input {
      display: inline-block;
      width: var(--INPUT-COMRUNNER-WIDTH);
      height: var(--INPUT-COMRUNNER-HEIGHT);
      font-size: var(--INPUT-COMRUNNER-FONT-SIZE);
      padding: 0 10px;
      margin: 0;
      color: var(--TEXT-COLOR);
      &:focus {
        color: var(--INPUT-FOCUS-COLOR);
      }
      &:focus ~ label,
      &:valid ~ label {
        top: var(--INPUT-BOX-LABEL-TOP-POS);
        font-size: var(--INPUT-COMRUNNER-FONT-SIZE);
        opacity: 1;
      }
    }
  }

  .err {
    color: pink;
    padding: 1px 0.5rem;
  }
</style>
`
  const crInputPath = path.join(componentsPath, 'CRInput.svelte')
  fs.writeFileSync(crInputPath, crInput, 'utf8');
}

function createCRSpinner(){
  const componentsPath = ensureComponentPath()
  if (!componentsPath) return
  const crSpinner = `<!--
@component
	CRSpinner wraps an HTMLButtonElement named button, so it could be bound to a parent variable say
    let btnCreate:HTMLButtonElement
  <CRSpinner bind:button={btnCreate} ...><CRSpinner>
  and it is the only way to get reference to the embedded button.
  There is no way for now to get reference via document.querySelector('CRSpinner')
  or document.getElementsByTagName('CRSpinner')[0]

	CRSpinner component features a 3/4 circle skyblue spinner. In order to start and stop spinning its spinOn
	property should be bound to a parent boolean variable, e.g. let loading:boolean = false (not a $state rune)
	Spin starts when loading is set to true and stops when it is false
	Mandatory props are 
		- caption     -- a button title
    - spinOn      -- boolean controlling spin on/off  with loading true/false
    - button      -- a parent variable bound to internal CRSpinner button via parent code like
										import CRSpinner from '$lib/components/CRSpinner.svelte'
										let btnCreate:HTMLButtonElement
										let cursor:boolean           -- true set it to 'pointer', false to 'not allowed'
										let loading:boolean = false  -- keep spinner idle until loading = true
										let hidden:boolean = true    -- hidden until conditionally visible, 
																										false for initially visible buttons like Create Todo
																										All buttons should be visible only when applicable
										Property formaction is defined for SvelteKIt enhance with URL actions like
										'?/createTodo', '?/updateTodo', '?'deleteTodo'. '?/toggleTodoCompleted',...
										so formaction='?/createTodo' would submit form data to action in +page.server.ts
										export const actions: Actions = {
										createTodo: async ({ request }) => { ...
										Property cursor is optional and is used to warn user for action not allowed
										<CRSpinner 
												bind:button={btnCreate} 
												caption='Create Todo' 
												spinOn={loading}
												hidden={hidden}
												/* optional */
												cursor={cursor}   		/* default is true (pointer) false for 'not allowed'
												width='6rem'      		/* max-content + padding='4px 1.5rem  -- default, */
																							/* or other values iin units like px */
												height='2rem'     		/* default, but could be specified in values of other units e,g, px */
												top='0'				    		/* adjust position:absolute of spinner to get along with button's hight */
												color='skyblue'   		/= but could be rgba, hsa or #xxxxxx forma as well */
												spinnerSize='1.3rem'	/* spinner circle diameter, default is 1em but could be different */
											  duration='3s'     		/* duration in seconds for one RPM, default is 1.5s */
										>
										</CRSpinner>
-->
<script lang="ts">
  export type TButtonSpinner = HTMLButtonElement & CRSpinner;

  type TProps = {
    caption: string;
    button: HTMLButtonElement;
    spinOn: boolean;
    formaction?: string;
    hidden?: boolean;
    disabled?: boolean;
    cursor?: boolean;
    color?: string;
    duration?: string;
    spinnerSize?: string;
    top?: string;
    width?: string;
    height?: string;
  };
  let {
    caption = 'button',
    button = $bindable(),
    formaction,
    spinOn,
    hidden = $bindable(true),
    disabled = $bindable(false),
    cursor = $bindable(true),
    color = \`skyblue\`,
    duration = \`1.5s\`,
    spinnerSize = \`1em\`,
    top = \`0\`,
    width = 'max-content',
    height = '2rem',
  }: TProps = $props();
</script>

{#snippet spinner(color: string)}
  <!-- styling for a spinner itself -->
  <div
    class="spinner"
    style:border-color="{color} transparent {color}
    {color}"
    style="--duration: {duration}"
    style:text-wrap="nowrap !important"
    style:width={spinnerSize}
    style:height={spinnerSize}
    style:top={Number(height) / 2}
  ></div>
{/snippet}

<p style="position:relative;margin:0;padding:0;">
  <!-- styling for an embedded button -->
  <button
    bind:this={button}
    type="submit"
    class:hidden
    {formaction}
    {disabled}
    style:cursor={cursor ? 'pointer' : 'not-allowed'}
    style:width
    style:height
    style:top={Number(height) / 2}
    style:padding="4px 1.5rem"
  >
    {#if spinOn}
      <!-- NOTE: must have ancestor with position relative to get proper position -->
      {@render spinner(color)}
    {/if}
    {caption}
  </button>
</p>

<style>
  .spinner {
    position: absolute;
    display: inline-block;
    vertical-align: middle;
    margin: 0 4pt;
    border-width: calc(1em / 4);
    border-style: solid;
    border-radius: 50%;
    animation: var(--duration) infinite rotate;
    position: absolute;
    left: 0;
    /* top: 0.5rem !important; */
  }
  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }
  .hidden {
    display: none;
  }
</style>
`
  const crSpinnerPath = path.join(componentsPath, 'CRSpinner.svelte')
  fs.writeFileSync(crSpinnerPath, crSpinner, 'utf8');
}

function createCRActivity(){
  const componentsPath = ensureComponentPath()
  if (!componentsPath) return
  const crActivity = `<script lang="ts">
  import { onMount } from 'svelte';

  type ARGS = {
    PageName: string;
    user: UserPartial;
    users: UserPartial[] | [];
    selectedUserId: string;
    result: string;
  };
  let {
    PageName,
    result = $bindable(),
    selectedUserId = $bindable(),
    user,
    users,
  }: ARGS = $props();

  if (users.length === 0) {
    users[0] = user as UserPartial;
  }
  // svelte-ignore non_reactive_update
  let msgEl: HTMLSpanElement;
  // svelte-ignore non_reactive_update
  let selectBox: HTMLSelectElement;
  let timer: NodeJS.Timeout | string | number | undefined; //ReturnValue<typeof setTimeout>;
  const killTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
  const scheduleClearMessage = () => {
    killTimer();
    timer = setTimeout(() => {
      result = '';
      if (msgEl) {
        msgEl.innerText = '';
      }
    }, 2000);
  };
  const showResult = () => {
    scheduleClearMessage();
    return result;
  };
  let [userName, role] = $derived.by(() => {
    let aUser = users.filter((u) => u.id === selectedUserId)[0] as UserPartial;
    if (aUser) {
      return [\`\${aUser?.firstName} \${aUser?.lastName}\`, aUser.role];
    } else {
      return [\`\${user.firstName} \${user.lastName}\`, user.role];
    }
  });
  // $effect(() => {
  //   selectBox.value = selectedUserId.slice(0, -2);
  // });

  onMount(() => {
    selectedUserId = user.id as string;
    // if (selectBox) {
    //   selectBox.value = selectedUserId;
    // }
  });
</script>

<!-- <pre>{JSON.stringify(users, null, 2)}</pre> -->
<h1>
  {PageName} Page
  {#if user?.role === 'ADMIN'}
    <select bind:this={selectBox} bind:value={selectedUserId}>
      <!-- <option value="x" selected={true}>Select an Author</option> -->
      {#each users as the_user}
        <option value={the_user.id}>
          {the_user.firstName}
          {the_user.lastName}
        </option>
      {/each}
    </select>
  {/if}
  <span class="user-name">{userName} {role}</span>
  <span class="user_name"
    >(logged-in {user.firstName} {user.lastName}--{user.role})</span
  >
  {#key result}
    {#if result !== ''}
      <span bind:this={msgEl} class="message">{showResult()}</span>
    {/if}
  {/key}
</h1>

<style lang="scss">
  h1 {
    display: flex;
    gap: 1rem;
    align-items: baseline;
    margin-left: 1rem;
    .message,
    .user-name,
    .user_name {
      display: inline-block;
      font-size: 14px;
      font-weight: 100;
      color: lightgreen;
      margin-left: 1rem;
    }
    .user_name {
      color: skyblue;
    }
  }
</style>
`

  const crActivityPath = path.join(componentsPath, 'CRActivity.svelte')
  fs.writeFileSync(crActivityPath, crActivity, 'utf8');
}

function createCRTooltip(){
  const componentsPath = ensureComponentPath()
  if (!componentsPath) return
  const crTooltip = `<!-- 
@component
CRTooltip could accept the following props, though all are optional
  type TProps = {
    delay?: number;                 // transform params delay duration and baseScale
    duration?: number;
    baseScale?: number;

    caption?: string;               // caption, a string, and panel snippet are mutually exclusive.
                                    // The caption string can be styled by CSS style string or a class name
                                    // sent as captionCSS prop. When both panel and caption are specified 
                                    // inside the props the caption string is ignored

    captionCSS?: string;            // user styling as a CSS class name or a style string applied e.g. captionCSS='caption-class'
                                    // with :global(.caption-class){...} or with a style captionCSS='font-size:14px; color:orange;'
                                    // CRTooltip has a default caption CSS class .caption-default that can be overridden
                                    // by sending a class name or style string via captionCSS prop.

                                    // When the parent page have several hovering elements that uses the same styling avoid
                                    // repeating <Tooltip captionCSS="caption-class" ...> for each hovering element
                                    // but define var props structure that includes several common props along with caption-class
                                    // and spread it via {...props} inside <Tooltip {...props} ...> for each
                                    // hovering element that uses the same styling

    panel?: TPanel;          // A snippet object defined by parent page and sent as object name to a component via $props().
                                    // If caption and panel snippet name are both specified the caption is ignored
                                    // e.g. for {#snippet userDetails(user)} we specify $props()
                                    // panel={userDetails}   -- a function reference, not as a string panel="userDetails"
    panelArgs?: TPanelArgs;         // When panel accepts arguments the parent page sends to the Tooltip component panelArgs prop
                                    // as an array of arguments to be forwarded to the panel snippet
                                    // For instance for userDetails snippet defined as
                                    //      {#snippet userDetails([fName, lName, isAdmin]: [string, string, boolean])}
                                    // where args are sent as a tuple (an array of fixed length with item types)
                                    // the parent page sends panelArgs={['John:', 'Doe', true]} to the Tooltip component
                                    // and the Tooltip component forwards it to the userDetails snippet when rendering it
                                    //      {@render runtimePanel?.(panelArgs)} 

    children?: Snippet;             // Any HTML markup content between <Tooltip> children... </Tooltip> tags.
                                    // Children is a hovering element triggering tooltip visibility via mouseenter/mouseleave
                                    // so children HTML markup is usually encapsulated in a single HTML hovering element

    preferredPos?: string;          // When, due to scrolling, there is a lack of space around the hovering element CRTooltip
                                    // tries to find an available space following the recommended sequence by the preferredPos
                                    // prop string or, if not specified, by the default one 'top,left,right,bottom'
    
    toolbarHeight?: number          // If a page has a toolbar in layout its height would impact calculation of the proper
                                    // tooltip top position required by preferredPos, so its height should be sent via props.
                                    // Not only toolbar but the other styling including layout and styling of children block
                                    // defined in layout. So try to find the exact value otherwise tooltip in the top position
                                    // could be clipped on its top part 

  };

-->

<script lang="ts">
  import { type Snippet, onMount } from 'svelte';
  import { cubicInOut } from 'svelte/easing'; // for animated transition
  import type { EasingFunction } from 'svelte/transition';

  // fade scale animation for displaying/hiding tooltip
  export interface FadeScaleParams {
    delay?: number;
    duration?: number;
    easing?: EasingFunction;
    baseScale?: number;
    translateX?: string;
    translateY?: string;
  }

  const fadeScale = <IProps extends FadeScaleParams>(
    node: HTMLElement,
    {
      delay = 100,
      duration = 1600,
      easing = (x: number) => x,
      baseScale = 0,
      translateX = '1rem',
      translateY = '-160%',
    }: IProps,
  ) => {
    const opacity = +getComputedStyle(node).opacity;
    const m = getComputedStyle(node).transform.match(/scale\(([0-9.]+)\)/);
    const scale = m ? Number(m[1]) : 1;
    const is = 1 - baseScale;
    // transform: translate uses matrix's last two entries for translate x and y
    // with scaleX=1 skewX=0 skewY=0  scaleY=1 (1-no scale and 0-no skew) just translate
    // NOTE: transform: translate is defined in the Tooltip.svelte and must specify
    // the same left/top values as the one in this css return value
    return {
      delay,
      duration,
      css: (t: number) => {
        const eased = easing(t);
        return \`opacity: \${eased * opacity}; transform: translate(\${translateX},\${translateY}) scale(\${eased * scale * is + baseScale}) \`;
      },
    };
  };

  const sixHash = () => {
    const a = (Math.random() * 46656) | 0;
    const b = (Math.random() * 46656) | 0;
    return a.toString(36).slice(-3) + b.toString(36).slice(-3);
  };

  const hoveringId = 'hovering-' + sixHash();
  // as caption and panel are mutually exclusive
  // even when both are received via $props()
  // we use the same tooltipPanelId for both
  // const tooltipPanelId = 'tooltip-' + sixHash();
  let tooltipPanelEl = $state<HTMLElement | null>(null);
  const round = Math.round;

  type TPanelArgs = any[];
  type TPanel = Snippet<[...any[]]> | null;
  type TProps = {
    delay?: number;
    duration?: number;
    baseScale?: number;
    caption?: string;
    captionCSS?: string;
    panel?: Snippet<[...any[]]> | null;
    panelArgs?: TPanelArgs; // arguments to forward
    children?: Snippet;
    preferredPos?: string;
    toolbarHeight?: number;
  };

  let {
    duration = 1000,
    delay = 800,
    baseScale = 0,
    caption = '',
    captionCSS = '',
    panel,
    panelArgs, // arguments to forward
    children,
    preferredPos = 'top,left,right,bottom',
    toolbarHeight = 0,
  }: TProps = $props();

  // Need to define variables as the setTooltipPos function adjusted them
  // to position properly based on preferredPos settings and available
  // space around the hovering elements
  let translateX = $state<string>('');
  let translateY = $state<string>('');

  let runtimePanel: TPanel = panel ? panel : caption ? captionPanel : null;

  if (!runtimePanel) {
    throw new Error('panel or caption is mandatory');
  }

  const getPreferred = () => {
    return preferredPos.replace(/\s+/g, '').split(',') as string[];
  };

  let visible = $state(false);
  // let ttRect: DOMRect | null = $state(null);
  // let hoverRect: DOMRect | null = $state(null);
  let initial = $state(true);

  // the setTooltipPos examine necessary parameters for applying
  // tooltip at required position and is forced to iterate over
  // the preferredPos list until params for a position match
  const OK = $state({
    top: false,
    bottom: false,
    leftRightBottom: false,
    topBottomRight: false,
    left: false,
    right: false,
  });

  // the setTooltipPos is triggered via mouseenter and has to have
  // rectangles for hovering element and its accompanying tooltip
  // to move tooltip to the proper space. The HoverData is bound
  // to accompanying hovering element via its id set by this
  // component initially in onMount and is saved in a Record list
  type HoverData = {
    hoverRect: DOMRect;
    tooltipRect: DOMRect;
  };
  // Record is an array type of a given key type and value type
  // where  key is a hovering element id inserted inside onMount
  // and registered in hoverRec array easy to fetch it when
  // onmouseenter handler has to display tooltip in a required
  // preferredPos position
  type HoverRecord = Record<string, HoverData>;
  const hoverRec: HoverRecord = {};

  const addRecord = (key: string, hr: DOMRect, tr: DOMRect) => {
    hoverRec[key] = { hoverRect: hr, tooltipRect: tr };
  };

  // triggered via mouseenter of the hovering elements to set its
  // accompanying tooltip in requiredPos position
  const setTooltipPos = (hoveringElement: HTMLElement) => {
    // NOTE: If your app has a Toolbar its height should be included in calculation.
    // For svelte-postgres app the toolbar height is 32px

    const { hoverRect, tooltipRect } = hoverRec[
      hoveringElement.id
    ] as HoverData;
    if (!hoverRect || !tooltipRect) {
      return;
    }

    translateX = '';

    // is there enough space at the right side of the screen for width and for height
    OK.topBottomRight =
      hoverRect.left - window.scrollX + tooltipRect.width < window.innerWidth;
    // is there enough space before the bottom side of the screen
    OK.leftRightBottom =
      hoverRect.top - window.scrollY + tooltipRect.height < window.innerHeight;

    OK.top =
      hoverRect.top - window.scrollY - toolbarHeight > tooltipRect.height;
    OK.bottom =
      hoverRect.bottom - window.scrollY + tooltipRect.height <
      window.innerHeight;
    OK.left = hoverRect.left - window.scrollX > tooltipRect.width;
    OK.right =
      hoverRect.right - window.scrollX + tooltipRect.width < window.innerWidth;


    for (let i = 0; i < getPreferred().length; i++) {
      const pref = getPreferred();
      switch (pref[i] as string) {
        case 'top':
          if (OK.top && OK.topBottomRight) {
            translateX = '0px';
            translateY = \`\${-tooltipRect.height}px\`;
          }
          break;
        case 'left':
          if (OK.left && OK.leftRightBottom) {
            translateX = \`\${-tooltipRect.width}px\`;
            translateY = '0px';
          }
          break;
        case 'right':
          if (OK.right && OK.leftRightBottom) {
            translateX = \`\${hoverRect.width}px\`;
            translateY = '0px';
          }
          break;
        case 'bottom':
          if (OK.bottom && OK.topBottomRight) {
            translateX = '0px';
            translateY = \`\${hoverRect.height + 5}px\`;
          }
          break;
        default:
          break;
      }
      if (translateX !== '') {
        visible = true;
        break;
      }
    }
    if (translateX === '') {
      translateY = OK.top
        ? \`\${-tooltipRect.height}px\`
        : \`\${hoverRect.height}px\`;
      translateX = OK.left
        ? \`\${window.innerWidth - (hoverRect.right - window.scrollX) - hoverRect.width}px\`
        : '0px';
      visible = true;
    }
  };

  const toggle = (event: MouseEvent) => {
    if (event.type === 'mouseenter') {
      setTooltipPos(event.currentTarget as HTMLElement);
    } else {
      visible = false;
    }
  };

  onMount(() => {
    setTimeout(() => {
      // tooltipPanelEl holds panel or captionPanel
      // depending on the $props() passed to this component
      // and we take the child as a runtimePanel
      // const ttPanelWrapper = document.getElementById(
      //   tooltipPanelId,
      // ) as HTMLElement;

      // if (ttPanelWrapper) {
      if (tooltipPanelEl) {
        // ttPanel is panel  or captionPanel to be show as a tooltip
        const ttPanel = tooltipPanelEl.children[0] as HTMLElement;
        // hoveringEl is the element that triggers the tooltip

        // child wrapper children are hovering elements mouseenter/mouseleave
        const hoveringEl = document.getElementById(hoveringId) as HTMLElement;

        if (ttPanel && hoveringEl) {
          addRecord(
            hoveringId,
            hoveringEl.getBoundingClientRect() as DOMRect,
            ttPanel.getBoundingClientRect() as DOMRect,
          );


        }

        // Clean up after logging
        (tooltipPanelEl as HTMLElement).remove();
      }
    }, 0);

    window.addEventListener('scrollend', () => {
      translateX = '0px';
      translateY = '0px';
    });
    // }
  });
</script>

<!-- 
    NOTE: transform:translate is defined in the fade-scale and must specify
    the same left/top values as the one in this tooltipPanelEl handler
-->
{#if initial}
  <div
    bind:this={tooltipPanelEl}
    style="\`position:absolute;top:-9999px !important;left:-9999px !important;visibility:hidden;padding:0;margin:0;border:none;outline:none;width:max-content;"
    class="ttWrapper"
  >
    {@render runtimePanel?.(panelArgs)}
  </div>
{/if}

{#snippet captionPanel(style?: string)}
  {#if captionCSS.includes(':')}
    <div
      bind:this={tooltipPanelEl}
      class="caption-default"
      style={captionCSS ?? ''}
    >
      {caption}
    </div>
  {:else}
    <div
      bind:this={tooltipPanelEl}
      class="caption-default {captionCSS}"
      style={style ??
        'padding:6px 0.5rem;margin:0 !important;height: 1rem !important;'}
    >
      {caption}
    </div>
  {/if}
{/snippet}

{#snippet handler()}
  {#if visible}
    <div
      id="ttWrapperId"
      style={\`position:absolute;  
      transform: translate(\${translateX},\${translateY});
      opacity: 0.85;
      padding: 0;
      margin:0;
      width:0;
      height:0;
      border:none;
      outline:none;
    \`}
      transition:fadeScale={{
        delay,
        duration,
        easing: cubicInOut,
        baseScale,
        translateX,
        translateY,
      }}
    >
      <div class="ttWrapper">
        {@render runtimePanel?.(panelArgs)}
      </div>
    </div>
  {/if}
{/snippet}

<div
  id={hoveringId}
  class="child-wrapper"
  onmouseenter={toggle}
  onmouseleave={toggle}
  aria-hidden={true}
>
  {@render handler()}
  {@render children?.()}
</div>

<style>
  .child-wrapper {
    /* position: relative; */
    margin: 3rem 0 0 16rem; /* global position */
    padding: 0;
    width: max-content;
    height: auto;
    border: none;
    outline: none;
    z-index: 10;
  }
  .ttWrapper {
    /* position: relative; */
    width: max-content;
    /*height: auto;*/
    margin: 0 !important;
    padding: 0 !important;
    border: none;
    outline: none;
  }
  .caption-default {
    border: 6px solid skyblue;
    border-radius: 5px;
    color: yellow;
    background-color: navy;
    width: max-content;
    padding: 3px 1rem;
    margin: 0;
    text-align: center;
    font-size: 14px;
    font-family: Arial, Helvetica, sans-serif;
    z-index: 10;
  }
</style>
`

  const crTooltipPath = path.join(componentsPath, 'CRTooltip.svelte')
  fs.writeFileSync(crTooltipPath, crTooltip, 'utf8');
}
function createSummaryDetail(){
  const componentsPath = ensureComponentPath()
  if (!componentsPath) return
  const crSummaryDetail = `<script lang="ts">
  import { onMount } from 'svelte';
  type PROPS = {
    summary: string;
    details: string;
  };
  let { summary, details }: PROPS = $props();
</script>

<details>
  <summary> {summary} </summary>
  <pre>
  {details}
  </pre>
</details>

<style lang="scss">
  details * {
    margin: 0;
  }
  details {
    background-color: hsl(0 0% 25%);
    width: max-content;
    padding: 0.5rem 1rem;
    border-radius: 1rem;
    overflow: hidden;
  }
  details > pre {
    opacity: 0;
    /* margin up and down */
    padding-block: 1rem;
    margin-left: 1rem;
  }
  details[open] pre {
    animation: fadeIn 0.75s linear forwards;
  }
  pre {
    border: 1px solid hsl(0 0% 45%);
    border-radius: 10px;
    padding: 1rem;
    margin: 0.5rem 0 0 3rem !important;
  }
  @keyframes fadeIn {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
  summary {
    font-size: 1.5rem;
    color: hsl(0 0% 85%);
    background-color: hsl(0 0% 35%);
    margin-inline-start: 1rem;
    /* should be instead of margin-left in above details > p */
    list-style-position: outside;
    margin-left: 3rem;
    cursor: pointer;
    width: max-content;
    padding: 2px 3rem;
    border-radius: 8px;
  }
  summary::marker {
    color: hsl(0 0% 60%);
  }
</style>
`
  const crSummaryDetailPath = path.join(componentsPath, 'CRSummaryDetail.svelte')
  fs.writeFileSync(crSummaryDetailPath, crSummaryDetail, 'utf8');
}

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
        const {routeName, fields, embellishments } = msg.payload as {
          routeName: string;
          fields: string[];
          embellishments:string[];
        };
        type FuncList = {
          [funcName: string]: Function;
        };
        routeName_ = routeName;
        fields_= fields;
        embellishments_ = embellishments;
        createUtils(routeName, fields);
        const funcList: FuncList = {
          'CRInput': createCRInput,
          'CRSpinner':createCRSpinner,
          'CRActivity': createCRActivity,
          'CRTooltip': createCRTooltip,
          'CRSummaryDetail': createSummaryDetail,
        }
        for(const fun of Object.values(embellishments)){
          try{
            funcList[fun]()
          }finally{}
        }
        createFormPage();
        buttons_();
        // if  (embellishments.includes('CRInput')){
        //   createCRInput();
        // }
        // if  (embellishments.includes('CRSpinner')){
        //   createCRSpinner();
        // }
        outputChannel.appendLine(`[WebView] createCrudSupport command entry point`);
        outputChannel.show(false);
        // Empty body for now
        outputChannel.appendLine(`[WebView] Received payload:', ${routeName}, ${fields.join(', ')}, ${embellishments.join(', ')}`);
        outputChannel.show(true);
      }
      else if(msg.command === 'log'){
        // vscode.window.showInformationMessage(`Bane command log ${msg.text}`);
        vscode.window.showInformationMessage(`log ${msg.text}`);
        // log should have at least a text property
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
      grid-template-columns: 33rem 20rem;
    }

    .grid-wrapper {
      display: grid;
      grid-template-columns: 20rem 12rem;
      column-gap: 0.5rem;
      row-gap: 1rem;
    }

    
    .span-two {
      grid-column: 1 / span 2;
      text-align: justify;
      font-size: 12px;
      color: skyblue;
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

    #schemaContainer {
      height: 30rem;
      overflow-y: auto;
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
      row-gap: 0.1rem;
      align-items: center;
      padding: 8px 1rem;
      border: 1px solid gray;
      border-radius: 6px;
      margin-top: 3rem;
      user-select: none;
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
      width: 25rem !important;
    }

    .checkbox-item label:hover {
      background-color: cornsilk;
      cursor: pointer;
      width: 25rem !important;
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
      left: 1.5rem !important;
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
      color: skyblue;
    }

    .models-list ul li {
      color: yellow;
    }

    .model-name {
      color: #3e3e3e;
      background-color: #e3e3e3;
      margin-top: 3px;
      width: calc(100% -1rem);
      border-radius: 6px;
      padding-left: 1rem;
      cursor: pointer;
    }

    .fields-column {
      display: grid;
      grid-template-columns: 7rem 9.5rem;
      column-gap: 5px;
      width: max-content;
      padding: 6px 0 6px 1rem;
      height:auto;
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
      cursor: pointer;
      width: 100%;
      padding: 2px 0 2px 0.5rem;
    }

    .fields-column p:nth-child(even) {
      font-weight: 400 !important;
      font-size: 12px !important;
    }
  </style>

</head>

<div>
  <h2 style='margin-left:8rem;'>Create CRUD Support</h2>

  <div class='main-grid'>
    <div class='grid-wrapper'>
      <pre class="span-two">
To create a UI Form for CRUD operations against the underlying ORM fill
out the <i>Candidate Fields</i> by entering field names in the <i>Field Name</i> input
box with its datatype, e.g. firstName: string,  and pressing the Enter key
or expand a table from the <i>Select Fields from ORM</i> block and click on
a field name avoiding the auto-generating fields usually colored in pink.
The UI Form +page.svelte with accompanying +page.server.ts will be 
created in the route specified in the Route Name input box.
      </pre>

      <div class='left-column'>
        <label for="routeNameId">Route Name
          <input id="routeNameId" type="text" />
        </label>
        <input id="fieldNameId" type="text" value='password: string' />
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
          <label for="CRSpinner">CRSpinner component</label>
        </div>
        <div class="checkbox-item">
          <input id="CRActivity" type="checkbox" />
          <label for="CRActivity">CRActivity component</label>
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
      <span class='prisma-model-caption'>Select Fields from ORM</span>
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

  // user clicks on fields list and it should click on a field name
  // rendered in skyblue
  function selectField(event) {
    const el = event.target
    const fieldName = el.innerText
    if (el.style.color === 'skyblue' && !fields.includes(fieldName)) {
      renderField(fieldName)
    }
  }
  // to send to an input box the Enter key up we need an event to dispatch
  const enterKeyEvent = new KeyboardEvent('keyup', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true
  })

  // a parsed schema from a Prisma ORM is sent back from the extension
  // and as it is an HTML collection we turn it into an Object with
  // entries to be destructed into individual object properties
  function renderParsedSchema(schemaModels) {

    // get container to render the schema into
    let container = document.getElementById('schemaContainer')
    let markup = ''
    try {
      for (const [modelName, theFields] of Object.entries(schemaModels)) {
        const [, fields] = Object.entries(theFields)[0]
        let m = ''
        for (const [fieldName, { type, prismaSetting }] of Object.entries(fields)) {
          if ('0|1'.includes(fieldName)) continue
          if (prismaSetting.includes('@default') || prismaSetting.includes('@updatedAt') || prismaSetting.includes('@unique')) {
            m += \`<p>\${fieldName}</p><p>type:\${type} <span style='color:pink'>\${prismaSetting ?? 'na'}</span></p>\`
          } else {
            m += \`<p>\${fieldName}</p><p>type:\${type} \${prismaSetting ?? 'na'}</p>\`
          }
        }
        // render field name as a collapsed summary to reveal field list when expanded
        markup += \`<details>
          <summary class='model-name'>\${modelName}</summary>
          <div class='fields-column'>\${m}</div>
          </details>\`
      }
    } catch (err) {
      console.log('renderParsedSchema', err)
    }
    // now all the markup constructed as a string render into  container
    container.innerHTML = markup

    // container gets click event but it has to be from the first <p> element
    // and that fieldname (innerText) id ignored if already saved in the fields
    container.addEventListener('click', (event) => {

      if (event.target.tagName === 'SUMMARY'){
        routeNameEl.value = event.target.innerText.toLowerCase();
        routeNameEl.focus();
        routeNameEl.click()
        return;
      }
      const el = event.target
      const fieldName = el.innerText
      // let type = el.nextSibling.innerText.match(/type:\\s*(\\w+)/)?.[1];
      let type = el.nextSibling.innerText.match(/type:(\\S+)/)?.[1];
      if (type === 'DateTime'){
        type = 'Date';
      }
      // the standard procedure for entering a new fieldname is via input box + Enter
      if (el.tagName === 'P' && el.nextSibling.tagName === 'P' && !fields.includes(fieldName)) {
        // we need input box so preserve its entry if any and restore after
        const savedEntry = fieldNameEl.value
        fieldNameEl.value = \`\${fieldName}: \${type}\`
        fieldNameEl.dispatchEvent(enterKeyEvent)
        fieldNameEl.value = savedEntry
      }
    })
  }

  // Request schema from the active extension
  vscode.postMessage({ command: 'readSchema' })

  // Receive schema from the extension
  window.addEventListener("message", event => {
    // vscode.postMessage({ command: 'log', text: 'got payload for renderParsedSchema()' })
    const msg = event.data;
    if (msg.command === 'renderSchema') {
      renderParsedSchema(msg.payload)
    }
  })
  
  // FieldsList elements use inline style for high specificity as they are created dynamically 
  // by inserting innerHTML, so the inline style is in the listElCSS variable
  const listElCSS = 'color:black; font-size:14px; font-weight: 400; background-color: skyblue; margin: 2px 0 0 0;'

  let routeName = ''
  // its data-filed-index are read via el.getAttribute('data-field-index')
  // or using camel case property name replacing 'data-' with .dataset
  // el.dataset.fieldIndex where data-field-index turn to .dataset.fieldIndex 

  let fields = []
  // for removing element from the fields list every fieldName is given short id
  // as data-field-index HTML attribute and received on click event and read
  const getUniqueId = () => {
    // convert to a string of an integer from base 36
    return Math.random().toString(36).slice(2)
  }

  const removeHintEl = document.getElementById('removeHintId')
  removeHintEl.style.opacity = '0'    // make it as a hidden tooltip

  // when a fieldList container is full scroll it so the last element
  // is exposed visible
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
  
  // create button should be enabled when fields list is not empty
  // and the route name is specified
  const disableCreateButton = () => {
    createBtnEl.disabled = !fields.length || !routeName
  }

  function adjustFiledNameAndType(val){
    val = val.replace(/\\s+/g,'')

    if (!val.match(/\\s*[a-zA-z0-9_]+\\s*\\:\\s*([a-zA-z0-9_]+)/)?.[1]){
      val = val.replace(/\\:.*\$/,'') + ': string'
    }else{
      val = val.replace(/([a-zA-z0-9_]+)\:([a-zA-z0-9_]+)/, '\$1: \$2')
    }
    return val
  }

  // the two input boxes for route name and fieldName, which is
  // used repeatedly for making Candidate Fields
  const routeNameEl = document.getElementById('routeNameId')
  const fieldNameEl = document.getElementById('fieldNameId')

  const fieldsListEl = document.getElementById('fieldsListId')
  const createBtnEl = document.getElementById('createBtnId')

  routeNameEl.addEventListener('input', (e) => {
    routeName = e.target.value
    disableCreateButton()
  })
  routeNameEl.addEventListener('click', (e) => {
    routeName = e.target.value
    disableCreateButton()
  })
  if (fieldNameEl) {
    fieldNameEl.addEventListener('keyup', (event) => {
      // vscode.postMessage({ command: 'log', text: 'fieldNameEl.addEventListener created' })
      let v = fieldNameEl.value.trim().replace(/\\bstring\\b/, 'String')
      if (!v) {
        // vscode.postMessage({ command: 'log', text: 'field is empty' })
        return
      }
      v = adjustFiledNameAndType(v);
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
    if (routeName && fields.length) {
      const payload = { routeName, fields, embellishments: selectedCheckboxes() }
      vscode.postMessage({ command: 'createCrudSupport', payload: payload })
    }
  })
</script>
</body>

</html>`;
}

