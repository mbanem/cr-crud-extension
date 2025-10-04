<script lang="ts">
  const fields = ['firstName','lastName','email','password'];
  let TFormData = `type FormData = {
  `
  let data = `let snap = $state<TFormData>({ 
  `
  fields.forEach(fName=>{
    TFormData += `${fName};
    `
    data += `${fName}: '',
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
  import { hideButtonsExceptFirst } from '$lib/utils';

  import ButtonSpinner from '$components/CRSpinner.svelte';
  import PageTitleCombo from '$components/CRActivity.svelte';
  import * as utils from '$lib/utils';
  ` + TFormData + `
  }` + data + `
  }
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

  const clearForm = (event?: MouseEvent | KeyboardEvent) => {
    event?.preventDefault();
    snap_bio = '';
    hideButtonsExceptFirst([btnCreate, btnUpdate, btnDelete]);
  };
  \</script\>
  <form action="?/create" method="post" use:enhance={enhanceProfile}>
        
        <input type="hidden" name="authorId" bind:value={bio.userId} />
        <input type="hidden" name="bioId" bind:value={bio.id} />

        <div class="buttons">
          <ButtonSpinner
            bind:button={btnCreate}
            spinOn={loading}
            caption="create"
            disabled={!bio.userId}
            hidden={false}
          ></ButtonSpinner>

          {#if !wrongUser}
            <ButtonSpinner
              bind:button={btnUpdate}
              spinOn={loading}
              caption="update"
              formaction="?/update"
            ></ButtonSpinner>
            <ButtonSpinner
              bind:button={btnDelete}
              spinOn={loading}
              caption="delete"
              formaction="?/delete"
            ></ButtonSpinner>
          {/if}
          <button onclick={clearForm}>clear</button>
        </div>
      </form>
  `
  const enhance = `const enhanceProfile: SubmitFunction = async ({ action, formData }) => {
    result = '';
    required = '';
    if (action.search !== '?/delete') {
    data.forEach(el => {
      el==='' ? required = \`"${el} is required"\`
    })
    `

      let bio = formData.get('bio');
      if (bio === '') {
        bioIsRequired = 'Biography is required field';
        return;
      }
    }
    loading = true; // start spinner animation
    result =
      action.search === '?/create'
        ? 'creating profile...'
        : action.search === '?/update'
          ? 'updating profile...'
          : 'deleting profile...';
    if (action.search === '?/delete') {
      hideButtonsExceptFirst([btnDelete, btnCreate, btnUpdate]);
    }
    return async ({ update }) => {
      await update();

      if (action.search === '?/create') {
        result = page.status === 200 ? 'Profile created' : 'create failed';
      } else if (action.search === '?/delete') {
        result = page.status === 200 ? 'Profile deleted' : 'delete failed';
      } else if (action.search === '?/update') {
        result = page.status === 200 ? 'Profile updated' : 'update failed';
      } else if (action.search === '?/delete') {
        result = page.status === 200 ? 'Profile deleted' : 'delete failed';
        iconDelete.classList.toggle('hidden');
        hideButtonsExceptFirst([btnCreate, btnUpdate, btnDelete]);
      }
      invalidateAll();
      await utils.sleep(1000);
      loading = false; // stop spinner animation
      clearForm();
      hideButtonsExceptFirst([btnCreate, btnUpdate, btnDelete]);
      clearMessage();
    };
  };




  console.log('profile/+page.svelte PageData', data);
  let oldUserId = data.locals.user.id;
  let selectedUserId = $state<string>(data.locals.user.id);
  let wrongUser = $derived(selectedUserId !== data.locals.user.id);

  const getBio = (userId: string): Bio | undefined => {
    userId = userId ?? data.locals.user.id;
    const pro = data.userProfiles;
    for (let i = 0; i < pro.length; i++) {
      const p = pro[i];
      if (p) {
        if (p.userId === userId) {
          return {
            id: p.id,
            bio: p.bio as string,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt as Date,
            userId: p.userId,
            user: p.user,
          };
        }
      }
    }
    // there could be many users with no profile so do not rely on index i
    // when exiting from the previous loop but find user form the users list
    for (let i = 0; i < data.users.length; i++) {
      if (data.users[i]?.id === userId) {
        return {
          id: undefined,
          bio: 'there is no profile for this user',
          createdAt: undefined,
          updatedAt: undefined,
          userId: (data.users[i] as UserPartial).id as string,
          user: data.users[i] as UserPartial,
        };
      }
    }
  };

  // as UI depends on bio and bio could change on update/delete where oMount does not fire
  // we need to define bio as responsive variable
  let bio = $state<Bio>({
    id: '',
    bio: '',
    createdAt: undefined,
    updatedAt: undefined,
    userId: '',
    user: undefined,
  });

  // when executing the $effect remember all reactive variables it depends on
  //
  $effect(() => {
    bio = getBio(selectedUserId) as Bio;
    if (wrongUser) {
      snap_bio = '';
    }
  });
  let bioIsRequired = '';
  // form?.message cannot be cleared by code but could be ignored when required
  let loading = $state<boolean>(false); // TODO spinner
    let btnCreate: HTMLButtonElement;
    let btnUpdate: HTMLButtonElement;
    let btnDelete: HTMLButtonElement;
    let iconDelete: HTMLSpanElement;
    let bioTextArea: HTMLTextAreaElement;

  // keep message displayed for several seconds
  const clearMessage = () => {
    setTimeout(() => {
      result = '';
    }, 2000);
  };

  const clearForm = (event?: MouseEvent | KeyboardEvent) => {
    event?.preventDefault();
    snap_bio = '';
    hideButtonsExceptFirst([btnCreate, btnUpdate, btnDelete]);
  };

  const enhanceProfile: SubmitFunction = async ({ action, formData }) => {
    if (wrongUser) {
      return;
    }
    result = '';
    bioIsRequired = '';
    if (action.search !== '?/delete') {
      let bio = formData.get('bio');
      if (bio === '') {
        bioIsRequired = 'Biography is required field';
        return;
      }
    }
    loading = true; // start spinner animation
    result =
      action.search === '?/create'
        ? 'creating profile...'
        : action.search === '?/update'
          ? 'updating profile...'
          : 'deleting profile...';
    if (action.search === '?/delete') {
      hideButtonsExceptFirst([btnDelete, btnCreate, btnUpdate]);
    }
    return async ({ update }) => {
      await update();

      if (action.search === '?/create') {
        result = page.status === 200 ? 'Profile created' : 'create failed';
      } else if (action.search === '?/delete') {
        result = page.status === 200 ? 'Profile deleted' : 'delete failed';
      } else if (action.search === '?/update') {
        result = page.status === 200 ? 'Profile updated' : 'update failed';
      } else if (action.search === '?/delete') {
        result = page.status === 200 ? 'Profile deleted' : 'delete failed';
        iconDelete.classList.toggle('hidden');
        hideButtonsExceptFirst([btnCreate, btnUpdate, btnDelete]);
      }
      invalidateAll();
      await utils.sleep(1000);
      loading = false; // stop spinner animation
      clearForm();
      hideButtonsExceptFirst([btnCreate, btnUpdate, btnDelete]);
      clearMessage();
    };
  };

  const canBeUpdated = (event: MouseEvent) => {
    const pEl = event.currentTarget as HTMLParagraphElement;
    if (data.locals.user.id !== pEl.dataset.userId) return;
    // instead of taking id easier way as snap?.user.id
    // we use here data attribute data-user-id as pEl.dataset.userId -- a string
    bio = getBio(pEl.dataset.userId) as Bio;
    snap_bio = bio.bio;

    // NOTE: in order to say pEl.dataset.userId HTML name must be data-user-id
    // as DOMStringMap capitalize every occurrence of dash e.g. user-new-id --> userNewId
    // console.log('user.id', user.id, 'dataset.userId', pEl.dataset.userId);
    // bioTextArea.value = snap?.bio as string;
    hideButtonsExceptFirst([btnUpdate, btnCreate, btnDelete]);
    // iconDelete.classList.toggle('hidden');
  };

  let result = $state<string>('');

  // export const snapshot: Snapshot = {
  //   capture: () => {
  //     return snap;
  //   },
  //   restore: (value) => {
  //     if (value.authorId !== data.locals.user.id) {
  //       utils.shallowCopy(initialSnap, snap);
  //     } else {
  //       snap = value;
  //     }
  //   },
  // };

  // NOTE: binding sna.bio to TextArea element clears complete snap when
  // any character is entered, though there is no event listener attached to
  // so we bind dummy snap_bio and dynamically update snap.bio from it
  let snap_bio = $state<string>('');

  onMount(() => {
    return () => {
      utils.setMrPath(page.url.pathname);
    };
  });
</script>

<!-- <pre>wrongUser {wrongUser} {JSON.stringify(data, null, 2)}</pre> -->
<!-- <pre>{JSON.stringify(snap, null, 2)}</pre> -->
<!-- <pre style="font-size:14px;">snap-Page {JSON.stringify(bio, null, 2)}</pre> -->
<svelte:head>
  <title>Profile</title>
</svelte:head>

{#snippet tooltipBio(bio: Bio)}
  <!-- <Tooltip class="tooltip-profile"> -->
  <p>
    <span style="color:lightgreen;margin:0 1rem 0 0;"> created at</span>
    <span class="property-value">
      {bio.createdAt?.toLocaleString()}
    </span>
  </p>
  <p>
    <span style="color:lightgreen;margin:0 1rem 0 0;"> updated at</span>
    <span class="property-value">
      {bio.updatedAt?.toLocaleString()}
    </span>
  </p>
  <!-- </Tooltip> -->
{/snippet}
{#snippet deleteIcon()}
  <!-- <Tooltip class="tooltip-profile"> -->
  <p>delete the profile</p>
  <!-- </Tooltip> -->
{/snippet}
{#snippet ownerOnly()}
  <!-- <Tooltip class="tooltip-profile"> -->
  <p class="pink">Owner only permission</p>
  <!-- </Tooltip> -->
{/snippet}

<PageTitleCombo
  PageName="Profile"
  bind:result
  bind:selectedUserId
  user={data.locals.user}
  users={data.users}
/>

<div class="container">
  <div class="left-column">
    <div>
      <span class="title">User Bio</span>
      <form action="?/create" method="post" use:enhance={enhanceProfile}>
        <textarea
          bind:this={bioTextArea}
          placeholder="Place bio here"
          rows={5}
          cols={35}
          name="bio"
          bind:value={snap_bio}
        ></textarea>
        <input type="hidden" name="authorId" bind:value={bio.userId} />
        <input type="hidden" name="bioId" bind:value={bio.id} />

        <div class="buttons">
          <ButtonSpinner
            bind:button={btnCreate}
            spinOn={loading}
            caption="create"
            disabled={!bio.userId}
            hidden={false}
          ></ButtonSpinner>

          {#if !wrongUser}
            <ButtonSpinner
              bind:button={btnUpdate}
              spinOn={loading}
              caption="update"
              formaction="?/update"
            ></ButtonSpinner>
            <ButtonSpinner
              bind:button={btnDelete}
              spinOn={loading}
              caption="delete"
              formaction="?/delete"
            ></ButtonSpinner>
          {/if}
          <button onclick={clearForm}>clear</button>
        </div>
      </form>
    </div>
  </div>

  {#if bio.bio}
    <div class="right-column">
      <!-- <p>{bio.user.firstName} {bio.user.lastName}</p> -->
      <div class="relative">
        <!-- see NOTE above for data-user-id -->
        {#if wrongUser}
          <p class:not-allowed={wrongUser}>{bio.bio ?? ''}</p>
          {@render tooltipBio(bio)}
          <span class="icon-delete">X</span>
          {@render ownerOnly()}
        {:else}
          <p
            class="bio"
            onclick={canBeUpdated}
            data-user-id={bio.userId}
            aria-hidden={true}
          >
            {bio.bio ?? ''}
          </p>
          {@render tooltipBio(bio)}
          <span
            bind:this={iconDelete}
            onclick={() => {
              btnDelete.click();
            }}
            aria-hidden={true}
            ><span class="icon-delete" class:pink={wrongUser}>X</span></span
          >
          {@render deleteIcon()}
        {/if}
      </div>
    </div>
  {:else}
    <div class="right-column">There is no profile for this user</div>
  {/if}
</div>

<style lang="scss">
  .relative {
    p {
      cursor: default;
    }
  }

  .container {
    display: grid;
    gap: 1rem;
    width: 80vw;
    height: 70vh;
    grid-template-columns: 1fr 1fr;
    text-align: center;
    .left-column {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: stretch;
      border: 1px solid gray;
      align-items: center;
      border-radius: 6px;
      padding-top: 1rem;
      p {
        text-align: left;
        flex: 1;
      }
      .title {
        color: skyblue;
        font-size: 20px;
      }
    }
    .right-column {
      position: relative;
      border: 1px solid gray;
      border-radius: 6px;
      padding: 2rem 8px 1rem 1rem;
      overflow-y: auto;
      .bio {
        cursor: pointer;
      }
    }
  }

  .buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    width: 100%;
  }

  .pink {
    color: pink !important;
    border-color: pink !important;
  }
  .not-allowed:hover {
    cursor: not-allowed;
  }
</style>
