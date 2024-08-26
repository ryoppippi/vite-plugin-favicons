import favicons from 'virtual:favicons'
import { codeToHtml } from 'shiki'
import format from "html-format";

export const load = async ()=>{
  const html = format(`<head>\n${favicons}\n</head>`);
  const faviconsHtml = await codeToHtml(
    html,
    {
      lang: 'html',
      theme: 'vitesse-dark'
    }
  );

  return { faviconsHtml }
}
