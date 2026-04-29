import { useState, useEffect } from 'react'
import { db } from './firebase'
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore'

const ADMIN_PW = 'annakuooo'
const COLLECTION = 'ho_tlc_2025'

export default function App() {
  const [tab, setTab] = useState('form')
  const [needTicket, setNeedTicket] = useState(false)
  const [form, setForm] = useState({ name: '', ticket: '', holder: '', phone: '', note: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState(false)
  const [records, setRecords] = useState([])
  const [lastUpdate, setLastUpdate] = useState('')

  useEffect(() => {
    if (!authed) return
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLastUpdate(new Date().toLocaleString('zh-TW', { hour12: false }))
    })
    return () => unsub()
  }, [authed])

  function switchMode(isNeed) {
    setNeedTicket(isNeed)
    setForm({ name: '', ticket: '', holder: '', phone: '', note: '' })
    setErrors({})
    setSuccess('')
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = true
    if (!needTicket) {
      if (!form.ticket.trim()) e.ticket = true
      if (!form.holder.trim()) e.holder = true
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setSubmitting(true)
    try {
      await addDoc(collection(db, COLLECTION), {
        type: needTicket ? '需要調票' : '已有票',
        name: form.name.trim(),
        ticket: needTicket ? '—' : form.ticket.trim().toUpperCase(),
        holder: needTicket ? form.name.trim() : form.holder.trim(),
        phone: form.phone.trim(),
        note: form.note.trim(),
        createdAt: serverTimestamp(),
        timeLabel: new Date().toLocaleString('zh-TW', { hour12: false })
      })
      setSuccess(needTicket
        ? `${form.name} 的調票需求已登記`
        : `票號 ${form.ticket.toUpperCase()}，持票人 ${form.holder}`
      )
      setForm({ name: '', ticket: '', holder: '', phone: '', note: '' })
      setTimeout(() => setSuccess(''), 5000)
    } catch (e) {
      alert('送出失敗：' + e.message)
    }
    setSubmitting(false)
  }

  function handlePw() {
    if (pw === ADMIN_PW) { setAuthed(true); setPwErr(false) }
    else { setPwErr(true) }
  }

  function exportCSV(filterType) {
    const label = filterType === '已有票' ? '劃位名單' : filterType === '需要調票' ? '調票名單' : '完整名單'
    const filtered = filterType ? records.filter(r => r.type === filterType) : records
    if (!filtered.length) { alert(`尚無${label}資料`); return }
    const BOM = '\uFEFF'
    const hdr = filterType === '已有票'
      ? ['#', '姓名', '大會票號', '持票人', '聯絡電話', '備註', '登記時間']
      : filterType === '需要調票'
        ? ['#', '姓名', '聯絡電話', '備註', '登記時間']
        : ['#', '狀態', '姓名', '大會票號', '持票人', '聯絡電話', '備註', '登記時間']
    const rows = filtered.map((r, i) => {
      const row = filterType === '已有票'
        ? [i + 1, r.name, r.ticket, r.holder, r.phone, r.note, r.timeLabel]
        : filterType === '需要調票'
          ? [i + 1, r.name, r.phone, r.note, r.timeLabel]
          : [i + 1, r.type, r.name, r.ticket, r.holder, r.phone, r.note, r.timeLabel]
      return row.map(v => `"${String(v || '').replace(/"/g, '""')}"`) .join(',')
    })
    const csv = BOM + [hdr.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `HO組_${label}_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '-')}.csv`
    a.click()
  }

  const hasTicket = records.filter(r => r.type === '已有票').length
  const needsTicket = records.filter(r => r.type === '需要調票').length

  return (
    <>
      {/* HEADER */}
      <header style={S.hdr}>
        <div style={S.hdrAccent} />
        <div style={S.eyebrow}><span style={{ color: 'var(--mint)' }}>HO</span> · 座位登記</div>
        <div style={S.hdrTitle}>台灣領導者大會</div>
        <div style={S.hdrYear}>2025</div>
        <div style={S.hdrRule} />
        <div style={S.hdrMeta}>
          {[['日期', '5 / 23 — 5 / 24'], ['地點', '南港展覽館'], ['組別', 'HO']].map(([l, v]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={S.metaLbl}>{l}</div>
              <div style={S.metaVal}>{v}</div>
            </div>
          ))}
        </div>
      </header>

      {/* TABS */}
      <div style={S.tabBar}>
        {[['form', '我要登記'], ['admin', '管理名單']].map(([key, label]) => (
          <button key={key} style={{ ...S.tab, ...(tab === key ? S.tabActive : {}) }}
            onClick={() => setTab(key)}>
            {label}
            {tab === key && <span style={S.tabUnderline} />}
          </button>
        ))}
      </div>

      {/* FORM PANEL */}
      {tab === 'form' && (
        <div style={S.wrap}>
          <div style={S.card}>

            {/* MODE TOGGLE */}
            <div style={S.modeWrap}>
              <button
                style={{ ...S.modeBtn, ...(needTicket ? {} : S.modeBtnActive) }}
                onClick={() => switchMode(false)}>
                我已有票
              </button>
              <button
                style={{ ...S.modeBtn, ...(needTicket ? S.modeBtnNeed : {}) }}
                onClick={() => switchMode(true)}>
                我沒有票，需要調票
              </button>
            </div>

            {needTicket && (
              <div style={S.needNotice}>
                登記後組長將協助安排調票，請留下聯絡電話方便聯繫。
              </div>
            )}

            {!needTicket && (
              <div style={S.notice}>
                請務必填寫正確票號與全名，以實際票券為準。資料送出後將即時同步，請確認無誤再提交。
              </div>
            )}

            <div style={S.secLabel}>
              {needTicket ? '調票申請資料' : '登記資料'}
            </div>

            <Field label="姓名" required error={errors.name} errMsg="請填寫姓名">
              <input style={{ ...S.input, ...(errors.name ? S.inputErr : {}) }}
                value={form.name} placeholder={needTicket ? '請填寫全名' : '購票登記之全名'}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onFocus={e => e.target.style.borderBottomColor = 'var(--ink)'}
                onBlur={e => e.target.style.borderBottomColor = errors.name ? 'var(--err)' : 'var(--line)'}
              />
            </Field>

            {!needTicket && (
              <div style={S.row2}>
                <Field label="大會票號" required error={errors.ticket} errMsg="請填寫大會票號">
                  <input style={{ ...S.input, ...(errors.ticket ? S.inputErr : {}) }}
                    value={form.ticket}
                    onChange={e => setForm(f => ({ ...f, ticket: e.target.value.toUpperCase() }))}
                    onFocus={e => e.target.style.borderBottomColor = 'var(--ink)'}
                    onBlur={e => e.target.style.borderBottomColor = errors.ticket ? 'var(--err)' : 'var(--line)'}
                  />
                </Field>
                <Field label="持票人姓名" required error={errors.holder} errMsg="請填寫持票人姓名">
                  <input style={{ ...S.input, ...(errors.holder ? S.inputErr : {}) }}
                    value={form.holder} placeholder="實際入場者全名"
                    onChange={e => setForm(f => ({ ...f, holder: e.target.value }))}
                    onFocus={e => e.target.style.borderBottomColor = 'var(--ink)'}
                    onBlur={e => e.target.style.borderBottomColor = errors.holder ? 'var(--err)' : 'var(--line)'}
                  />
                </Field>
              </div>
            )}

            <Field label="聯絡電話" hint={needTicket ? '必填，方便調票聯繫' : '選填'}>
              <input style={S.input} type="tel" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                onFocus={e => e.target.style.borderBottomColor = 'var(--ink)'}
                onBlur={e => e.target.style.borderBottomColor = 'var(--line)'}
              />
            </Field>

            <Field label="備註" hint="選填">
              <input style={S.input} value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                onFocus={e => e.target.style.borderBottomColor = 'var(--ink)'}
                onBlur={e => e.target.style.borderBottomColor = 'var(--line)'}
              />
            </Field>

            <button
              style={{ ...S.btnPrimary, ...(needTicket ? S.btnNeed : {}), opacity: submitting ? 0.5 : 1 }}
              disabled={submitting} onClick={handleSubmit}>
              {submitting ? '處理中...' : (needTicket ? '送出調票申請' : '確認提交')}
            </button>

            {success && (
              <div style={needTicket ? S.successNeed : S.successBox}>
                {needTicket ? '調票申請已收到' : '登記完成，資料已即時同步'}
                <small style={{ display: 'block', color: 'var(--ink2)', marginTop: 5, fontSize: 13, fontWeight: 400 }}>
                  {success}
                </small>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADMIN PANEL */}
      {tab === 'admin' && (
        !authed ? (
          <div style={{ maxWidth: 360, margin: '48px auto 0', padding: '0 24px' }}>
            <div style={S.card}>
              <div style={{ textAlign: 'center' }}>
                <div style={S.secLabel}>管理員入口</div>
                <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 30, fontWeight: 400, marginBottom: 8 }}>身份驗證</div>
                <p style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 32, lineHeight: 1.7 }}>請輸入管理密碼<br />以查看完整登記名單</p>
                <input type="password" style={{ ...S.input, textAlign: 'center', fontSize: 22, letterSpacing: '.3em' }}
                  value={pw} placeholder="· · · · · ·"
                  onChange={e => setPw(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePw()}
                  onFocus={e => e.target.style.borderBottomColor = 'var(--ink)'}
                  onBlur={e => e.target.style.borderBottomColor = 'var(--line)'}
                />
                <button style={{ ...S.btnPrimary, marginTop: 22 }} onClick={handlePw}>進入管理</button>
                {pwErr && <div style={{ fontSize: 11, color: 'var(--err)', marginTop: 14, letterSpacing: '.05em' }}>密碼錯誤，請再試一次</div>}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 960, margin: '32px auto 0', padding: '0 24px' }}>
            <div style={S.card}>
              <div style={S.adminHeader}>
                <div>
                  <div style={S.secLabel}>HO 組 · 即時名單</div>
                  <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 30, fontWeight: 400 }}>台灣領導者大會 2025</div>
                  {lastUpdate && <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 6 }}>最後更新 {lastUpdate}</div>}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button style={S.btnOutline} onClick={() => exportCSV('已有票')}>匯出劃位名單</button>
                  <button style={S.btnOutline} onClick={() => exportCSV('需要調票')}>匯出調票名單</button>
                  <button style={{ ...S.btnOutline, color: 'var(--ink3)', borderColor: 'var(--line)' }} onClick={() => exportCSV()}>匯出完整名單</button>
                </div>
              </div>

              <div style={S.statBand}>
                <div style={S.statCell}>
                  <div style={S.statLbl}>登記總人數</div>
                  <div style={S.statVal}>{records.length}</div>
                </div>
                <div style={S.statCell}>
                  <div style={S.statLbl}>已有票</div>
                  <div style={{ ...S.statVal, color: 'var(--mint)' }}>{hasTicket}</div>
                </div>
                <div style={S.statCell}>
                  <div style={S.statLbl}>需要調票</div>
                  <div style={{ ...S.statVal, color: 'var(--amber)' }}>{needsTicket}</div>
                </div>
              </div>

              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      {['#', '狀態', '姓名', '票號', '持票人', '電話', '備註', '登記時間'].map(h => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: '52px', color: 'var(--ink3)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase' }}>尚無登記資料</td></tr>
                    ) : records.map((r, i) => (
                      <tr key={r.id} style={S.tr}>
                        <td style={{ ...S.td, ...S.cNum }}>{i + 1}</td>
                        <td style={S.td}>
                          <span style={r.type === '需要調票' ? S.tagNeed : S.tagHas}>
                            {r.type}
                          </span>
                        </td>
                        <td style={{ ...S.td, fontWeight: 700 }}>{r.name}</td>
                        <td style={S.td}>
                          {r.ticket === '—'
                            ? <span style={{ color: 'var(--ink3)' }}>—</span>
                            : <span style={S.ticketTag}>{r.ticket}</span>
                          }
                        </td>
                        <td style={S.td}>{r.holder}</td>
                        <td style={{ ...S.td, ...S.cDim }}>{r.phone || '—'}</td>
                        <td style={{ ...S.td, ...S.cDim }}>{r.note || '—'}</td>
                        <td style={{ ...S.td, fontSize: 11, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>{r.timeLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}
    </>
  )
}

function Field({ label, required, hint, error, errMsg, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--ink2)', marginBottom: 10 }}>
        {label}
        {required && <span style={{ color: 'var(--err)', marginLeft: 2 }}>*</span>}
        {hint && <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none', fontSize: 11, marginLeft: 6, color: 'var(--ink3)' }}>{hint}</span>}
      </label>
      {children}
      {error && errMsg && <div style={{ fontSize: 10.5, color: 'var(--err)', marginTop: 7, letterSpacing: '.06em' }}>{errMsg}</div>}
    </div>
  )
}

const S = {
  hdr: { background: 'var(--ink)', padding: '52px 24px 46px', textAlign: 'center', position: 'relative', overflow: 'hidden' },
  hdrAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent 0%, #2A8A7E 35%, #C8A96E 65%, transparent 100%)' },
  eyebrow: { fontSize: 10, fontWeight: 700, letterSpacing: '.24em', color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', marginBottom: 22 },
  hdrTitle: { fontFamily: '"Cormorant Garamond", serif', fontSize: 40, fontWeight: 400, color: '#fff', letterSpacing: '.02em', lineHeight: 1.15 },
  hdrYear: { fontSize: 13, fontWeight: 700, letterSpacing: '.3em', color: '#C8A96E', marginTop: 10, textTransform: 'uppercase' },
  hdrRule: { width: 1, height: 32, background: 'rgba(255,255,255,.15)', margin: '22px auto' },
  hdrMeta: { display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' },
  metaLbl: { fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', marginBottom: 4 },
  metaVal: { fontSize: 13, color: 'rgba(255,255,255,.7)', fontWeight: 500, letterSpacing: '.03em' },

  tabBar: { maxWidth: 600, margin: '36px auto 0', padding: '0 24px', display: 'flex', borderBottom: '1px solid var(--line)' },
  tab: { background: 'none', border: 'none', padding: '13px 0', marginRight: 32, fontFamily: '"Noto Sans TC", sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink3)', position: 'relative', transition: 'color .2s' },
  tabActive: { color: 'var(--ink)' },
  tabUnderline: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 1.5, background: 'var(--ink)', display: 'block' },

  wrap: { maxWidth: 600, margin: '32px auto 0', padding: '0 24px' },
  card: { background: 'var(--surface)', boxShadow: 'var(--shadow)', padding: '40px 36px' },

  modeWrap: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginBottom: 32, border: '1px solid var(--line)' },
  modeBtn: { background: 'transparent', border: 'none', padding: '14px 12px', fontFamily: '"Noto Sans TC", sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink3)', cursor: 'pointer', transition: 'all .2s', borderRight: '1px solid var(--line)' },
  modeBtnActive: { background: 'var(--ink)', color: '#fff' },
  modeBtnNeed: { background: 'var(--amber)', color: '#fff' },

  notice: { borderTop: '1px solid var(--amber)', borderBottom: '1px solid var(--amber)', padding: '14px 0', marginBottom: 36, fontSize: 12, lineHeight: 1.9, color: 'var(--amber)', letterSpacing: '.04em' },
  needNotice: { background: '#FDF3E3', borderLeft: '2px solid var(--amber)', padding: '12px 14px', marginBottom: 32, fontSize: 12, lineHeight: 1.8, color: 'var(--amber)', letterSpacing: '.03em' },
  secLabel: { fontSize: 9, fontWeight: 700, letterSpacing: '.24em', color: 'var(--ink3)', textTransform: 'uppercase', marginBottom: 28 },

  input: { width: '100%', border: 'none', borderBottom: '1px solid var(--line)', borderRadius: 0, padding: '10px 0', fontSize: 16, fontFamily: '"Noto Sans TC", sans-serif', color: 'var(--ink)', background: 'transparent', outline: 'none', transition: 'border-color .2s' },
  inputErr: { borderBottomColor: 'var(--err)' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 36px' },

  btnPrimary: { width: '100%', background: 'var(--ink)', color: '#fff', border: 'none', padding: 18, fontSize: 11, fontWeight: 700, fontFamily: '"Noto Sans TC", sans-serif', letterSpacing: '.22em', textTransform: 'uppercase', cursor: 'pointer', marginTop: 4, transition: 'background .25s' },
  btnNeed: { background: 'var(--amber)' },
  btnOutline: { background: 'transparent', border: '1px solid var(--line)', padding: '10px 24px', fontSize: 10.5, fontWeight: 700, fontFamily: '"Noto Sans TC", sans-serif', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink2)', cursor: 'pointer' },

  successBox: { borderTop: '1px solid var(--mint)', paddingTop: 16, marginTop: 22, fontSize: 11.5, letterSpacing: '.08em', color: 'var(--mint)', textTransform: 'uppercase' },
  successNeed: { borderTop: '1px solid var(--amber)', paddingTop: 16, marginTop: 22, fontSize: 11.5, letterSpacing: '.08em', color: 'var(--amber)', textTransform: 'uppercase' },

  adminHeader: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, paddingBottom: 28, borderBottom: '1px solid var(--line)', marginBottom: 0 },
  statBand: { display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 28 },
  statCell: { padding: '28px 32px', borderRight: '1px solid var(--line)' },
  statLbl: { fontSize: 9, fontWeight: 700, letterSpacing: '.18em', color: 'var(--ink3)', textTransform: 'uppercase', marginBottom: 8 },
  statVal: { fontFamily: '"Cormorant Garamond", serif', fontSize: 52, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 },

  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 },
  th: { fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--ink3)', padding: '0 14px 12px', textAlign: 'left', borderBottom: '1px solid var(--line)' },
  tr: { borderBottom: '1px solid var(--line)' },
  td: { padding: '15px 14px', verticalAlign: 'middle' },
  cNum: { fontSize: 11, color: 'var(--ink3)' },
  cDim: { color: 'var(--ink3)', fontSize: 12 },
  ticketTag: { fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: 'var(--mint)', background: 'var(--mint-dim)', padding: '3px 8px', display: 'inline-block' },
  tagHas: { fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: 'var(--mint)', background: 'var(--mint-dim)', padding: '3px 8px', display: 'inline-block', whiteSpace: 'nowrap' },
  tagNeed: { fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: 'var(--amber)', background: '#FDF3E3', padding: '3px 8px', display: 'inline-block', whiteSpace: 'nowrap' },
}
