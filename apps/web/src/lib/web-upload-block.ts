import { refreshAiCampRuntime } from '@ai-camp/types';

export const AI_CAMP_UPLOAD_MARKER = 'data-ai-camp-upload';
const UPLOAD_INPUT_ID = 'aiCampPhotoInput';
const UPLOAD_PREVIEW_ID = 'aiCampPreviewImg';

export function hasImageUploadBlock(html: string, js = ''): boolean {
  const doc = `${html}\n${js}`;
  return (
    doc.includes(AI_CAMP_UPLOAD_MARKER) ||
    doc.includes(`id="${UPLOAD_INPUT_ID}"`) ||
    doc.includes(`id='${UPLOAD_INPUT_ID}'`)
  );
}

/** 生成可插入页面的图片上传区（依赖已注入的 window.__AI_CAMP__） */
export function buildImageUploadBlockSnippet(label = '上传图片'): string {
  const safeLabel = label.replace(/[<>&"']/g, '');
  return `
<section id="aiCampUploadSection" class="ai-camp-upload-zone" style="margin:20px 0;padding:20px;text-align:center;background:linear-gradient(135deg,#fff7ed,#fef3c7);border-radius:20px;border:2px dashed #fdba74;">
  <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#c2410c;">📷 上传你的图片</p>
  <label for="${UPLOAD_INPUT_ID}" style="cursor:pointer;display:inline-block;padding:12px 24px;background:#f97316;color:white;border-radius:999px;font-weight:700;font-size:16px;box-shadow:0 4px 12px rgba(249,115,22,0.35);">
    📤 ${safeLabel}
  </label>
  <input type="file" id="${UPLOAD_INPUT_ID}" accept="image/*" style="display:none" />
  <img id="${UPLOAD_PREVIEW_ID}" alt="" style="display:none;max-width:100%;margin:16px auto 0;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,0.1)" />
  <p id="aiCampUploadHint" style="display:none;margin:8px 0 0;font-size:13px;color:#ea580c;font-weight:600;">上传中…</p>
</section>
<script ${AI_CAMP_UPLOAD_MARKER}="1">
(function(){
  if(window.__AI_CAMP_UPLOAD_WIRED__)return;
  window.__AI_CAMP_UPLOAD_WIRED__=true;
  var input=document.getElementById('${UPLOAD_INPUT_ID}');
  var preview=document.getElementById('${UPLOAD_PREVIEW_ID}');
  var hint=document.getElementById('aiCampUploadHint');
  if(!input||!preview||typeof __AI_CAMP__==='undefined')return;
  input.addEventListener('change',async function(){
    var file=input.files&&input.files[0];
    if(!file)return;
    if(hint){hint.style.display='block';hint.textContent='上传中…';}
    preview.style.display='none';
    try{
      var url=await __AI_CAMP__.uploadImage(file);
      preview.src=url;
      preview.alt='已上传';
      preview.style.display='block';
      if(hint)hint.style.display='none';
    }catch(e){
      if(hint){hint.textContent=(e&&e.message)||'上传失败';hint.style.display='block';}
      alert((e&&e.message)||'上传失败');
    }
    input.value='';
  });
})();
<\/script>`;
}

function insertBeforeBodyClose(html: string, snippet: string): string {
  const trimmed = snippet.trim();
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${trimmed}\n</body>`);
  if (/<\/html>/i.test(html)) return html.replace(/<\/html>/i, `${trimmed}\n</html>`);
  return `${html}\n${trimmed}`;
}

/** 向 HTML 确定性插入图片上传区（不依赖 LLM） */
export function injectImageUploadBlock(html: string, opts?: { label?: string }): string {
  if (!html?.trim() || hasImageUploadBlock(html)) return html;
  const withBlock = insertBeforeBodyClose(html, buildImageUploadBlockSnippet(opts?.label));
  return refreshAiCampRuntime(withBlock);
}

export function finalizeKidWebHtml(
  html: string,
  opts?: { enableImageUpload?: boolean; uploadLabel?: string },
): string {
  if (!opts?.enableImageUpload) return html;
  return injectImageUploadBlock(html, { label: opts.uploadLabel });
}
