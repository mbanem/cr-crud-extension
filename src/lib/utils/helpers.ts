export const capitalize = (str: string) => {
  return str
    .replace(/\b[a-z](?=[a-z]{2})/g, (char) => char.toUpperCase())
}