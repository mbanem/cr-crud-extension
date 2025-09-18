(function () {
  'use strict'

  const vscode = acquireVsCodeApi()

  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, attaching event listeners...')

    const createBtnEl = document.getElementById('createBtn')
    const componentNameInput = document.getElementById('componentName')
    const routeNameInput = document.getElementById('routeName')

    if (createBtnEl) {
      createBtnEl.addEventListener('click', () => {
        const componentName = componentNameInput?.value.trim()
        const routeName = routeNameInput?.value.trim()
        const fields = ['id', 'name', 'email'] // You can make this dynamic

        if (componentName && routeName && fields.length) {
          const payload = { componentName, routeName, fields }
          console.log('Sending message:', payload)

          vscode.postMessage({
            command: 'createCrudSupport',
            payload: payload
          })
        } else {
          alert('Please fill in component name and route name')
        }
      })
    }
  })
})()