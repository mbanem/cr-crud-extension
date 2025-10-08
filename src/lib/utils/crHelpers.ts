export const sleep = async (ms: number) => {
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
