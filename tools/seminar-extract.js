// 세미나 게시글 정리기
// 사용법: KEG 인트라넷 "특강 및 세미나"(/am/am3/am0114)에서 캡처 훅을 건 뒤 게시글 상세를 열면
//   window.__details['.../am0114/detail/<번호>'] 에 상세 응답이 쌓인다. 이 파일 내용을 실행하면
//   [{id,title,date,time,place,quota,hasPoster}] JSON 문자열을 돌려준다. (작성자·신청자 정보 없음)
(() => {
  const dec = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
  const txt = h => dec(dec(String(h || ''))).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;| /g, ' ');
  const kst = ms => new Date(ms + 9 * 3600e3).toISOString().slice(0, 10);
  const out = [];
  for (const [k, v] of Object.entries(window.__details || {})) {
    if (!k.includes('/detail/')) continue;
    const d = (v && v.data) || {};
    const t = txt(d.content);
    let date = d.st_date ? kst(d.st_date) : '';
    if (!date) {
      const m = t.match(/(20\d\d)\s*[년.\-]\s*(\d{1,2})\s*[월.\-]\s*(\d{1,2})/);
      if (m) date = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    }
    const tm = t.match(/(\d{1,2}:\d{2})\s*[~\-–]\s*(\d{1,2}:\d{2})/);
    const pm = t.match(/장소\s*[:：]?\s*([^\n]+?)(?=\s*시간|\n|$)/);
    const title = String(d.title || '').replace(/^\s*\[[^\]]*\]\s*/, '').replace(/["“”']/g, '')
      .replace(/\s*(AI WEB\s*)?세미나\s*$/, '').trim();
    out.push({
      id: d.content_no, title, date,
      time: tm ? `${tm[1]} ~ ${tm[2]}` : '',
      place: pm ? pm[1].trim() : '',
      quota: d.quota || 0,
      hasPoster: (d.attachmentfiles || []).some(f => /\.(png|jpe?g|gif|webp)$/i.test(f.file_name || f.original_file_name || f.org_file_name || JSON.stringify(f))),
    });
  }
  return JSON.stringify(out);
})()
