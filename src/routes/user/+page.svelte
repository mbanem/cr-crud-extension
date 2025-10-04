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
  import CRActivity from '$lib/components/CRActivity.svelte';
  import CRTooltip from '$lib/components/CRTooltip.svelte';
  import CRSummaryDetail from '$lib/components/CRSummaryDetail.svelte';
  type TFormData = {
    id: String;
    firstName: String;
    lastName: String;
    email: String;
    password: String;
    createdAt: Date;
    articles: Article[];
    }
  let snap = $state<TFormData>({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    createdAt: '',
    articles: '',
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

  const routeName = capitalize(document.getElementById('routeNameId').value);

  function noType(name: string){
    return name.match(/([a-zA-z0-9_]+):?.*/)?.[1]
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
      hideButtonsExceptFirst([btnDelete, btnCreate, btnUpdate]);
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
        hideButtonsExceptFirst([btnCreate, btnUpdate, btnDelete]);
      }
      invalidateAll();
      await utils.sleep(1000);
      loading = false; // stop spinner animation
      clearForm();
      hideButtonsExceptFirst([btnCreate, btnUpdate, btnDelete]);
      clearMessage();


  undefined
  </script>
  <form action="?/create" method="post" use:enhance={enhanceSubmit}>
    <div class="buttons">
    <CRInput title="Id"
      exportValueOn="enter|blur"
      capitalize={true}
      bind:value={snap.Id}
      required={true}
    >
    </CRInput>
    <CRInput title="firstName"
      exportValueOn="enter|blur"
      capitalize={true}
      bind:value={snap.firstName}
      required={true}
    >
    </CRInput>
    <CRInput title="lastName"
      exportValueOn="enter|blur"
      capitalize={true}
      bind:value={snap.lastName}
      required={true}
    >
    </CRInput>
    <CRInput title="email"
      exportValueOn="enter|blur"
      capitalize={true}
      bind:value={snap.email}
      required={true}
    >
    </CRInput>
    <CRInput title="password"
      exportValueOn="enter|blur"
      capitalize={true}
      bind:value={snap.password}
      required={true}
    >
    </CRInput>
    <CRInput title="createdAt"
      exportValueOn="enter|blur"
      capitalize={true}
      bind:value={snap.createdAt}
      required={true}
    >
    </CRInput>
    <CRInput title="articles"
      exportValueOn="enter|blur"
      capitalize={true}
      bind:value={snap.articles}
      required={true}
    >
    </CRInput>
    
    <div class='buttons'>
  <CRSpinner
        bind:this={btnCreate}
        spinOn={loading}
        caption=create
        formaction="?/create"
        disabled={!formDataValid()}
        hidden={false}
      >
      </CRSpinner>
      <CRSpinner
        bind:this={btnUpdate}
        spinOn={loading}
        caption=update
        formaction="?/update"
        disabled={!formDataValid()}
        hidden={false}
      >
      </CRSpinner>
      <CRSpinner
        bind:this={btnDelete}
        spinOn={loading}
        caption=delete
        formaction="?/delete"
        disabled={!formDataValid()}
        hidden={false}
      >
      </CRSpinner>
      <button onclick={clearForm}>clear form</button>
    </div>
  </form>
  