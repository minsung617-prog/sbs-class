// 개강안내 강좌 목록 생성기
// 사용법: KEG 인트라넷 시간표관리(/op/b08/b080101)에서
//   1) XHR 응답 캡처 패치 → 2) "반 구분 전체" + 기간(이번 달 1일 ~ 다음 달 말일) 지정 후 [조회] → 3) 이 파일 내용을 그대로 실행
// 결과: courses.json 에 저장할 JSON 문자열 (과목·요일·기간·시간·강의장만, 강사/수강생 정보 없음)
(() => {
  const raw = window.__resp && window.__resp['op/b08/b0801/period/schedule'];
  if (!raw) throw new Error('시간표 응답이 없습니다. 패치 후 [조회]를 눌렀는지 확인하세요.');
  const req = (window.__cap || []).filter(c => c.u.includes('/period/schedule')).pop();
  const range = req && req.b ? JSON.parse(req.b) : {};
  if (range.weekendYn) throw new Error('"반 구분 전체"로 조회해야 합니다 (현재: ' + range.weekendYn + ')');
  const list = (JSON.parse(raw).data || {}).list || [];

  const CH = { 1: '일', 2: '월', 3: '화', 4: '수', 5: '목', 6: '금', 7: '토' };
  const ord = n => (n === 1 ? 8 : n);
  function fmtDays(type) {
    const parts = String(type || '').split('/').map(p => p.split(',').map(Number).filter(Boolean).sort((a, b) => ord(a) - ord(b)));
    if (parts.length > 1) return parts.map(p => p.map(n => CH[n]).join('')).join('');
    const p = parts[0] || [];
    const run = p.length >= 3 && p.every((n, i) => i === 0 || ord(n) === ord(p[i - 1]) + 1);
    if (run) return CH[p[0]] + '~' + CH[p[p.length - 1]];
    return p.map(n => CH[n]).join('/');
  }
  const md = s => s.slice(5).replace('-', '.');

  const rows = list
    .filter(x => x.class_cancellation_yn !== 'Y' && x.use_yn !== 'N')
    .map(x => {
      const room = /^[A-Z]$/.test(x.classroom_name) ? x.classroom_name + '강의장' : x.classroom_name;
      const online = room.includes('비대면');
      const subject = String(x.subject_short_name || '').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&').trim();
      return [subject, fmtDays(x.class_day_type), x.start_date, x.end_date,
        x.start_time, x.end_time, room, x.weekend_yn === 'Y' ? 1 : 0, online ? 1 : 0];
    })
    .sort((a, b) => (a[4] + a[6]).localeCompare(b[4] + b[6]) || a[2].localeCompare(b[2]));

  const nowKst = new Date(Date.now() + 9 * 3600e3);
  return JSON.stringify({
    updated: nowKst.toISOString().slice(0, 16).replace('T', ' '),
    range: [range.stDate || '', range.edDate || ''],
    cols: ['subject', 'days', 'start', 'end', 'timeStart', 'timeEnd', 'room', 'weekend', 'online'],
    rows,
  });
})()
