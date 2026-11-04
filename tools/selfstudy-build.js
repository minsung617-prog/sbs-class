// 자습실 이용 가능 시간 계산기
// 사용법: KEG 인트라넷 시간표관리(/op/b08/b080101) 페이지에서
//   1) XHR 응답 캡처 패치 → 2) "반 구분 전체" 선택 후 [조회] → 3) 이 파일 내용을 그대로 실행
// 결과: selfstudy.json 에 저장할 JSON 문자열 (강의실·시간만 포함, 강사/수강생 정보 없음)
(() => {
  const ROOMS = 'ABCDEFGH';
  const DAYS_AHEAD = 7;
  const WEEKDAY_SLOTS = [['09:00','11:00'],['11:00','13:00'],['13:00','13:30'],['13:30','14:00'],['14:00','16:00'],['16:00','17:00'],['17:00','18:00'],['18:00','18:30'],['18:30','19:00'],['19:00',null]];
  const WEEKEND_SLOTS = [['09:00','12:00'],['12:00','15:00'],['15:00','17:00'],['17:00','18:00'],['18:00',null]];
  // 대한민국 공휴일(대체공휴일 포함). 매년 말 다음 해 날짜를 추가하세요.
  const HOLIDAYS = {
    '2026-12-25':'성탄절',
    '2027-01-01':'신정','2027-02-06':'설날','2027-02-07':'설날','2027-02-08':'설날','2027-02-09':'대체공휴일',
    '2027-03-01':'삼일절','2027-05-05':'어린이날','2027-05-13':'부처님오신날','2027-06-06':'현충일',
    '2027-08-15':'광복절','2027-08-16':'대체공휴일','2027-09-14':'추석','2027-09-15':'추석','2027-09-16':'추석',
    '2027-10-03':'개천절','2027-10-04':'대체공휴일','2027-10-09':'한글날','2027-10-11':'대체공휴일',
    '2027-12-25':'성탄절','2027-12-27':'대체공휴일',
  };
  const DOW = ['일','월','화','수','목','금','토'];

  const raw = window.__resp && window.__resp['op/b08/b0801/period/schedule'];
  if (!raw) throw new Error('시간표 응답이 없습니다. 패치 후 [조회]를 눌렀는지 확인하세요.');
  const list = (JSON.parse(raw).data || {}).list || [];
  const req = (window.__cap || []).filter(c => c.u.includes('/period/schedule')).pop();
  const range = req && req.b ? JSON.parse(req.b) : {};
  if (range.weekendYn && range.weekendYn !== '') throw new Error('"반 구분 전체"로 조회해야 합니다 (현재: ' + range.weekendYn + ')');

  const classes = list.filter(x => ROOMS.includes(x.classroom_name) && x.classroom_name.length === 1
    && x.class_cancellation_yn !== 'Y' && x.use_yn !== 'N');

  const d0 = s => { const [y,m,d] = s.split('-').map(Number); return new Date(Date.UTC(y, m-1, d)); };
  const iso = d => d.toISOString().slice(0,10);
  const monday = d => { const x = new Date(d); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay()+6)%7)); return x; };
  const mins = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };

  function offDates(c) {
    const r = c.class_time_remark || '';
    if (!r.includes('휴강')) return new Set();
    const st = d0(c.start_date), set = new Set();
    for (const m of r.matchAll(/(\d{1,2})\s*\/\s*(\d{1,2})/g)) {
      const mo = +m[1], da = +m[2];
      let y = st.getUTCFullYear(); if (mo < st.getUTCMonth()+1 - 6) y++;
      set.add(`${y}-${String(mo).padStart(2,'0')}-${String(da).padStart(2,'0')}`);
    }
    return set;
  }
  const prepared = classes.map(c => ({ room: c.classroom_name, st: d0(c.start_date), ed: d0(c.end_date),
    s: mins(c.start_time), e: mins(c.end_time), pat: String(c.class_day_type || '').split('/').map(p => p.split(',').map(Number)),
    off: offDates(c) }));

  function meets(c, day) {
    if (day < c.st || day > c.ed || c.off.has(iso(day))) return false;
    const wk = Math.round((monday(day) - monday(c.st)) / 6048e5);
    const days = c.pat[((wk % c.pat.length) + c.pat.length) % c.pat.length];
    return days.includes(day.getUTCDay() + 1);
  }

  const nowKst = new Date(Date.now() + 9*3600e3);
  let day = d0(iso(nowKst));
  const limit = range.edDate ? d0(range.edDate) : null;
  const out = [];
  for (let i = 0; i < DAYS_AHEAD + 7 && out.length < DAYS_AHEAD; i++, day = new Date(day.getTime() + 864e5)) {
    if (limit && day > limit) break;
    const key = iso(day), weekend = [0,6].includes(day.getUTCDay());
    if (HOLIDAYS[key]) continue;
    const todays = prepared.filter(c => meets(c, day));
    const slots = (weekend ? WEEKEND_SLOTS : WEEKDAY_SLOTS).map(([a,b]) => {
      const label = b ? `${a}–${b}` : `${a} 이후`;
      if (!b) return [label, '0'.repeat(ROOMS.length)];
      const s = mins(a), e = mins(b);
      return [label, [...ROOMS].map(r => todays.some(c => c.room === r && c.s < e && c.e > s) ? '0' : '1').join('')];
    });
    out.push({ date: key, dow: DOW[day.getUTCDay()], weekend, slots });
  }
  return JSON.stringify({ updated: nowKst.toISOString().slice(0,16).replace('T',' '), rooms: ROOMS, days: out });
})()
