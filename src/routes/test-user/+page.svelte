<script lang="ts">
  import type { Snapshot } from '../$types';
  import { onMount } from 'svelte';
  import type { PageData, ActionData } from './$types';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/state'; // for page.status code on actions

  import * as utils from '$lib/utils';
  import CRInput from '$lib/components/CRInput.svelte';
  import CRSpinner from '$lib/components/CRSpinner.svelte';
  import type { User, Role, Profile, Article, Post, Category, Todo }  from '$lib/types/types';
  type TFormData = {
    id: String | null;
    firstName: String | null;
    lastName: String | null;
    email: String | null;
    password: String | null;
    
  };
  let snap = $state<TFormData>({
    id: null,
    firstName: null,lastName: null,email: null,password: null
  });

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
  let result = '';
  const clearMessage = () => {
    setTimeout(() => {
      result = '';
    }, 2000);
  };

  const capitalize = (str:string) => {
    const spaceUpper = (su:string) => {
      return ` ${su[1]?.toUpperCase()}`
    }
    
    return str
    .replace(/(_\w)/, spaceUpper)
    .replace(/\b[a-z](?=[a-z]{2})/g, (char) => char.toUpperCase())
  }

  // const routeName = capitalize(document.getElementById('routeNameId').value);
  // let routName = capitalize(`test-user`);
  const fields:string[] = ["firstName: String","lastName: String","email: String","password: String"]
  function noType(name: string){
    return name.match(/([a-zA-z0-9_]+):?.*/)?.[1]
  }

  const nullSnap = {
    
    id: null,
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    
  }

  let formDataValid = $derived.by(() => {
    return snap === nullSnap
  });

  const clearForm = (event?: MouseEvent | KeyboardEvent) => {
    event?.preventDefault();
    snap = nullSnap;
    utils.hideButtonsExceptFirst([btnCreate, btnUpdate, btnDelete]);
  };
  
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
        ? 'creating `${routeName}`...'
        : action.search === '?/update'
          ? 'updating `${routeName}`...'
          : 'deleting `${routeName}`...';
    if (action.search === '?/delete') {
      utils.hideButtonsExceptFirst([btnDelete, btnCreate, btnUpdate]);
    }

    return async ({ update }) => {
      await update();

      if (action.search === '?/create') {
        result = page.status === 200 ? '`${routeName}` created' : 'create failed';
      } else if (action.search === '?/update') {
        result = page.status === 200 ? '`${routeName}` updated' : 'update failed';
      } else if (action.search === '?/delete') {
        result = page.status === 200 ? '`${routeName}` deleted' : 'delete failed';
        iconDelete.classList.toggle('hidden');
        utils.hideButtonsExceptFirst([btnCreate, btnUpdate, btnDelete]);
      }
      invalidateAll();
      await utils.sleep(1000);
      loading = false; // stop spinner animation
      clearForm();
      utils.hideButtonsExceptFirst([btnCreate, btnUpdate, btnDelete]);
      clearMessage();
  }

  // buttons_() called here
  }
</script>
<form action="?/create" method="post" use:enhance={enhanceSubmit}>
  <div class='form-wrapper'>
    <CRInput title="firstName"
      exportValueOn="enter|blur"
      capitalize={true}
      bind:value={snap.firstName as string}
      required={true}
      width='22.5rem'
    >
    </CRInput>
    <CRInput title="lastName"
      exportValueOn="enter|blur"
      capitalize={true}
      bind:value={snap.lastName as string}
      required={true}
      width='22.5rem'
    >
    </CRInput>
    <CRInput title="email"
      exportValueOn="enter|blur"
      capitalize={true}
      bind:value={snap.email as string}
      required={true}
      width='22.5rem'
    >
    </CRInput>
    <CRInput title="password"
      exportValueOn="enter|blur"
      capitalize={true}
      bind:value={snap.password as string}
      required={true}
      width='22.5rem'
    >
    </CRInput>
    
    <div class='buttons-row'>
      <div class='buttons'>
      <CRSpinner
        bind:button={btnCreate}
        spinOn={loading}
        caption=create
        formaction="?/create"
        disabled={!formDataValid}
        hidden={false}
      >
      </CRSpinner>
      <CRSpinner
        bind:button={btnUpdate}
        spinOn={loading}
        caption=update
        formaction="?/update"
        disabled={!formDataValid}
        hidden={false}
      >
      </CRSpinner>
      <CRSpinner
        bind:button={btnDelete}
        spinOn={loading}
        caption=delete
        formaction="?/delete"
        disabled={!formDataValid}
        hidden={false}
      >
      </CRSpinner>
      <button onclick={clearForm}>clear form</button>
    </div>
    </div>
  </div>
</form>
<style lang='scss'>
  .form-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: max-content;
    padding: 1rem;
    margin: 5rem auto;
    border: 0.3px solid gray;
    border-radius: 8px;
    .buttons {
      display: flex;
      gap: 0.3rem;
      justify-content: flex-end;
      align-items: center;
      button {
        display: inline-block;
      }
    }
  }
</style>
  