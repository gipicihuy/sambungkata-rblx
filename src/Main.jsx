import { useState, useEffect, useRef } from 'react'
import { _k, _e } from './db.js'
import './Main.css'

const HR={'q':0,'x':1,'z':2,'y':3,'f':4,'v':5,'w':6,'g':7,'h':8,'j':9,'k':10,'b':11,'c':12,'d':13,'p':14,'t':15,'l':16,'m':17,'n':18,'r':19,'s':20,'u':21,'i':22,'e':23,'o':24,'a':25}

function getHardness(w){if(!w)return 99;const c=w[w.length-1].toLowerCase();return HR[c]!==undefined?HR[c]:99}

function lowerBound(arr,t){let l=0,r=arr.length;while(l<r){let m=(l+r)>>1;if(arr[m]<t)l=m+1;else r=m}return l}

function showBsToast(id,delay=6000){
  const el=document.getElementById(id)
  if(!el||!window.bootstrap)return
  const t=window.bootstrap.Toast.getOrCreateInstance(el,{delay})
  t.show()
}

export default function Main(){
  const [database,setDatabase]=useState([])
  const [dbReady,setDbReady]=useState(false)
  const [mode,setMode]=useState('awal')
  const [hasil,setHasil]=useState([])

  const [lastInputAwalMode,setLastInputAwalMode]=useState('')
  const [lastInputAkhirMode,setLastInputAkhirMode]=useState('')
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
  const [favCopied,setFavCopied]=useState(false)
  
  const [showFavModal,setShowFavModal]=useState(false)
  const [favModalVisible,setFavModalVisible]=useState(false)
  const [showSheet,setShowSheet]=useState(false)
  const [sheetVisible,setSheetVisible]=useState(false)
  const toastShown=useRef({})

  const PAGE_SIZE=100
  const trackedQueries=useRef(new Set())
  const searchTimer=useRef(null)
  const inputHurufRef=useRef(null)
  const inputAwalRef=useRef(null)
  const inputAkhirRef=useRef(null)
  const resultRef=useRef(null)

  useEffect(()=>{
    const d=new Uint8Array(_e.length)
    for(let i=0;i<_e.length;i++)d[i]=_e[i]^_k[i%_k.length]
    const raw=JSON.parse(new TextDecoder().decode(d))
    const wc=`self.onmessage=function(e){const db=[...new Set(e.data.map(k=>k.trim()).filter(k=>k.length>0))].sort();self.postMessage(db)}`
    const worker=new Worker(URL.createObjectURL(new Blob([wc],{type:'application/javascript'})))
    worker.postMessage(raw)
    worker.onmessage=function(e){
      setDatabase(e.data)
      setDbReady(true)
      worker.terminate()
      
      if(inputHurufRef.current)inputHurufRef.current.disabled=false
      if(inputAwalRef.current)inputAwalRef.current.disabled=false
      if(inputAkhirRef.current)inputAkhirRef.current.disabled=false
      const robloxEl=document.getElementById('toastRoblox')
      if(robloxEl&&window.bootstrap){
        const t=new window.bootstrap.Toast(robloxEl,{delay:6000})
        t.show()
        robloxEl.addEventListener('hidden.bs.toast',()=>showBsToast('toastWA',8000),{once:true})
      }
    }
  },[])

  useEffect(()=>{
    fetch('settings.json').then(r=>r.json()).then(cfg=>{
      setTrendAwal(cfg.trending_awal||[])
      setTrendAkhir(cfg.trending_akhir||[])
    }).catch(()=>{})
  },[])

  useEffect(()=>{localStorage.setItem('sk_favs',JSON.stringify(favWords))},[favWords])
  useEffect(()=>{localStorage.setItem('sk_hidden',JSON.stringify([...hiddenWords]))},[hiddenWords])
  useEffect(()=>{localStorage.setItem('sk_reported',JSON.stringify([...reportedWords]))},[reportedWords])

  const isFav=w=>favWords.some(f=>f.word===w)

  const toggleFav=(w,el)=>{
    if(isFav(w)){openFavModal();return}
    const q=mode==='kepit'?lastInputAwal+'···'+lastInputAkhir:mode==='awal'?lastInputAwalMode:lastInputAkhirMode
    setFavWords(prev=>[...prev,{word:w,query:q,mode:mode}])
    if(el){
      el.classList.add('active')
      const icon=el.querySelector('i')
      if(icon)icon.className='fa-solid fa-heart'
      el.style.transform='scale(1.4)'
      setTimeout(()=>{el.style.transform=''},180)
    }
    showBsToast('toastFavInfo',4000)
  }

  const removeFav=w=>{setFavWords(prev=>prev.filter(f=>f.word!==w))}

  const copyAllFav=()=>{
    if(!favWords.length)return
    const text=favWords.map(f=>f.word).sort((a,b)=>a.localeCompare(b)).join(', ')
    navigator.clipboard.writeText(text).then(()=>{
      setFavCopied(true)
      setTimeout(()=>setFavCopied(false),2000)
    })
  }

  const openFavModal=()=>{
    setShowFavModal(true)
    requestAnimationFrame(()=>requestAnimationFrame(()=>setFavModalVisible(true)))
  }
  const closeFavModal=()=>{
    setFavModalVisible(false)
    setTimeout(()=>setShowFavModal(false),300)
  }
  const clearAllFav=()=>{
    if(!favWords.length||!confirm('Hapus semua '+favWords.length+' kata favorit?'))return
    setFavWords([])
    closeFavModal()
  }

  const openSheet=()=>{
    setShowSheet(true)
    requestAnimationFrame(()=>requestAnimationFrame(()=>setSheetVisible(true)))
  }
  const closeSheet=()=>{
    setSheetVisible(false)
    setTimeout(()=>setShowSheet(false),300)
  }
  const clearAllHidden=()=>{
    if(!hiddenWords.size||!confirm('Tampilkan semua '+hiddenWords.size+' kata tersembunyi?'))return
    setHiddenWords(new Set())
    closeSheet()
  }

  const toggleHide=w=>{
    setHiddenWords(prev=>{
      const next=new Set(prev)
      if(next.has(w))next.delete(w);else next.add(w)
      return next
    })
  }

  const getVisible=h=>h.filter(k=>!hiddenWords.has(k))

  const cari=()=>{
    if(!dbReady)return
    if(mode==='kepit'){cariKepit();return}
    const raw=(inputHurufRef.current?.value||'').toLowerCase().trim()
    const input=raw.slice(0,5)
    if(inputHurufRef.current)inputHurufRef.current.value=input
    setCurrentPage(1)

    if(mode==='awal'){
      setLastInputAwalMode(input)
    } else {
      setLastInputAkhirMode(input)
    }

    if(!input){setHasil([]);return}

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
    const rawA=(inputAwalRef.current?.value||'').toLowerCase().trim().slice(0,5)
    const rawB=(inputAkhirRef.current?.value||'').toLowerCase().trim().slice(0,5)
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

  const confirmReport=()=>{
    if(!rWord)return
    setReportedWords(prev=>new Set([...prev,rWord]))
    if(rBtn){rBtn.classList.add('reported')}
    setShowRModal(false)
    const wordEl=document.getElementById('toastReportWord')
    if(wordEl)wordEl.textContent=rWord.toUpperCase()
    showBsToast('toastReport',4000)
    fetch('/api/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({word:rWord,mode})}).catch(()=>{})
    setRWord(null);setRBtn(null)
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
      const highlighted=`<span class="chip-prefix">${k.slice(0,lastInputAwalMode.length)}</span>${k.slice(lastInputAwalMode.length)}`
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
      const highlighted=`${w.slice(0,-lastInputAkhirMode.length)}<span class="chip-suffix">${w.slice(-lastInputAkhirMode.length)}</span>`
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

  const hasSearch=mode==='kepit'
    ?(lastInputAwal||lastInputAkhir)
    :mode==='awal'
      ?lastInputAwalMode
      :lastInputAkhirMode

  const vis=getVisible(hasil)
  const totalPages=Math.ceil(vis.length/PAGE_SIZE)
  const showPagination=totalPages>1

  const switchMode=(newMode)=>{
    if(newMode===mode)return
    setCurrentPage(1)

    if(newMode==='kepit'){
      if(inputAwalRef.current)inputAwalRef.current.value=''
      if(inputAkhirRef.current)inputAkhirRef.current.value=''
      setLastInputAwal('')
      setLastInputAkhir('')
      setHasil([])
      setMode(newMode)
    } else {
      const currentVal=mode==='kepit'
        ?(inputAwalRef.current?.value||'')
        :(inputHurufRef.current?.value||'')
      if(inputHurufRef.current)inputHurufRef.current.value=currentVal
      setMode(newMode)
      setTimeout(()=>{
        if(!currentVal){setHasil([]);return}
        if(newMode==='awal'){
          setLastInputAwalMode(currentVal)
          let res=database.slice(lowerBound(database,currentVal),lowerBound(database,currentVal+'zzz'))
          res.sort((a,b)=>getHardness(a)-getHardness(b))
          setHasil(res)
        } else {
          setLastInputAkhirMode(currentVal)
          let res=database.filter(k=>k.endsWith(currentVal))
          res.sort((a,b)=>a.localeCompare(b))
          setHasil(res)
        }
      },0)
    }
  }

  return (
    <>
      <div className="toast-container">
        <div id="toastRoblox" className="toast toast-roblox align-items-center" role="alert" aria-live="assertive" aria-atomic="true">
          <div className="toast-header">
            <span className="icon-roblox">!</span>
            <span className="me-auto">Warning</span>
            <button type="button" className="btn-close" data-bs-dismiss="toast" aria-label="Close"/>
          </div>
          <div className="toast-body">
            note: tidak semua kata yang disini bisa dipakai di map roblox <strong>Sambung Kata</strong>
          </div>
        </div>
        <div id="toastWA" className="toast toast-wa align-items-center" role="alert" aria-live="assertive" aria-atomic="true">
          <div className="toast-header">
            <span className="icon-wa"><i className="fa-brands fa-whatsapp"/></span>
            <span className="me-auto">Saluran WhatsApp</span>
            <button type="button" className="btn-close" data-bs-dismiss="toast" aria-label="Close"/>
          </div>
          <div className="toast-body">
            Follow saluran WhatsApp untuk mendapatkan info terbaru! <a href="https://whatsapp.com/channel/0029Vb7dTNqGk1FzeHcvEs2N" target="_blank" rel="noopener">Klik di sini 🔔</a>
          </div>
        </div>
        <div id="toastFavInfo" className="toast toast-fav-info align-items-center" role="alert" aria-live="assertive" aria-atomic="true">
          <div className="toast-header">
            <span className="icon-fav-info">♥</span>
            <span className="me-auto">Kata Favorit</span>
            <button type="button" className="btn-close" data-bs-dismiss="toast" aria-label="Close"/>
          </div>
          <div className="toast-body">
            Kata yang kamu favorit tersimpan di tombol <strong onClick={()=>{window.bootstrap?.Toast.getInstance(document.getElementById('toastFavInfo'))?.hide();openFavModal()}} style={{color:'#f97316',cursor:'pointer',textDecoration:'underline',textUnderlineOffset:'2px'}}>Favorit</strong>
          </div>
        </div>
        <div id="toastReport" className="toast toast-report align-items-center" role="alert" aria-live="assertive" aria-atomic="true">
          <div className="toast-header">
            <span className="icon-report">⚑</span>
            <span className="me-auto">Report Terkirim</span>
            <button type="button" className="btn-close" data-bs-dismiss="toast" aria-label="Close"/>
          </div>
          <div className="toast-body">
            Kata <strong id="toastReportWord"></strong> berhasil dilaporkan. Terima kasih!
          </div>
        </div>
      </div>

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
              <a href="/donatur" className="fav-header-btn" style={{
                textDecoration:'none',
                display:'inline-flex',
                alignItems:'center',
                justifyContent:'center',
                height:'32px',
                boxSizing:'border-box',
                border:'1px solid rgba(251,191,36,0.4)',
                background:'rgba(251,191,36,0.08)',
                color:'#fbbf24',
                boxShadow:'0 0 12px rgba(251,191,36,0.1)',
                padding:'0 10px'
              }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(251,191,36,0.18)';e.currentTarget.style.borderColor='rgba(251,191,36,0.65)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(251,191,36,0.08)';e.currentTarget.style.borderColor='rgba(251,191,36,0.4)'}}
              >
                🏆 Donatur
              </a>
              <button className="fav-header-btn" onClick={openFavModal} style={{height:'32px', display:'inline-flex', alignItems:'center', boxSizing:'border-box'}}>
                <i className="fa-solid fa-heart"/> Favorit {favWords.length>0&&<span className="fav-hb-count on">{favWords.length}</span>}
              </button>
            </div>
          </div>
        </div>
        <a href="https://whatsapp.com/channel/0029Vb7dTNqGk1FzeHcvEs2N" target="_blank" rel="noopener" className="wa-banner"
          style={{marginBottom:'10px'}}
          onPointerDown={e=>{
            const banner=e.currentTarget
            const old=banner.querySelector('.wa-sheen')
            if(old)old.remove()
            const sheen=document.createElement('span')
            sheen.className='wa-sheen'
            banner.appendChild(sheen)
            sheen.addEventListener('animationend',()=>sheen.remove())
          }}>
          <div className="wa-banner-icon"><i className="fa-brands fa-whatsapp"/></div>
          <div className="wa-banner-text">
            <span className="wa-banner-title">Follow saluran WhatsApp</span>
            <span className="wa-banner-sub">Dapatkan info update website ini 🔔</span>
          </div>
          <div className="wa-banner-arrow"><span className="material-icons-round" style={{fontSize:'15px',color:'#25D366'}}>open_in_new</span></div>
        </a>
        <div className="mode">
          <button className={mode==='awal'?'active':''} onClick={()=>switchMode('awal')}>Awalan</button>
          <button className={mode==='akhir'?'active':''} onClick={()=>switchMode('akhir')}>Akhiran</button>
          <button className={mode==='kepit'?'active':''} onClick={()=>switchMode('kepit')}>Awal+Akhir</button>
        </div>
        {mode!=='kepit'?(
          <div className="input-wrap-single">
            <div className="input-wrap">
              <input ref={inputHurufRef} type="text" maxLength="5" placeholder={dbReady?"ketik 1–5 huruf":"memuat..."} onChange={cari} onInput={(e)=>{if(e.target.value.length>5)e.target.value=e.target.value.slice(0,5)}}/>
              {(mode==='awal'?lastInputAwalMode:lastInputAkhirMode)&&(
                <button className="input-clear visible" onClick={()=>{
                  if(inputHurufRef.current)inputHurufRef.current.value=''
                  if(mode==='awal')setLastInputAwalMode('');else setLastInputAkhirMode('')
                  setHasil([])
                }} title="Hapus">✕</button>
              )}
            </div>
          </div>
        ):(
          <div className="input-dual on">
            <div className="input-wrap">
              <input ref={inputAwalRef} type="text" maxLength="5" placeholder={dbReady?"Awalan":"..."} onChange={cariKepit} onInput={(e)=>{if(e.target.value.length>5)e.target.value=e.target.value.slice(0,5)}}/>
              {lastInputAwal&&<button className="input-clear visible" onClick={()=>{if(inputAwalRef.current){inputAwalRef.current.value='';setLastInputAwal('');cariKepit()}}} title="Hapus">✕</button>}
            </div>
            <span className="input-sep">···</span>
            <div className="input-wrap">
              <input ref={inputAkhirRef} type="text" maxLength="5" placeholder={dbReady?"Akhiran":"..."} onChange={cariKepit} onInput={(e)=>{if(e.target.value.length>5)e.target.value=e.target.value.slice(0,5)}}/>
              {lastInputAkhir&&<button className="input-clear visible" onClick={()=>{if(inputAkhirRef.current){inputAkhirRef.current.value='';setLastInputAkhir('');cariKepit()}}} title="Hapus">✕</button>}
            </div>
          </div>
        )}
      </div>

      <div className="loading-bar-wrap" style={{display:dbReady?'none':''}}>
        <div className="loading-bar indeterminate"/>
      </div>

      <div className={`trending-wrap${!hasSearch&&dbReady&&mode!=='kepit'?' visible':''}`}>
        <div className="trending-inner">
          <div className="trending-label">🔥 Populer</div>
          <div className="trending-chips">
            {(mode==='awal'?trendAwal:mode==='akhir'?trendAkhir:[]).map((item,i)=>{
              const q=typeof item==='object'?item.q:item
              const hot=typeof item==='object'?!!item.hot:false
              return <div key={i} className={`trend-chip${hot?' hot':''}`} onClick={()=>{if(mode==='kepit'){if(inputAwalRef.current)inputAwalRef.current.value=q.slice(0,5);cariKepit()}else{if(inputHurufRef.current)inputHurufRef.current.value=q.slice(0,5);cari()}}}>{q.toUpperCase()}{hot&&' 🔥'}</div>
            })}
          </div>
        </div>
      </div>

      {mode==='akhir'&&hasSearch&&vis.length>0&&(()=>{
        const letterPage={}
        for(let i=0;i<vis.length;i++){
          const l=vis[i][0].toLowerCase()
          if(!(l in letterPage))letterPage[l]=Math.ceil((i+1)/PAGE_SIZE)
        }
        const letters='abcdefghijklmnopqrstuvwxyz'.split('').filter(l=>l in letterPage)
        return (
          <div className="alpha-jump visible">
            {letters.map(l=>(
              <button key={l} className="jump-btn" onClick={()=>{
                const pg=letterPage[l]
                setCurrentPage(pg)
                resultRef.current?.scrollTo(0,0)
                requestAnimationFrame(()=>{
                  const headers=resultRef.current?.querySelectorAll('.alpha-header-row')
                  if(!headers)return
                  for(const h of headers){
                    if(h.querySelector('.alpha-badge')?.textContent.toLowerCase()===l){
                      h.scrollIntoView({block:'start',behavior:'smooth'});break
                    }
                  }
                })
              }}>{l.toUpperCase()}</button>
            ))}
          </div>
        )
      })()}

      {hasSearch&&vis.length>0&&(
        <div className="result-toolbar visible">
          <span className="toolbar-count">{vis.length.toLocaleString()+(mode==='kepit'?' kata':'')+' ditemukan'}</span>
          <button className="toolbar-copy" onClick={()=>{navigator.clipboard.writeText(vis.join('\n'))}}>
            <span className="material-icons-round" style={{fontSize:'14px'}}>content_copy</span> Salin Semua
          </button>
        </div>
      )}

      <div className="result" ref={resultRef}>
        {!dbReady
          ?<div className="empty"><span className="material-icons-round">hourglass_empty</span>sedang memuat kata...</div>
          :!hasSearch
            ?<div className="empty"><span className="material-icons-round">keyboard</span>mulai ketik huruf</div>
            :vis.length===0
              ?<div className="empty"><span className="material-icons-round">search_off</span>tidak ditemukan</div>
              :mode==='awal'?renderAwal():mode==='akhir'?renderAkhir():renderKepit()
        }
      </div>

      {hiddenWords.size>0&&(
        <div className="fab-hidden" onClick={openSheet}>
          <div className="fab-icon">⊘</div>
          <div className="fab-count on">{hiddenWords.size}</div>
        </div>
      )}

      {showPagination&&(
        <div className="pg-bar on">
          <button className={`pg-btn${currentPage<=1?' dim':''}`} onClick={()=>{setCurrentPage(1);resultRef.current?.scrollTo(0,0)}} title="Pertama">«</button>
          <button className={`pg-btn${currentPage<=1?' dim':''}`} onClick={()=>{setCurrentPage(p=>Math.max(1,p-1));resultRef.current?.scrollTo(0,0)}}>‹</button>
          <div className="pg-divider"/>
          <div className="pg-info"><b>{currentPage}</b> / {totalPages}</div>
          <div className="pg-divider"/>
          <button className={`pg-btn${currentPage>=totalPages?' dim':''}`} onClick={()=>{setCurrentPage(p=>Math.min(totalPages,p+1));resultRef.current?.scrollTo(0,0)}}>›</button>
          <button className={`pg-btn${currentPage>=totalPages?' dim':''}`} onClick={()=>{setCurrentPage(totalPages);resultRef.current?.scrollTo(0,0)}} title="Terakhir">»</button>
        </div>
      )}

      {showSheet&&(
        <>
          <div className={`sheet-overlay${sheetVisible?' on':''}`} onClick={closeSheet}/>
          <div className={`sheet${sheetVisible?' on':''}`}>
            <div className="sheet-handle"/>
            <div className="sheet-head">
              <span className="sheet-title">Kata Tersembunyi ({hiddenWords.size})</span>
              {hiddenWords.size>0&&<button className="sheet-clear" onClick={clearAllHidden}>Tampilkan Semua</button>}
            </div>
            <div className="sheet-body">
              {hiddenWords.size===0
                ?<div className="sheet-empty">Belum ada kata yang disembunyikan</div>
                :[...hiddenWords].sort().map(w=>(
                  <div key={w} className="sheet-row">
                    <span className="sheet-word">{w}</span>
                    <button className="sheet-restore" onClick={()=>toggleHide(w)} title="Tampilkan">+</button>
                  </div>
                ))
              }
            </div>
          </div>
        </>
      )}

      {showFavModal&&(
        <div className={`fav-modal${favModalVisible?' on':''}`}>
          <div className="fav-modal-topbar">
            <button className="fav-modal-back" onClick={closeFavModal}><i className="fa-solid fa-chevron-left"/></button>
            <span className="fav-modal-title"><i className="fa-solid fa-heart" style={{color:'var(--green)'}}/> Kata Favorit</span>
            <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
              {favWords.length>0&&(
                <button
                  onClick={copyAllFav}
                  style={{
                    fontSize:'11px',fontWeight:700,
                    borderRadius:'6px',padding:'5px 11px',
                    cursor:'pointer',
                    transition:'background 0.12s,border-color 0.12s',
                    whiteSpace:'nowrap',
                    fontFamily:"'Plus Jakarta Sans',sans-serif",
                    background: favCopied ? 'rgba(74,222,128,0.1)' : 'rgba(249,115,22,0.08)',
                    border: favCopied ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(249,115,22,0.2)',
                    color: favCopied ? '#4ade80' : 'var(--green)',
                  }}
                >
                  {favCopied ? (   <>✓ Tersalin!</> ) : (   <><span className="material-icons-round" style={{fontSize:'13px',verticalAlign:'middle',marginRight:'4px'}}>content_copy</span>Salin Semua</> )}
                </button>
              )}
              {favWords.length>0&&<button className="fav-modal-clear" onClick={clearAllFav}><span className="material-icons-round" style={{fontSize:'13px',verticalAlign:'middle',marginRight:'4px'}}>delete</span>Hapus Semua</button>}
            </div>
          </div>
          <div className="fav-modal-body">
            {favWords.length===0
              ?<div className="fav-modal-empty"><span className="fav-empty-icon">♡</span>Belum ada kata favorit.</div>
              :<>
                <div className="fav-jump-bar">
                  {[...new Set(favWords.map(f=>f.word[0].toUpperCase()))].sort().map(l=>(
                    <button key={l} className="fav-jump-chip" onClick={()=>{const el=document.querySelector(`[data-fav-grp="${l}"]`);if(el)el.scrollIntoView({block:'start',behavior:'smooth'})}}>{l}</button>
                  ))}
                </div>
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
              </>
            }
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
    </>
  )
}
