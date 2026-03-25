import { useState, useEffect, useRef } from 'react'
import './Main.css'

const HR={'q':0,'x':1,'z':2,'y':3,'f':4,'v':5,'w':6,'g':7,'h':8,'j':9,'k':10,'b':11,'c':12,'d':13,'p':14,'t':15,'l':16,'m':17,'n':18,'r':19,'s':20,'u':21,'i':22,'e':23,'o':24,'a':25}

function getHardness(w){if(!w)return 99;const c=w[w.length-1].toLowerCase();return HR[c]!==undefined?HR[c]:99}

function lowerBound(arr,t){let l=0,r=arr.length;while(l<r){let m=(l+r)>>1;if(arr[m]<t)l=m+1;else r=m}return l}

export default function Main(){
  const [database,setDatabase]=useState([])
  const [dbReady,setDbReady]=useState(false)
  const [mode,setMode]=useState('awal')
  const [hasil,setHasil]=useState([])
  const [lastInput,setLastInput]=useState('')
  const [lastInputAwal,setLastInputAwal]=useState('')
  const [lastInputAkhir,setLastInputAkhir]=useState('')
  const [currentPage,setCurrentPage]=useState(1)
  const [favWords,setFavWords]=useState(()=>{try{return JSON.parse(localStorage.getItem('sk_favs')||'[]')}catch{return[]}})
  const [hiddenWords,setHiddenWords]=useState(()=>{try{return new Set(JSON.parse(localStorage.getItem('sk_hidden')||'[]'))}catch{return new Set()}})
  const [reportedWords,setReportedWords]=useState(()=>{try{return new Set(JSON.parse(localStorage.getItem('sk_reported')||'[]'))}catch{return new Set()}})
  const [trendAwal,setTrendAwal]=useState([])
  const [trendAkhir,setTrendAkhir]=useState([])
  const [showRModal,setShowRModal]=useState(false)
  const [rWord,setRWord]=useState(null)
  const [rBtn,setRBtn]=useState(null)
  const [showFavModal,setShowFavModal]=useState(false)
  const [showSheet,setShowSheet]=useState(false)
  const [settings,setSettings]=useState(null)

  const PAGE_SIZE=100
  const trackedQueries=useRef(new Set())
  const searchTimer=useRef(null)
  const inputHurufRef=useRef(null)
  const inputAwalRef=useRef(null)
  const inputAkhirRef=useRef(null)
  const resultRef=useRef(null)
  const sheetBodyRef=useRef(null)

  useEffect(()=>{
    const raw=window.__KBBI__
    if(!raw||!Array.isArray(raw))return
    const wc=`self.onmessage=function(e){const db=[...new Set(e.data.map(k=>k.trim()).filter(k=>k.length>0))].sort();self.postMessage(db)}`
    const worker=new Worker(URL.createObjectURL(new Blob([wc],{type:'application/javascript'})))
    worker.postMessage(raw)
    worker.onmessage=function(e){
      setDatabase(e.data)
      setDbReady(true)
      worker.terminate()
      try{delete window.__KBBI__}catch(err){}
      if(inputHurufRef.current)inputHurufRef.current.disabled=false
      if(inputAwalRef.current)inputAwalRef.current.disabled=false
      if(inputAkhirRef.current)inputAkhirRef.current.disabled=false
    }
  },[])

  useEffect(()=>{
    fetch('settings.json').then(r=>r.json()).then(cfg=>{
      setTrendAwal(cfg.trending_awal||[])
      setTrendAkhir(cfg.trending_akhir||[])
      setSettings(cfg)
    }).catch(()=>{})
  },[])

  useEffect(()=>{
    localStorage.setItem('sk_favs',JSON.stringify(favWords))
  },[favWords])

  useEffect(()=>{
    localStorage.setItem('sk_hidden',JSON.stringify([...hiddenWords]))
  },[hiddenWords])

  useEffect(()=>{
    localStorage.setItem('sk_reported',JSON.stringify([...reportedWords]))
  },[reportedWords])

  const isFav=w=>favWords.some(f=>f.word===w)

  const toggleFav=(w,el)=>{
    if(isFav(w)){setShowFavModal(true);return}
    const q=mode==='kepit'?lastInputAwal+'···'+lastInputAkhir:lastInput
    setFavWords([...favWords,{word:w,query:q,mode:mode}])
    if(el){el.classList.add('active')}
  }

  const removeFav=w=>{
    setFavWords(favWords.filter(f=>f.word!==w))
  }

  const clearAllFav=()=>{
    if(!favWords.length||!confirm('Hapus semua '+favWords.length+' kata favorit?'))return
    setFavWords([])
    setShowFavModal(false)
  }

  const toggleHide=w=>{
    const newHidden=new Set(hiddenWords)
    if(newHidden.has(w))newHidden.delete(w);else newHidden.add(w)
    setHiddenWords(newHidden)
  }

  const clearAllHidden=()=>{
    if(!hiddenWords.size||!confirm('Tampilkan semua '+hiddenWords.size+' kata tersembunyi?'))return
    setHiddenWords(new Set())
    setShowSheet(false)
  }

  const getVisible=h=>h.filter(k=>!hiddenWords.has(k))

  const cari=()=>{
    if(!dbReady)return
    if(mode==='kepit'){cariKepit();return}
    const raw=(inputHurufRef.current?.value||'').toLowerCase().trim()
    const input=raw.slice(0,3)
    if(inputHurufRef.current)inputHurufRef.current.value=input
    setLastInput(input)
    setCurrentPage(1)

    if(!input){
      setHasil([])
      return
    }

    clearTimeout(searchTimer.current)
    searchTimer.current=setTimeout(()=>{
      const key=mode+':'+input
      if(!trackedQueries.current.has(key)){
        trackedQueries.current.add(key)
        fetch('/api/ping',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({page:location.pathname,ref:document.referrer||'-',search:input,searchMode:mode})}).catch(()=>{})
      }
    },800)

    if(mode==='awal'){
      let res=database.slice(lowerBound(database,input),lowerBound(database,input+'zzz'))
      res.sort((a,b)=>getHardness(a)-getHardness(b))
      setHasil(res)
    }else{
      let res=database.filter(k=>k.endsWith(input))
      res.sort((a,b)=>a.localeCompare(b))
      setHasil(res)
    }
  }

  const cariKepit=()=>{
    if(!dbReady)return
    const rawA=(inputAwalRef.current?.value||'').toLowerCase().trim().slice(0,3)
    const rawB=(inputAkhirRef.current?.value||'').toLowerCase().trim().slice(0,3)
    if(inputAwalRef.current)inputAwalRef.current.value=rawA
    if(inputAkhirRef.current)inputAkhirRef.current.value=rawB
    setLastInputAwal(rawA)
    setLastInputAkhir(rawB)
    setCurrentPage(1)

    if(!rawA&&!rawB){setHasil([]);return}

    let res=database.filter(k=>{
      if(rawA&&rawB)return k.startsWith(rawA)&&k.endsWith(rawB)&&k.length>rawA.length+rawB.length
      if(rawA)return k.startsWith(rawA)
      return k.endsWith(rawB)
    })
    res.sort((a,b)=>a.localeCompare(b))
    setHasil(res)
  }

  const makeWordRow=(w,num,wordHtml)=>{
    const isRep=reportedWords.has(w),isFaved=isFav(w)
    return (
      <div key={w+num} className="word-row" onClick={()=>navigator.clipboard.writeText(w)}>
        <span className="word-num">{num}</span>
        <span className="word-text" dangerouslySetInnerHTML={{__html:wordHtml}}/>
        <button className={`fav-btn${isFaved?' active':''}`} onClick={e=>{e.stopPropagation();toggleFav(w,e.currentTarget)}} title={isFaved?'Lihat di favorit':'Tambah ke favorit'}>
          <i className={`${isFaved?'fa-solid':'fa-regular'} fa-heart`}/>
        </button>
        <button className={`report-btn${isRep?' reported':''}`} onClick={e=>{e.stopPropagation();if(!isRep){setRWord(w);setRBtn(e.currentTarget);setShowRModal(true)}}} title={isRep?'Sudah dilaporkan':'Laporkan kata ini'}>⚑</button>
        <button className="hide-btn" onClick={e=>{e.stopPropagation();toggleHide(w)}} title="Sembunyikan">−</button>
      </div>
    )
  }

  const renderAwal=()=>{
    const vis=getVisible(hasil)
    const page=(currentPage-1)*PAGE_SIZE
    return vis.slice(page,page+PAGE_SIZE).map((k,i)=>{
      const num=page+i+1
      const highlighted=`<span class="chip-prefix">${k.slice(0,lastInput.length)}</span>${k.slice(lastInput.length)}`
      return makeWordRow(k,num,highlighted)
    })
  }

  const renderAkhir=()=>{
    const vis=getVisible(hasil)
    const page=(currentPage-1)*PAGE_SIZE
    const words=vis.slice(page,page+PAGE_SIZE)
    let lastLetter=''
    return words.flatMap((w,i)=>{
      const num=page+i+1
      const letter=w[0].toUpperCase()
      const items=[]
      if(letter!==lastLetter){
        lastLetter=letter
        items.push(<div key={'header-'+letter} className="alpha-header-row"><span className="alpha-badge">{letter}</span></div>)
      }
      const highlighted=`${w.slice(0,-lastInput.length)}<span class="chip-suffix">${w.slice(-lastInput.length)}</span>`
      items.push(makeWordRow(w,num,highlighted))
      return items
    })
  }

  const renderKepit=()=>{
    const vis=getVisible(hasil)
    const page=(currentPage-1)*PAGE_SIZE
    const words=vis.slice(page,page+PAGE_SIZE)
    let lastLetter=''
    return words.flatMap((w,i)=>{
      const num=page+i+1
      const letter=w[0].toUpperCase()
      const items=[]
      if(letter!==lastLetter){
        lastLetter=letter
        items.push(<div key={'header-'+letter} className="alpha-header-row"><span className="alpha-badge">{letter}</span></div>)
      }
      let wordHtml=''
      if(lastInputAwal&&lastInputAkhir)wordHtml=`<span class="chip-prefix">${lastInputAwal}</span>${w.slice(lastInputAwal.length,-lastInputAkhir.length)}<span class="chip-suffix">${lastInputAkhir}</span>`
      else if(lastInputAwal)wordHtml=`<span class="chip-prefix">${lastInputAwal}</span>${w.slice(lastInputAwal.length)}`
      else wordHtml=`${w.slice(0,-lastInputAkhir.length)}<span class="chip-suffix">${lastInputAkhir}</span>`
      items.push(makeWordRow(w,num,wordHtml))
      return items
    })
  }

  const confirmReport=()=>{
    if(!rWord)return
    const w=rWord
    setShowRModal(false)
    setReportedWords(new Set([...reportedWords,w]))
    if(rBtn)rBtn.classList.add('reported')
    fetch('/api/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({word:w,mode:mode})}).catch(()=>{})
    setRWord(null)
    setRBtn(null)
  }

  const vis=getVisible(hasil)
  const totalPages=Math.ceil(vis.length/PAGE_SIZE)
  const showPagination=totalPages>1
  const hasSearch=mode==='kepit'?(lastInputAwal||lastInputAkhir):lastInput

  return (
    <>
      <div className="top">
        <div className="header">
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <img src="sambungkata.jpg" alt="logo" style={{width:'38px',height:'38px',borderRadius:'8px',objectFit:'cover',flexShrink:0}}/>
            <div>
              <h1>Sambung Kata</h1>
              <div className="dev-tag">— by <a className="dev-link" href="https://tiktok.com/@_yudxx" target="_blank" rel="noopener">@Givyx</a></div>
            </div>
          </div>
          <div className="info-block">
            <div className="info">{dbReady?database.length.toLocaleString()+' kata':'memuat...'}</div>
            {hasSearch&&vis.length>0&&<div className="info-total visible">{vis.length.toLocaleString()+' hasil'}</div>}
            <div className="info-actions">
              <button className="fav-header-btn" onClick={()=>setShowFavModal(true)}>
                <i className="fa-solid fa-heart"/> Favorit {favWords.length>0&&<span className="fav-hb-count on">{favWords.length}</span>}
              </button>
            </div>
          </div>
        </div>
        <div className="mode">
          <button className={mode==='awal'?'active':''} onClick={()=>{setMode('awal');setLastInputAwal('');setLastInputAkhir('');setCurrentPage(1)}}>Awalan</button>
          <button className={mode==='akhir'?'active':''} onClick={()=>{setMode('akhir');setCurrentPage(1)}}>Akhiran</button>
          <button className={mode==='kepit'?'active':''} onClick={()=>{setMode('kepit');setLastInput('');setCurrentPage(1)}}>Awal+Akhir</button>
        </div>
        {mode!=='kepit'?(
          <div className="input-wrap-single">
            <div className="input-wrap">
              <input ref={inputHurufRef} type="text" maxLength="3" placeholder="memuat kata..." disabled={!dbReady} onChange={cari} onInput={(e)=>{if(e.target.value.length>3)e.target.value=e.target.value.slice(0,3)}}/>
              {lastInput&&<button className="input-clear visible" onClick={()=>{if(inputHurufRef.current){inputHurufRef.current.value='';setLastInput('');setHasil([])}}} title="Hapus">✕</button>}
            </div>
          </div>
        ):(
          <div className="input-dual on">
            <div className="input-wrap">
              <input ref={inputAwalRef} type="text" maxLength="3" placeholder="Awalan" disabled={!dbReady} onChange={cariKepit} onInput={(e)=>{if(e.target.value.length>3)e.target.value=e.target.value.slice(0,3)}}/>
              {lastInputAwal&&<button className="input-clear visible" onClick={()=>{if(inputAwalRef.current){inputAwalRef.current.value='';setLastInputAwal('');cariKepit()}}} title="Hapus">✕</button>}
            </div>
            <span className="input-sep">···</span>
            <div className="input-wrap">
              <input ref={inputAkhirRef} type="text" maxLength="3" placeholder="Akhiran" disabled={!dbReady} onChange={cariKepit} onInput={(e)=>{if(e.target.value.length>3)e.target.value=e.target.value.slice(0,3)}}/>
              {lastInputAkhir&&<button className="input-clear visible" onClick={()=>{if(inputAkhirRef.current){inputAkhirRef.current.value='';setLastInputAkhir('');cariKepit()}}} title="Hapus">✕</button>}
            </div>
          </div>
        )}
        <a href="https://whatsapp.com/channel/0029Vb7dTNqGk1FzeHcvEs2N" target="_blank" rel="noopener" className="wa-banner">
          <div className="wa-banner-icon"><i className="fa-brands fa-whatsapp"/></div>
          <div className="wa-banner-text">
            <span className="wa-banner-title">Follow saluran WhatsApp</span>
            <span className="wa-banner-sub">Dapatkan info update website ini 🔔</span>
          </div>
          <div className="wa-banner-arrow"><span style={{fontSize:'15px',color:'#25D366'}}>open_in_new</span></div>
        </a>
      </div>

      <div className="loading-bar-wrap" style={{display:dbReady?'none':''}}>
        <div className="loading-bar indeterminate"/>
      </div>

      <div className={`trending-wrap${!hasSearch&&dbReady?'visible':''}`}>
        <div className="trending-inner">
          <div className="trending-label">🔥 Populer</div>
          <div className="trending-chips">
            {(mode==='awal'?trendAwal:trendAkhir).map((item,i)=>{
              const q=typeof item==='object'?item.q:item
              const hot=typeof item==='object'?!!item.hot:false
              return <div key={i} className={`trend-chip${hot?' hot':''}`} onClick={()=>{if(mode==='kepit'){if(inputAwalRef.current)inputAwalRef.current.value=q.slice(0,3);cariKepit()}else{if(inputHurufRef.current)inputHurufRef.current.value=q.slice(0,3);cari()}}}>{q.toUpperCase()}{hot&&' 🔥'}</div>
            })}
          </div>
        </div>
      </div>

      {hasSearch&&vis.length>0&&(
        <div className="result-toolbar visible">
          <span className="toolbar-count">{vis.length.toLocaleString()+(mode==='kepit'?' kata':'')+' ditemukan'}</span>
          <button className="toolbar-copy" onClick={()=>{navigator.clipboard.writeText(vis.join('\n'))}}>
            <span style={{fontSize:'14px'}}>content_copy</span> Salin Semua
          </button>
        </div>
      )}

      <div className="result" ref={resultRef}>
        {!dbReady?<div className="empty"><span className="material-icons">hourglass_empty</span>sedang memuat kata...</div>:!hasSearch?<div className="empty"><span className="material-icons">keyboard</span>mulai ketik huruf</div>:vis.length===0?<div className="empty"><span className="material-icons">search_off</span>tidak ditemukan</div>:mode==='awal'?renderAwal():mode==='akhir'?renderAkhir():renderKepit()}
      </div>

      {hiddenWords.size>0&&(
        <div className="fab-hidden" onClick={()=>setShowSheet(true)}>
          <div className="fab-icon">⊘</div>
          {hiddenWords.size>0&&<div className="fab-count on">{hiddenWords.size}</div>}
        </div>
      )}

      {showPagination&&(
        <div className="pg-bar on">
          <button className={`pg-btn${currentPage<=1?' dim':''}`} onClick={()=>setCurrentPage(1)} title="Pertama">«</button>
          <button className={`pg-btn${currentPage<=1?' dim':''}`} onClick={()=>setCurrentPage(Math.max(1,currentPage-1))}>‹</button>
          <div className="pg-divider"/>
          <div className="pg-info"><b>{currentPage}</b> / {totalPages}</div>
          <div className="pg-divider"/>
          <button className={`pg-btn${currentPage>=totalPages?' dim':''}`} onClick={()=>setCurrentPage(Math.min(totalPages,currentPage+1))}>›</button>
          <button className={`pg-btn${currentPage>=totalPages?' dim':''}`} onClick={()=>setCurrentPage(totalPages)} title="Terakhir">»</button>
        </div>
      )}

      {showSheet&&(
        <>
          <div className="sheet-overlay on" onClick={()=>setShowSheet(false)}/>
          <div className="sheet on">
            <div className="sheet-handle"/>
            <div className="sheet-head">
              <span className="sheet-title">Kata Tersembunyi ({hiddenWords.size})</span>
              <button className="sheet-clear" onClick={clearAllHidden} style={{display:hiddenWords.size?'':'none'}}>Tampilkan Semua</button>
            </div>
            <div className="sheet-body" ref={sheetBodyRef}>
              {hiddenWords.size===0?<div className="sheet-empty">Belum ada kata yang disembunyikan</div>:[...hiddenWords].sort().map(w=>(
                <div key={w} className="sheet-row">
                  <span className="sheet-word">{w}</span>
                  <button className="sheet-restore" onClick={()=>toggleHide(w)} title="Tampilkan">+</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showFavModal&&(
        <div className="fav-modal on">
          <div className="fav-modal-topbar">
            <button className="fav-modal-back" onClick={()=>setShowFavModal(false)}><i className="fa-solid fa-chevron-left"/></button>
            <span className="fav-modal-title"><i className="fa-solid fa-heart" style={{color:'var(--green)'}}/> Kata Favorit</span>
            <button className="fav-modal-clear" onClick={clearAllFav} style={{display:favWords.length?'':'none'}}>Hapus Semua</button>
          </div>
          <div className="fav-modal-body">
            {favWords.length===0?<div className="fav-modal-empty"><span className="fav-empty-icon">♡</span>Belum ada kata favorit.</div>:favWords.length>0&&<>
              <div className="fav-jump-bar">{[...new Set(favWords.map(f=>f.word[0].toUpperCase()))].sort().map(l=>(
                <button key={l} className="fav-jump-chip" onClick={()=>{const el=document.querySelector(`[data-fav-grp="${l}"]`);if(el)el.scrollIntoView({block:'start',behavior:'smooth'})}}>{l}</button>
              ))}</div>
              {[...new Set(favWords.map(f=>f.word[0].toUpperCase()))].sort().flatMap(l=>{
                const items=favWords.filter(f=>f.word[0].toUpperCase()===l).sort((a,b)=>a.word.localeCompare(b.word))
                return [
                  <div key={'grp-'+l} data-fav-grp={l} className="fav-group-header">
                    <span className="fav-group-badge">{l}</span>
                    <span className="fav-group-count">{items.length} kata</span>
                  </div>,
                  ...items.map(f=>(
                    <div key={f.word} className="fav-row" onClick={()=>navigator.clipboard.writeText(f.word)}>
                      <span className="fav-row-word">{f.word}</span>
                      <button className="fav-row-remove" onClick={e=>{e.stopPropagation();removeFav(f.word)}} title="Hapus dari favorit"><i className="fa-solid fa-trash-can"/></button>
                    </div>
                  ))
                ]
              })}
            </>}
          </div>
        </div>
      )}

      {showRModal&&(
        <div className="rmodal-overlay on" onClick={()=>setShowRModal(false)}>
          <div className="rmodal" onClick={e=>e.stopPropagation()}>
            <div className="rmodal-handle"/>
            <div className="rmodal-icon">🚩</div>
            <div className="rmodal-title">Laporkan Kata Tidak Valid?</div>
            <div className="rmodal-word">{rWord?.toUpperCase()}</div>
            <div className="rmodal-desc">Yakin kata ini <b>tidak bisa dipakai</b> di map Sambung Kata?<br/>Reportmu membantu kami membersihkan database. 🙏</div>
            <div className="rmodal-actions">
              <button className="rmodal-cancel" onClick={()=>setShowRModal(false)}>Batal</button>
              <button className="rmodal-confirm" onClick={confirmReport}>Ya, Laporkan ⚑</button>
            </div>
          </div>
        </div>
      )}

      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet"/>
    </>
  )
}
