export const capitalize = (str: string) => {
  const spaceUpper = (su: string) => {
    return ` ${su[1]?.toUpperCase()}`
  }
  str = str[0]?.toUpperCase() + str.slice(1)
  // /Filip(?=XX) check patterns as a positive lookahead, i.e, whether Filip in followed by XX
  // Positive lookahead
  // here TaylorSwift got a space between first and last name
  // 'TaylorSwift the singer'.replace(/\b(Taylor)(?=Swift)\b/g, '$1 ')
  // replacing Taylor by cached name $1 followed by a space '$1 '
  // after regex replace we have: Taylor Swift the singer
  return str
    .replace(/\b[a-z](?=[a-z]{2})/g, (char) => char.toUpperCase())
    .replace(/(_\w)/, spaceUpper)
}