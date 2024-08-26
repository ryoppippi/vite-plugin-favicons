import favicons from 'virtual:favicons'
import { codeToHtml } from 'shiki'

export const load = async ()=>{
  const faviconsHtml = await codeToHtml(
    `<head>\n${favicons}\n</head>`,
    {
      lang: 'html',
      theme: 'vitesse-dark'
    }
  )

  return { faviconsHtml }
}
