<script lang="ts">
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
      return [`${aUser?.firstName} ${aUser?.lastName}`, aUser.role];
    } else {
      return [`${user.firstName} ${user.lastName}`, user.role];
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
